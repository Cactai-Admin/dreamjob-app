'use client'

/**
 * PrivacyScreen
 *
 * - Auto-activates after `inactivityMs` of no user interaction (default 5 min)
 * - Can be manually triggered via `usePrivacyScreen().activate()`
 * - Mouse movement shifts the 3-D perspective of the starfield (same as login)
 * - Click anywhere → starfield dissolves and screen unlocks
 * - Keyboard shortcut: Cmd/Ctrl + Shift + L
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { LoginBg } from '@/components/auth/login-bg'

const DEFAULT_INACTIVITY_MS = 5 * 60 * 1000 // 5 minutes

interface PrivacyScreenContextValue {
  activate: () => void
}

const PrivacyScreenContext = createContext<PrivacyScreenContextValue>({
  activate: () => {},
})

export function usePrivacyScreen() {
  return useContext(PrivacyScreenContext)
}

export function PrivacyScreenProvider({
  children,
  inactivityMs = DEFAULT_INACTIVITY_MS,
}: {
  children: ReactNode
  inactivityMs?: number
}) {
  const [visible,    setVisible]    = useState(false)
  const [dissolving, setDissolving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visibleRef = useRef(false) // stable ref for event handlers

  // Keep ref in sync
  useEffect(() => { visibleRef.current = visible }, [visible])

  const activate = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setDissolving(false)
    setVisible(true)
  }, [])

  const dismiss = useCallback(() => {
    setDissolving(true)
    setTimeout(() => {
      setVisible(false)
      setDissolving(false)
      // Restart inactivity timer after unlock
      timerRef.current = setTimeout(activate, inactivityMs)
    }, 700)
  }, [activate, inactivityMs])

  // Inactivity timer — resets on any user activity while unlocked
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(activate, inactivityMs)
  }, [activate, inactivityMs])

  useEffect(() => {
    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const

    const onActivity = () => {
      if (!visibleRef.current) resetTimer()
    }

    EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    resetTimer() // start timer on mount

    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, onActivity))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer])

  // Keyboard shortcut: Cmd/Ctrl + Shift + L
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault()
        if (visibleRef.current) dismiss()
        else activate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activate, dismiss])

  return (
    <PrivacyScreenContext value={{ activate }}>
      {children}

      {visible && (
        <div
          onClick={dismiss}
          style={{
            position:   'fixed',
            inset:      0,
            zIndex:     9998,
            cursor:     'pointer',
            opacity:    dissolving ? 0 : 1,
            transition: dissolving
              ? 'opacity 700ms cubic-bezier(0.4, 0, 1, 1)'
              : 'opacity 400ms ease',
          }}
          aria-label="Privacy screen — click to unlock"
        >
          <LoginBg />

          {/* Subtle "click to unlock" hint */}
          <div
            style={{
              position:       'absolute',
              bottom:         40,
              left:           '50%',
              transform:      'translateX(-50%)',
              color:          'rgba(255,255,255,0.25)',
              fontSize:       12,
              letterSpacing:  '0.08em',
              fontWeight:     500,
              pointerEvents:  'none',
              userSelect:     'none',
              whiteSpace:     'nowrap',
            }}
          >
            Click anywhere to unlock
          </div>
        </div>
      )}
    </PrivacyScreenContext>
  )
}
