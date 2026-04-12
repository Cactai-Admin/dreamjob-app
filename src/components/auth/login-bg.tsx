'use client'

import { useEffect, useRef } from 'react'

// Canvas port of the original TweenMax starfield:
//   TweenMax.fromTo(c, 3, { opacity:0, x, y, z: random(-1000,-200) },
//                         { opacity:1, z:500, repeat:-1, delay: i*-.015 })
//   boxShadow: `0 0 ${size}px hsla(i*1.8, 50%, 50%, 1)`
//   perspectiveOrigin tracks mouse via TweenMax.to($wrap, 1, { perspectiveOrigin })

const TOTAL = 200
const FOV   = 200   // CSS perspective: 200px
const Z_END = 500
const DUR   = 3     // seconds — matches TweenMax duration
const PARALLAX_STRENGTH = 1.0

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

interface Dot {
  x: number; y: number; z: number
  zStart: number; speed: number; size: number; hue: number
}

export function LoginBg() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const particleRefs = useRef<(HTMLDivElement | null)[]>([])
  const driftTweenRef = useRef<gsap.core.Tween | null>(null)
  const pauseTweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w  = window.innerWidth
    const h  = window.innerHeight
    const cx = w / 2
    const cy = h / 2

    canvas.width  = w
    canvas.height = h

    let vx = cx, vy = cy, tvx = cx, tvy = cy
    let lastTime = 0
    let animId   = 0

    const dots: Dot[] = Array.from({ length: TOTAL }, (_, i) => {
      const zStart = rand(-1000, -200)
      const range  = Z_END - zStart
      return {
        x:      rand(0, w),
        y:      rand(0, h),
        z:      zStart + range * (i / TOTAL),
        zStart,
        speed:  range / DUR,
        size:   rand(2, 30),
        hue:    i * 1.8,
      }
    })

    function draw() {
      const now = performance.now()
      const dt  = lastTime === 0 ? 1 / 60 : Math.min((now - lastTime) / 1000, 0.1)
      lastTime  = now

      const ease = 1 - Math.pow(1 - 0.06, dt * 60)
      vx += (tvx - vx) * ease
      vy += (tvy - vy) * ease

    const driftState = {
      x: w * 0.5,
      y: h * 0.5,
    }

      for (const dot of dots) {
        dot.z += dot.speed * dt

        if (dot.z >= Z_END) {
          dot.z = dot.zStart
          dot.x = rand(0, w)
          dot.y = rand(0, h)
        } else if (dot.z < FOV) {
          const scale = FOV / (FOV - dot.z)
          const px    = (dot.x - vx) * scale + vx
          const py    = (dot.y - vy) * scale + vy

          if (px >= -w && px <= 2 * w && py >= -h && py <= 2 * h) {
            const alpha = Math.min(1, (dot.z - dot.zStart) / (Z_END - dot.zStart))
            const r     = Math.max(0.3, (dot.size / 2) * scale)
            const color = 'hsla(' + dot.hue + ', 50%, 50%, ' + alpha + ')'

            ctx.shadowBlur  = dot.size * scale
            ctx.shadowColor = color
            ctx.beginPath()
            ctx.arc(px, py, r, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
          }
        }
      }

      ctx.shadowBlur = 0
      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    function setVanish(x: number, y: number) {
      tvx = cx + (x - cx) * PARALLAX_STRENGTH
      tvy = cy + (y - cy) * PARALLAX_STRENGTH
    }

    function handleMouse(e: MouseEvent) { setVanish(e.clientX, e.clientY) }

    function handleTouch(e: TouchEvent) {
      setVanish(e.touches[0].clientX, e.touches[0].clientY)
    }

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

    function attachOrientation() {
      if (orientationAttached) return
      orientationAttached = true
      window.addEventListener('deviceorientation', handleOrientation)
    }

      driftState.x = nextW * 0.5
      driftState.y = nextH * 0.5

    if (typeof DeviceOrientationEvent !== 'undefined') {
      if (typeof DOE.requestPermission === 'function') {
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

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      driftTweenRef.current?.kill()
      pauseTweenRef.current?.kill()
      gsap.killTweensOf(particleRefs.current)
      gsap.killTweensOf(driftState)
    }
  }, [])

  return (
    <>
      <div
        ref={wrapRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
          isolation: 'isolate',
          contain: 'layout paint style',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          background:
            'radial-gradient(circle at 50% 50%, rgba(18,26,44,0.34) 0%, rgba(6,10,20,0.74) 42%, rgba(0,0,0,0.96) 78%, rgba(0,0,0,1) 100%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '-10%',
            background:
              'radial-gradient(circle at 50% 50%, rgba(120,150,255,0.07) 0%, rgba(40,65,120,0.05) 24%, rgba(0,0,0,0) 62%)',
            filter: 'blur(42px)',
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
        >
          {particles.map((i) => (
            <div
              key={i}
              ref={(el) => {
                particleRefs.current[i] = el
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        div[aria-hidden='true'] :global(div) {
          transform-style: preserve-3d;
        }
      `}</style>
    </>
  )
}
