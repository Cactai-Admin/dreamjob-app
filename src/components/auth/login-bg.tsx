'use client'

import { useEffect, useRef } from 'react'

// ── Canvas port of the original TweenMax starfield ────────────────────────────
// Matches the original exactly:
//   - 200 dots, hsla(i*1.8, 50%, 50%) colors, size 2–30 px
//   - box-shadow glow via ctx.shadowBlur
//   - z: random(-1000,-200) → 500 over 3 s (8.33 units/frame at 60 fps)
//   - opacity 0→1 as z travels from start to 500
//   - perspectiveOrigin parallax = vanishing-point shift in projection math
//
// Canvas keeps it all in one GPU texture so the login column never flashes.

const TOTAL = 200
const FOV   = 200                     // perspective: 200px
const SPEED = 1500 / 6               // 1500 z-units / 6 s — per second, frame-rate independent
const Z_END = 500                     // same end point as original

const PARALLAX_STRENGTH = 1.0

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

interface Dot {
  x: number; y: number; z: number
  zStart: number; size: number; hue: number
}

export function LoginBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return

    const w  = window.innerWidth
    const h  = window.innerHeight
    const cx = w / 2
    const cy = h / 2

    canvas.width  = w
    canvas.height = h

    // Vanishing point — starts at center, eases toward cursor
    let vx = cx, vy = cy
    let tvx = cx, tvy = cy

    // Build dots and stagger their initial z so all depths are full on frame 1
    const dots: Dot[] = Array.from({ length: TOTAL }, (_, i) => {
      const zStart = rand(-1000, -200)
      const range  = Z_END - zStart
      return {
        x:      rand(0, w),
        y:      rand(0, h),
        z:      zStart + range * (i / TOTAL),   // staggered like delay: i * -.015
        zStart,
        size:   rand(2, 30),
        hue:    i * 1.8,
      }
    })

    let animId = 0
    let lastTime = 0

    function draw(now: number) {
      const dt = lastTime === 0 ? 1 / 60 : Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      // Ease vanishing point toward target (frame-rate independent at ~60 fps feel)
      const ease = 1 - Math.pow(1 - 0.06, dt * 60)
      vx += (tvx - vx) * ease
      vy += (tvy - vy) * ease

      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)

      for (const dot of dots) {
        dot.z += SPEED * dt

        // Reset — same as TweenMax repeat: -1
        if (dot.z >= Z_END) {
          dot.z = dot.zStart
          dot.x = rand(0, w)
          dot.y = rand(0, h)
          continue
        }

        // Skip dots past the eye (would produce negative/infinite scale)
        if (dot.z >= FOV) continue

        const scale = FOV / (FOV - dot.z)

        // Project from vanishing point (perspectiveOrigin equivalent)
        const px = (dot.x - vx) * scale + vx
        const py = (dot.y - vy) * scale + vy

        // Cull off-screen
        if (px < -w || px > 2 * w || py < -h || py > 2 * h) continue

        // Opacity 0→1 over the journey, matching TweenMax fromTo opacity
        const alpha = Math.min(1, (dot.z - dot.zStart) / (Z_END - dot.zStart))

        const r     = Math.max(0.3, (dot.size / 2) * scale)
        const color = `hsla(${dot.hue}, 50%, 50%, ${alpha})`

        // Glow — larger blur when far (small scale) for fog feel, tightens as dot approaches
        ctx.shadowBlur  = Math.min(dot.size / Math.max(scale, 0.15), 80)
        ctx.shadowColor = color

        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      }

      // Reset shadow so it doesn't bleed into the next fillRect
      ctx.shadowBlur = 0

      animId = requestAnimationFrame(draw as FrameRequestCallback)
    }

    animId = requestAnimationFrame(draw as FrameRequestCallback)

    // ── Mouse / touch — moves the vanishing point (perspectiveOrigin equiv) ──
    function setVanish(x: number, y: number) {
      tvx = cx + (x - cx) * PARALLAX_STRENGTH
      tvy = cy + (y - cy) * PARALLAX_STRENGTH
    }

    function handleMouse(e: MouseEvent) { setVanish(e.clientX, e.clientY) }

    const GAMMA_RANGE = 25, BETA_RANGE = 25
    let orientationAttached = false

    function handleOrientation(e: DeviceOrientationEvent) {
      const gamma = Math.min(Math.max(e.gamma ?? 0, -GAMMA_RANGE), GAMMA_RANGE)
      const beta  = Math.min(Math.max(e.beta  ?? 0, -BETA_RANGE),  BETA_RANGE)
      setVanish(
        ((gamma + GAMMA_RANGE) / (GAMMA_RANGE * 2)) * w,
        ((beta  + BETA_RANGE)  / (BETA_RANGE  * 2)) * h,
      )
    }

    function handleTouch(e: TouchEvent) {
      setVanish(e.touches[0].clientX, e.touches[0].clientY)
    }

    function attachOrientation() {
      if (orientationAttached) return
      orientationAttached = true
      window.addEventListener('deviceorientation', handleOrientation)
    }

    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }

    if (typeof DeviceOrientationEvent !== 'undefined') {
      if (typeof DOE.requestPermission === 'function') {
        // iOS: must call requestPermission() synchronously from a user gesture.
        // Use .then() (not async/await) to keep the call in the gesture stack.
        // Re-attempt on each touch until granted so tapping any element works.
        const requestOnTouch = () => {
          if (orientationAttached) return
          DOE.requestPermission!()
            .then(result => { if (result === 'granted') attachOrientation() })
            .catch(() => { /* denied or unavailable */ })
        }
        window.addEventListener('touchstart', requestOnTouch, { passive: true })
      } else {
        // Android / non-gated browsers — attach immediately
        attachOrientation()
      }
    }

    window.addEventListener('mousemove',  handleMouse)
    window.addEventListener('touchstart', handleTouch, { passive: true })
    window.addEventListener('touchmove',  handleTouch, { passive: true })

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove',         handleMouse)
      window.removeEventListener('touchstart',        handleTouch)
      window.removeEventListener('touchmove',         handleTouch)
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position:      'fixed',
        inset:         0,
        background:    '#000',
        zIndex:        0,
        pointerEvents: 'none',
        display:       'block',
      }}
    />
  )
}
