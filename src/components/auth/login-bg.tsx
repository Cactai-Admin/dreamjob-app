'use client'

import { useEffect, useRef } from 'react'

const TOTAL   = 200
const MAX_DEG = 8   // max tilt in degrees for mouse/tilt parallax

function random(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export function LoginBg() {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    const w  = window.innerWidth
    const h  = window.innerHeight
    const cx = w / 2
    const cy = h / 2
    const dots: HTMLDivElement[] = []
    const anims: Animation[]     = []

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
      `
      wrap.appendChild(dot)
      dots.push(dot)

      const anim = dot.animate(
        [
          { opacity: 0, transform: `translate3d(${x}px, ${y}px, ${zStart}px)` },
          { opacity: 1, transform: `translate3d(${x}px, ${y}px, 500px)` },
        ],
        {
          duration:   3000,
          iterations: Infinity,
          delay:      i * -15,
          easing:     'linear',
        }
      )
      anims.push(anim)
    }

    // ── Parallax via transform (compositor-only — zero repaints) ────────────
    // rotateX/Y on a will-change:transform element is handled entirely by the
    // GPU compositor. Unlike perspectiveOrigin, it never triggers a repaint.
    function setTilt(x: number, y: number) {
      const rx = ((y - cy) / cy) * -MAX_DEG
      const ry = ((x - cx) / cx) *  MAX_DEG
      if (wrap) wrap.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`
    }

    // ── Desktop: mouse ───────────────────────────────────────────────────────
    function handleMouse(e: MouseEvent) {
      setTilt(e.clientX, e.clientY)
    }

    // ── Mobile: device orientation (tilt) ───────────────────────────────────
    let orientationActive = false

    function handleOrientation(e: DeviceOrientationEvent) {
      const gamma = e.gamma ?? 0
      const beta  = Math.min(Math.max(e.beta ?? 0, -90), 90)
      const x = ((gamma + 90) / 180) * window.innerWidth
      const y = ((beta  + 90) / 180) * window.innerHeight
      setTilt(x, y)
      orientationActive = true
    }

    // Touch fallback — only used when orientation hasn't fired yet
    function handleTouch(e: TouchEvent) {
      if (orientationActive) return
      setTilt(e.touches[0].clientX, e.touches[0].clientY)
    }

    function attachOrientation() {
      window.addEventListener('deviceorientation', handleOrientation)
    }

    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }

    if (typeof DeviceOrientationEvent !== 'undefined') {
      if (typeof DOE.requestPermission === 'function') {
        const requestOnTouch = async () => {
          try {
            const result = await DOE.requestPermission!()
            if (result === 'granted') attachOrientation()
          } catch { /* denied or unavailable */ }
        }
        window.addEventListener('touchstart', requestOnTouch, { once: true, passive: true })
      } else {
        attachOrientation()
      }
    }

    window.addEventListener('mousemove',  handleMouse)
    window.addEventListener('touchstart', handleTouch, { passive: true })
    window.addEventListener('touchmove',  handleTouch, { passive: true })

    return () => {
      window.removeEventListener('mousemove',         handleMouse)
      window.removeEventListener('touchstart',        handleTouch)
      window.removeEventListener('touchmove',         handleTouch)
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
        position:       'fixed',
        inset:          0,
        background:     '#000',
        overflow:       'hidden',
        perspective:    '200px',
        transformStyle: 'preserve-3d',
        zIndex:         0,
        pointerEvents:  'none',
        willChange:     'transform',
      }}
    />
  )
}
