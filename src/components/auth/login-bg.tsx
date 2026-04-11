'use client'

import { useEffect, useRef } from 'react'

// ── Canvas-based starfield ────────────────────────────────────────────────────
// All 200 dots are drawn into a single <canvas> element via requestAnimationFrame.
// One canvas = one GPU texture = one compositor layer.
// This eliminates the layer-thrashing caused by 200 individually promoted DOM
// elements, which was the root cause of the login column flashing.
//
// The parallax tilt is applied as a CSS transform on the canvas element itself
// (perspective() rotateX/Y) — compositor-only, zero repaints.

const TOTAL   = 200
const MAX_DEG = 8    // max tilt degrees
const FOV     = 200  // perspective distance for dot projection (px)
const Z_MIN   = -1400
const Z_NEAR  = FOV - 2  // clip just before the eye

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

    // Stagger initial z so all depth layers are populated on first frame
    const dots: Dot[] = Array.from({ length: TOTAL }, (_, i) => {
      const zStart = rand(Z_MIN, -100)
      const range  = Z_NEAR - zStart
      return {
        x:      rand(0, w),
        y:      rand(0, h),
        z:      zStart + range * (i / TOTAL),
        zStart,
        size:   rand(1, 8),
        hue:    i * 1.8,
      }
    })

    let animId = 0

    function draw() {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)

      for (const dot of dots) {
        dot.z += 3

        if (dot.z >= Z_NEAR) {
          dot.z = dot.zStart
          dot.x = rand(0, w)
          dot.y = rand(0, h)
        }

        const scale = FOV / (FOV - dot.z)
        if (scale <= 0) continue

        const px = (dot.x - cx) * scale + cx
        const py = (dot.y - cy) * scale + cy

        // Cull dots that project off-screen (enormous near the eye)
        if (px < -w || px > 2 * w || py < -h || py > 2 * h) continue

        const r = Math.max(0.3, dot.size * scale * 0.06)

        // Fade in from back; fully opaque in the front half of the z range
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

    // ── Compositor-only tilt ──────────────────────────────────────────────────
    // perspective() inside transform applies to the element itself — no parent
    // element needed, no repaints triggered.
    function setTilt(x: number, y: number) {
      const rx = ((y - cy) / cy) * -MAX_DEG
      const ry = ((x - cx) / cx) *  MAX_DEG
      canvas.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`
    }

    // ── Desktop: mouse ────────────────────────────────────────────────────────
    function handleMouse(e: MouseEvent) { setTilt(e.clientX, e.clientY) }

    // ── Mobile: device orientation ────────────────────────────────────────────
    let orientationActive = false
    const ORIENTATION_SENSITIVITY = 1.6
    const GAMMA_RANGE = 35
    const BETA_RANGE  = 35

    function handleOrientation(e: DeviceOrientationEvent) {
      const gamma = Math.min(Math.max((e.gamma ?? 0) * ORIENTATION_SENSITIVITY, -GAMMA_RANGE), GAMMA_RANGE)
      const beta  = Math.min(Math.max((e.beta  ?? 0) * ORIENTATION_SENSITIVITY, -BETA_RANGE),  BETA_RANGE)
      const x = ((gamma + GAMMA_RANGE) / (GAMMA_RANGE * 2)) * w
      const y = ((beta  + BETA_RANGE)  / (BETA_RANGE  * 2)) * h
      setTilt(x, y)
      orientationActive = true
    }

    // Touch fallback — only fires when orientation hasn't been granted
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
        willChange:    'transform',
        display:       'block',
      }}
    />
  )
}
