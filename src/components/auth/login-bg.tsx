'use client'

import { useEffect, useRef } from 'react'

// ── Canvas starfield with streak rendering ────────────────────────────────────
// Each dot draws a line from its previous projected position to its current
// one, giving the classic 3-D warp-tunnel look. One canvas = one GPU layer,
// so the login column never flashes.
//
// Mouse/tilt moves the vanishing point — dots radiate toward the cursor.

const TOTAL   = 200
const FOV     = 260  // perspective (higher = less extreme zoom)
const Z_MIN   = -1200
const Z_NEAR  = FOV - 4
const SPEED   = 2    // z units per frame — slow and cinematic

const PARALLAX_STRENGTH = 0.3

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

    // Vanishing point (smoothed)
    let vx = cx, vy = cy
    let tvx = cx, tvy = cy

    // Stagger initial z across full depth so all layers populate on frame 1
    const dots: Dot[] = Array.from({ length: TOTAL }, (_, i) => {
      const zStart = rand(Z_MIN, -80)
      const range  = Z_NEAR - zStart
      return {
        x:      rand(0, w),
        y:      rand(0, h),
        z:      zStart + range * (i / TOTAL),
        zStart,
        size:   rand(1, 6),
        hue:    i * 1.8,
      }
    })

    let animId = 0

    function project(dot: Dot, z: number, vpx: number, vpy: number) {
      const scale = FOV / (FOV - z)
      return {
        px: (dot.x - vpx) * scale + vpx,
        py: (dot.y - vpy) * scale + vpy,
        scale,
      }
    }

    function draw() {
      // Ease vanishing point toward target
      vx += (tvx - vx) * 0.05
      vy += (tvy - vy) * 0.05

      // Fade trail — semi-transparent black fill instead of clearRect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
      ctx.fillRect(0, 0, w, h)

      for (const dot of dots) {
        const prevZ = dot.z
        dot.z += SPEED

        if (dot.z >= Z_NEAR) {
          dot.z = dot.zStart
          dot.x = rand(0, w)
          dot.y = rand(0, h)
          continue
        }

        const cur  = project(dot, dot.z, vx, vy)
        const prev = project(dot, prevZ,  vx, vy)

        if (cur.scale <= 0) continue
        if (cur.px < -w || cur.px > 2 * w || cur.py < -h || cur.py > 2 * h) continue

        const progress = (dot.z - dot.zStart) / (Z_NEAR - dot.zStart)
        const alpha    = Math.min(1, progress * 1.8)
        const width    = Math.max(0.3, dot.size * cur.scale * 0.07)

        // Draw streak from previous projected position to current
        ctx.beginPath()
        ctx.moveTo(prev.px, prev.py)
        ctx.lineTo(cur.px,  cur.py)
        ctx.strokeStyle = `hsla(${dot.hue}, 70%, 65%, ${alpha})`
        ctx.lineWidth   = width
        ctx.lineCap     = 'round'
        ctx.stroke()

        // Bright point at the leading tip
        ctx.beginPath()
        ctx.arc(cur.px, cur.py, width * 0.8, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${dot.hue}, 80%, 80%, ${alpha})`
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    // ── Vanishing-point input handlers ────────────────────────────────────────
    function setVanish(x: number, y: number) {
      tvx = cx + (x - cx) * PARALLAX_STRENGTH
      tvy = cy + (y - cy) * PARALLAX_STRENGTH
    }

    function handleMouse(e: MouseEvent) { setVanish(e.clientX, e.clientY) }

    let orientationActive = false
    const GAMMA_RANGE = 35
    const BETA_RANGE  = 35

    function handleOrientation(e: DeviceOrientationEvent) {
      const gamma = Math.min(Math.max(e.gamma ?? 0, -GAMMA_RANGE), GAMMA_RANGE)
      const beta  = Math.min(Math.max(e.beta  ?? 0, -BETA_RANGE),  BETA_RANGE)
      setVanish(
        ((gamma + GAMMA_RANGE) / (GAMMA_RANGE * 2)) * w,
        ((beta  + BETA_RANGE)  / (BETA_RANGE  * 2)) * h,
      )
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
