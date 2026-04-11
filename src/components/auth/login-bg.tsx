'use client'

import { useEffect, useRef } from 'react'

// ── Canvas-based starfield ────────────────────────────────────────────────────
// Single <canvas> = one GPU layer, no compositor conflicts with login column.
//
// Mouse/tilt parallax: the vanishing point (vx, vy) tracks the cursor.
// Dots radiate outward from that point — moving the mouse shifts the flow
// direction, giving the same "camera panning" feel as the original DOM version.

const TOTAL  = 200
const FOV    = 200   // perspective distance (px)
const Z_MIN  = -1000
const Z_NEAR = FOV - 5
const SPEED  = 4     // z units per frame (~3s to traverse full depth at 60fps)

// How far the vanishing point drifts toward the cursor (0 = fixed center, 1 = full cursor)
const PARALLAX_STRENGTH = 0.35

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

    // Vanishing point — starts at center, drifts toward cursor/tilt
    let vx = cx
    let vy = cy
    // Smoothed target vanishing point
    let tvx = cx
    let tvy = cy

    // Stagger initial z so all depth layers are populated immediately
    const dots: Dot[] = Array.from({ length: TOTAL }, (_, i) => {
      const zStart = rand(Z_MIN, -100)
      const range  = Z_NEAR - zStart
      return {
        x:      rand(0, w),
        y:      rand(0, h),
        z:      zStart + range * (i / TOTAL),
        zStart,
        size:   rand(2, 18),
        hue:    i * 1.8,
      }
    })

    let animId = 0

    function draw() {
      // Smoothly interpolate vanishing point toward target (ease = 0.06)
      vx += (tvx - vx) * 0.06
      vy += (tvy - vy) * 0.06

      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)

      for (const dot of dots) {
        dot.z += SPEED

        if (dot.z >= Z_NEAR) {
          dot.z = dot.zStart
          dot.x = rand(0, w)
          dot.y = rand(0, h)
        }

        const scale = FOV / (FOV - dot.z)
        if (scale <= 0) continue

        // Project from vanishing point
        const px = (dot.x - vx) * scale + vx
        const py = (dot.y - vy) * scale + vy

        if (px < -w || px > 2 * w || py < -h || py > 2 * h) continue

        const r = Math.max(0.5, dot.size * scale * 0.35)

        const progress = (dot.z - dot.zStart) / (Z_NEAR - dot.zStart)
        const alpha    = Math.min(1, progress * 2)

        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${dot.hue}, 50%, 60%, ${alpha})`
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    // ── Input handlers — update vanishing point target ────────────────────────
    function setVanish(x: number, y: number) {
      // Blend between screen center and cursor position
      tvx = cx + (x - cx) * PARALLAX_STRENGTH
      tvy = cy + (y - cy) * PARALLAX_STRENGTH
    }

    function handleMouse(e: MouseEvent) { setVanish(e.clientX, e.clientY) }

    // ── Mobile: device orientation ────────────────────────────────────────────
    let orientationActive = false
    const GAMMA_RANGE = 35
    const BETA_RANGE  = 35

    function handleOrientation(e: DeviceOrientationEvent) {
      const gamma = Math.min(Math.max(e.gamma ?? 0, -GAMMA_RANGE), GAMMA_RANGE)
      const beta  = Math.min(Math.max(e.beta  ?? 0, -BETA_RANGE),  BETA_RANGE)
      const x = ((gamma + GAMMA_RANGE) / (GAMMA_RANGE * 2)) * w
      const y = ((beta  + BETA_RANGE)  / (BETA_RANGE  * 2)) * h
      setVanish(x, y)
      orientationActive = true
    }

    function handleTouch(e: TouchEvent) {
      if (orientationActive) return
      setVanish(e.touches[0].clientX, e.touches[0].clientY)
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
