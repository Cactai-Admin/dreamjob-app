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
        will-change: transform, opacity;
      `
      wrap.appendChild(dot)
      dots.push(dot)

      const anim = dot.animate(
        [
          { opacity: 0, transform: `translate3d(${x}px, ${y}px, ${zStart}px)` },
          { opacity: 1, transform: `translate3d(${x}px, ${y}px, 500px)` },
        ],
        {
          duration: 3000,
          iterations: Infinity,
          delay: i * -15,   // stagger: i * -0.015s
          easing: 'linear',
        }
      )
      anims.push(anim)
    }

    function handleMove(e: MouseEvent | TouchEvent) {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      if (wrap) wrap.style.perspectiveOrigin = `${clientX}px ${clientY}px`
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('touchstart', handleMove as EventListener, { passive: true })
    window.addEventListener('touchmove',  handleMove as EventListener, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('touchstart', handleMove as EventListener)
      window.removeEventListener('touchmove',  handleMove as EventListener)
      anims.forEach(a => a.cancel())
      dots.forEach(d => d.remove())
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        overflow: 'hidden',
        perspective: '200px',
        transformStyle: 'preserve-3d',
        zIndex: 0,
      }}
    />
  )
}
