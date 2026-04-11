'use client'

import { useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'

const TOTAL = 160
const Z_MIN = -1000
const Z_MAX = -200
const Z_END = 500

function random(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export function LoginBg() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const particleRefs = useRef<(HTMLDivElement | null)[]>([])
  const driftTweenRef = useRef<gsap.core.Tween | null>(null)
  const pauseTweenRef = useRef<gsap.core.Tween | null>(null)

  const particles = useMemo(() => Array.from({ length: TOTAL }, (_, i) => i), [])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    const w = window.innerWidth
    const h = window.innerHeight

    const driftState = {
      x: w * 0.5,
      y: h * 0.5,
    }

    gsap.set(wrap, {
      perspective: 1000,
      perspectiveOrigin: `${driftState.x}px ${driftState.y}px`,
      transformStyle: 'preserve-3d',
      force3D: true,
    })

    particleRefs.current.forEach((node, i) => {
      if (!node) return

      const x = random(0, w)
      const y = random(0, h)
      const z = random(Z_MIN, Z_MAX)
      const size = random(2, 30)
      const hue = i * 1.8
      const color = `hsla(${hue}, 50%, 58%, 0.85)`

      gsap.set(node, {
        x,
        y,
        z,
        width: size,
        height: size,
        borderRadius: '50%',
        opacity: 0,
        position: 'absolute',
        top: 0,
        left: 0,
        background: `radial-gradient(circle, hsla(${hue}, 55%, 68%, 0.30) 0%, hsla(${hue}, 55%, 54%, 0.20) 28%, hsla(${hue}, 55%, 50%, 0.10) 48%, transparent 72%)`,
        boxShadow: `0 0 ${size * 0.9}px ${size * 0.22}px ${color}`,
        willChange: 'transform, opacity',
        force3D: true,
      })

      gsap.fromTo(
        node,
        {
          opacity: 0,
          x,
          y,
          z,
        },
        {
          opacity: 1,
          z: Z_END,
          duration: 3,
          repeat: -1,
          ease: 'none',
          delay: i * -0.015,
          force3D: true,
        }
      )
    })

    const setPerspectiveOrigin = () => {
      wrap.style.perspectiveOrigin = `${driftState.x}px ${driftState.y}px`
      ;(wrap.style as CSSStyleDeclaration).webkitPerspectiveOrigin =
        `${driftState.x}px ${driftState.y}px`
    }

    const scheduleNextDrift = () => {
      const currentX = driftState.x
      const currentY = driftState.y

      const bigMove = Math.random() < 0.16

      const targetX = bigMove
        ? random(w * 0.2, w * 0.8)
        : random(
            Math.max(w * 0.35, currentX - w * 0.12),
            Math.min(w * 0.65, currentX + w * 0.12)
          )

      const targetY = bigMove
        ? random(h * 0.2, h * 0.8)
        : random(
            Math.max(h * 0.35, currentY - h * 0.12),
            Math.min(h * 0.65, currentY + h * 0.12)
          )

      const duration = random(6, 18)
      const pause = random(2, 8)

      pauseTweenRef.current = gsap.delayedCall(pause, () => {
        driftTweenRef.current = gsap.to(driftState, {
          x: targetX,
          y: targetY,
          duration,
          ease: 'sine.inOut',
          onUpdate: setPerspectiveOrigin,
          onComplete: scheduleNextDrift,
        })
      })
    }

    setPerspectiveOrigin()
    scheduleNextDrift()

    const handleResize = () => {
      const nextW = window.innerWidth
      const nextH = window.innerHeight

      driftState.x = nextW * 0.5
      driftState.y = nextH * 0.5

      gsap.set(wrap, {
        perspectiveOrigin: `${driftState.x}px ${driftState.y}px`,
      })
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
