'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const TOTAL = 200

function random(min: number, max: number) {
  return (Math.random() * (max - min)) + min
}

export function LoginBg() {
  const wrapRef  = useRef<HTMLDivElement>(null)
  const dotsRef  = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    const $wrap = wrapRef.current
    const $c    = dotsRef.current
    if (!$wrap || $c.length === 0) return

    const w = window.innerWidth
    const h = window.innerHeight

    $c.forEach((c, i) => {
      const x     = random(0, w)
      const y     = random(0, h)
      const z     = random(-1000, -200)
      const color = 'hsla(' + (i * 1.8) + ', 50%, 50%, 1)'
      const size  = random(2, 30)

      gsap.set(c, {
        background:   color,
        height:       size,
        width:        size,
        borderRadius: '50%',
        boxShadow:    '0 0 ' + size + 'px ' + color,
        position:     'absolute',
        left:         0,
        top:          0,
      })

      gsap.fromTo(c,
        { opacity: 0, x, y, z },
        { opacity: 1, z: 500, repeat: -1, duration: 3, delay: i * -0.015 }
      )
    })

    function touches(e: MouseEvent | TouchEvent) {
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY

      gsap.to($wrap, {
        duration:               1,
        perspectiveOrigin:      x + 'px ' + y + 'px',
      } as gsap.TweenVars)
    }

    window.addEventListener('mousemove',  touches as EventListener)
    window.addEventListener('touchstart', touches as EventListener)
    window.addEventListener('touchmove',  touches as EventListener)

    return () => {
      gsap.killTweensOf($c)
      gsap.killTweensOf($wrap)
      window.removeEventListener('mousemove',  touches as EventListener)
      window.removeEventListener('touchstart', touches as EventListener)
      window.removeEventListener('touchmove',  touches as EventListener)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position:         'fixed',
        inset:            0,
        background:       '#000',
        zIndex:           0,
        pointerEvents:    'none',
        overflow:         'hidden',
        perspective:      '200px',
        transformStyle:   'preserve-3d',
      }}
    >
      {Array.from({ length: TOTAL }, (_, i) => (
        <div key={i} ref={el => { if (el) dotsRef.current[i] = el }} />
      ))}
    </div>
  )
}
