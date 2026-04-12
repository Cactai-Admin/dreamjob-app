'use client'

import { useEffect, useRef } from 'react'

// ── Canvas port of the original TweenMax starfield ────────────────────────────
//
// Original:
//   TweenMax.fromTo(c, 3, { opacity:0, x, y, z: random(-1000,-200) },
//                         { opacity:1, z:500, repeat:-1, delay: i*-.015 })
//   boxShadow: `0 0 ${size}px hsla(i*1.8, 50%, 50%, 1)`
//   perspectiveOrigin tracks mouse via TweenMax.to($wrap, 1, { perspectiveOrigin })
//
// Key fidelity points:
//   - Each dot has its own speed = (500 - zStart) / 3  (z-units / sec)
//   - Stagger via initial z offset  (equiv to delay: i * -.015)
//   - shadowBlur = size * scale  (CSS box-shadow is in local space → scaled by perspective)
//   - Mouse eases vanishing point over ~1s (matches TweenMax.to duration)

const TOTAL = 200
const FOV   = 200     // matches original CSS perspective: 200px
const Z_END = 500     // same end z as original
const DUR   = 3       // seconds per journey — matches TweenMax duration

const PARALLAX_STRENGTH = 1.0

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

interface Dot {
  x: number; y: number; z: number
  zStart: number; speed: number; size: number; hue: number
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

    // Vanishing point — starts centered, eases toward cursor (~1s, matches TweenMax.to)
    let vx = cx, vy = cy
    let tvx = cx, tvy = cy

    // Each dot gets its own speed so it takes exactly DUR seconds (matches TweenMax duration)
    // Stagger via initial z offset — equivalent to delay: i * -.015
    const dots: Dot[] = Array.from({ length: TOTAL }, (_, i) => {
      const zStart = rand(-1000, -200)
      const range  = Z_END - zStart
      return {
        x:      rand(0, w),
        y:      rand(0, h),
        z:      zStart + range * (i / TOTAL),
        zStart,
        speed:  range / DUR,   // z-units/sec — each dot takes exactly 3s
        size:   rand(2, 30),
        hue:    i * 1.8,
      }
    })

    let animId = 0
    let lastTime = 0

    function draw(now: number) {
      const dt = lastTime === 0 ? 1 / 60 : Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      // Exponential ease matching TweenMax.to($wrap, 1, { perspectiveOrigin })
      const ease = 1 - Math.pow(1 - 0.06, dt * 60)
      vx += (tvx - vx) * ease
      vy += (tvy - vy) * ease

      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)

      for (const dot of dots) {
        dot.z += dot.speed * dt

        // repeat: -1 — reset to start when reaching Z_END
        if (dot.z >= Z_END) {
          dot.z = dot.zStart
          dot.x = rand(0, w)
          dot.y = rand(0, h)
          continue
        }

        if (dot.z >= FOV) continue

        const scale = FOV / (FOV - dot.z)

        // perspectiveOrigin projection — vanishing point at (vx, vy)
        const px = (dot.x - vx) * scale + vx
        const py = (dot.y - vy) * scale + vy

        if (px < -w || px > 2 * w || py < -h || py > 2 * h) continue

        // opacity: 0 → 1 over the journey (matches TweenMax fromTo opacity)
        const alpha = Math.min(1, (dot.z - dot.zStart) / (Z_END - dot.zStart))

        const r     = Math.max(0.3, (dot.size / 2) * scale)
        const color = `hsla(${dot.hue}, 50%, 50%, ${alpha})`

        // box-shadow: 0 0 ${size}px color — CSS renders this in local space then
        // scales it with the perspective transform, so rendered blur = size * scale
        ctx.shadowBlur  = dot.size * scale
        ctx.shadowColor = color

        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      }

      ctx.shadowBlur = 0
      animId = requestAnimationFrame(draw as FrameRequestCallback)
    }

    animId = requestAnimationFrame(draw as FrameRequestCallback)

    // ── Mouse / touch — perspectiveOrigin equivalent ──
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
        // iOS: call requestPermission() synchronously from gesture via .then()
        const requestOnTouch = () => {
          if (orientationAttached) return
          DOE.requestPermission!()
            .then(result => { if (result === 'granted') attachOrientation() })
            .catch(() => {})
        }
        window.addEventListener('touchstart', requestOnTouch, { passive: true })
      } else {
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
