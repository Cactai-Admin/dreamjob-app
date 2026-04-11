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
          duration:   3000,
          iterations: Infinity,
          delay:      i * -15,
          easing:     'linear',
        }
      )
      anims.push(anim)
    }

    // ── Shared perspective setter ───────────────────────────────────────────
    function setPerspective(x: number, y: number) {
      if (wrap) wrap.style.perspectiveOrigin = `${x}px ${y}px`
    }

    // ── Desktop: mouse → perspective ────────────────────────────────────────
    // Skip update when the cursor is over the login column so the card's
    // compositing layer isn't invalidated by perspectiveOrigin changes.
    function handleMouse(e: MouseEvent) {
      const target = e.target as Element | null
      if (target && target.closest('.login-column')) return
      setPerspective(e.clientX, e.clientY)
    }

    // ── Mobile: device orientation (tilt) → perspective ─────────────────────
    // This is the primary parallax on mobile. Touch-position fallback is only
    // used when no gyroscope / orientation API is available.
    // ── Mobile: device orientation (tilt) → perspective ─────────────────────
    let orientationActive = false
    
    // Higher = more responsive to smaller physical movement
    const ORIENTATION_SENSITIVITY = 1.6
    
    // Smaller range = stronger effect from the same tilt
    const GAMMA_RANGE = 35 // left-right
    const BETA_RANGE = 35  // front-back
    
    function clamp(value: number, min: number, max: number) {
      return Math.min(Math.max(value, min), max)
    }
    
    function handleOrientation(e: DeviceOrientationEvent) {
      // Raw input
      const rawGamma = e.gamma ?? 0
      const rawBeta = e.beta ?? 0
    
      // Clamp to a tighter usable range, then amplify
      const gamma = clamp(rawGamma * ORIENTATION_SENSITIVITY, -GAMMA_RANGE, GAMMA_RANGE)
      const beta = clamp(rawBeta * ORIENTATION_SENSITIVITY, -BETA_RANGE, BETA_RANGE)
    
      // Map tighter tilt range to full viewport
      const x = ((gamma + GAMMA_RANGE) / (GAMMA_RANGE * 2)) * window.innerWidth
      const y = ((beta + BETA_RANGE) / (BETA_RANGE * 2)) * window.innerHeight
    
      setPerspective(x, y)
      orientationActive = true
    }

    // Touch fallback — only used when orientation hasn't fired yet
    function handleTouch(e: TouchEvent) {
      if (orientationActive) return   // tilt is in control — ignore touch position
      setPerspective(e.touches[0].clientX, e.touches[0].clientY)
    }

    function attachOrientation() {
      window.addEventListener('deviceorientation', handleOrientation)
    }

    // Attach orientation listener —————————————————————————————————————————
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }

    if (typeof DeviceOrientationEvent !== 'undefined') {
      if (typeof DOE.requestPermission === 'function') {
        // iOS 13+: must be called from a user-gesture handler
        const requestOnTouch = async () => {
          try {
            const result = await DOE.requestPermission!()
            if (result === 'granted') attachOrientation()
          } catch { /* denied or unavailable */ }
        }
        window.addEventListener('touchstart', requestOnTouch, { once: true, passive: true })
      } else {
        // Android and other non-gated browsers: attach immediately
        attachOrientation()
      }
    }

    window.addEventListener('mousemove',  handleMouse)
    window.addEventListener('touchstart', handleTouch, { passive: true })
    window.addEventListener('touchmove',  handleTouch, { passive: true })

    return () => {
      window.removeEventListener('mousemove',        handleMouse)
      window.removeEventListener('touchstart',       handleTouch)
      window.removeEventListener('touchmove',        handleTouch)
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
      }}
    />
  )
}
