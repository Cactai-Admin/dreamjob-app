'use client'

import { useEffect, useRef } from 'react'

const TOTAL = 200

function random(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export function LoginBg() {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    const w = window.innerWidth
    const h = window.innerHeight
    const dots: HTMLDivElement[] = []
    const anims: Animation[] = []

    for (let i = 0; i < TOTAL; i++) {
      const x      = random(0, w)
      const y      = random(0, h)
      const zStart = random(-1000, -200)
      const color  = `hsla(${i * 1.8}, 50%, 50%, 1)`
      const size   = random(2, 30)

      const dot = document.createElement('div')
      dot.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        box-shadow: 0 0 ${size}px ${color};
      `
      wrap.appendChild(dot)
      dots.push(dot)

      const anim = dot.animate(
        [
          { opacity: 0, transform: `translate3d(${x}px, ${y}px, ${zStart}px)` },
          { opacity: 1, transform: `translate3d(${x}px, ${y}px, 500px)` },
        ],
        {
          duration: 3000,
          iterations: Infinity,
          delay: i * -15,
          easing: 'linear',
        }
      )
      anims.push(anim)
    }

    // ── Mouse / touch parallax ─────────────────────────────────────────────
    function setPerspective(x: number, y: number) {
      if (wrap) wrap.style.perspectiveOrigin = `${x}px ${y}px`
    }

    function handleMouse(e: MouseEvent) {
      setPerspective(e.clientX, e.clientY)
    }

    function handleTouch(e: TouchEvent) {
      setPerspective(e.touches[0].clientX, e.touches[0].clientY)
    }

    // ── Device orientation parallax (mobile tilt) ──────────────────────────
    let orientationActive = false

    function handleOrientation(e: DeviceOrientationEvent) {
      if (!orientationActive) return
      // gamma: left-right tilt (-90…90), beta: front-back tilt (-180…180)
      const gamma = e.gamma ?? 0
      const beta  = Math.min(Math.max(e.beta ?? 0, -90), 90)
      const x = ((gamma + 90) / 180) * window.innerWidth
      const y = ((beta  + 90) / 180) * window.innerHeight
      setPerspective(x, y)
    }

    async function requestOrientationPermission() {
      // iOS 13+ requires explicit permission
      const DOE = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }
      if (typeof DOE.requestPermission === 'function') {
        try {
          const result = await DOE.requestPermission()
          if (result === 'granted') {
            orientationActive = true
            window.addEventListener('deviceorientation', handleOrientation)
          }
        } catch { /* permission denied or not available */ }
      } else if (typeof DeviceOrientationEvent !== 'undefined') {
        // Android / non-gated browsers — just attach
        orientationActive = true
        window.addEventListener('deviceorientation', handleOrientation)
      }
    }

    // Request on first touch (user gesture required for iOS)
    let orientationRequested = false
    function onFirstTouch() {
      if (orientationRequested) return
      orientationRequested = true
      requestOrientationPermission()
    }

    window.addEventListener('mousemove',  handleMouse)
    window.addEventListener('touchstart', handleTouch,   { passive: true })
    window.addEventListener('touchmove',  handleTouch,   { passive: true })
    window.addEventListener('touchstart', onFirstTouch,  { passive: true, once: true })

    return () => {
      window.removeEventListener('mousemove',       handleMouse)
      window.removeEventListener('touchstart',      handleTouch)
      window.removeEventListener('touchmove',       handleTouch)
      window.removeEventListener('deviceorientation', handleOrientation)
      anims.forEach(a => a.cancel())
      dots.forEach(d => d.remove())
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position:        'fixed',
        inset:           0,
        background:      '#000',
        overflow:        'hidden',
        perspective:     '200px',
        transformStyle:  'preserve-3d',
        zIndex:          0,
        willChange:      'perspective-origin',
      }}
    />
  )
}
