'use client'

/**
 * PrivacyScreen
 *
 * - Reads activation timeout from dreamjob_settings.privacyScreenTimeout (ms)
 *   and reacts live when the settings page saves a new value
 * - Auto-activates after the configured idle period (default 5 min)
 * - Manual trigger via usePrivacyScreen().activate() or Cmd/Ctrl+Shift+L
 * - Mouse and device-orientation tilt shift the 3-D perspective
 * - Click anywhere to dissolve (700 ms fade-out)
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

const DEFAULT_INACTIVITY_MS = 5 * 60 * 1000
const LS_KEY = 'dreamjob_settings'

function readTimeout(): number {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
    return typeof stored.privacyScreenTimeout === 'number'
      ? stored.privacyScreenTimeout
      : DEFAULT_INACTIVITY_MS
  } catch {
    return DEFAULT_INACTIVITY_MS
  }
}

interface PrivacyScreenContextValue {
  activate: () => void
}

const PrivacyScreenContext = createContext<PrivacyScreenContextValue>({
  activate: () => {},
})

export function usePrivacyScreen() {
  return useContext(PrivacyScreenContext)
}

export function PrivacyScreenProvider({ children }: { children: ReactNode }) {
  const [inactivityMs, setInactivityMs] = useState(DEFAULT_INACTIVITY_MS)
  const [visible,      setVisible]      = useState(false)
  const [dissolving,   setDissolving]   = useState(false)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visibleRef = useRef(false)

  useEffect(() => { visibleRef.current = visible }, [visible])

  // Read timeout from localStorage on mount and on settings changes
  useEffect(() => {
    setInactivityMs(readTimeout())

    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) setInactivityMs(readTimeout())
    }
    // Same-tab saves won't fire StorageEvent, so also listen for a custom event
    const onSettingsSaved = () => setInactivityMs(readTimeout())

    window.addEventListener('storage', onStorage)
    window.addEventListener('dreamjob:settings-saved', onSettingsSaved)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('dreamjob:settings-saved', onSettingsSaved)
    }
  }, [])

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
      timerRef.current = setTimeout(activate, inactivityMs)
    }, 700)
  }, [activate, inactivityMs])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(activate, inactivityMs)
  }, [activate, inactivityMs])

  // Inactivity detection
  useEffect(() => {
    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const
    const onActivity = () => { if (!visibleRef.current) resetTimer() }

    EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    resetTimer()

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
        visibleRef.current ? dismiss() : activate()
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
          <div
            style={{
              position:      'absolute',
              bottom:        40,
              left:          '50%',
              transform:     'translateX(-50%)',
              color:         'rgba(255,255,255,0.25)',
              fontSize:      12,
              letterSpacing: '0.08em',
              fontWeight:    500,
              pointerEvents: 'none',
              userSelect:    'none',
              whiteSpace:    'nowrap',
            }}
          >
            Click anywhere to unlock
          </div>
        </div>
      )}
    </PrivacyScreenContext>
  )
}
