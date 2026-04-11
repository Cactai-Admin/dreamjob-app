'use client'

/**
 * MobileNavSlot — lets any page inject content into the mobile top bar.
 * The slot renders between the DreamJob brand and the user avatar on mobile.
 * Pages set content on mount and clear it on unmount via useMobileNavSlot().
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

interface MobileNavSlotContextValue {
  slot: ReactNode
  setSlot: (content: ReactNode) => void
  clearSlot: () => void
}

const MobileNavSlotContext = createContext<MobileNavSlotContextValue>({
  slot: null,
  setSlot: () => {},
  clearSlot: () => {},
})

export function MobileNavSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlotState] = useState<ReactNode>(null)

  const setSlot = useCallback((content: ReactNode) => setSlotState(content), [])
  const clearSlot = useCallback(() => setSlotState(null), [])

  return (
    <MobileNavSlotContext value={{ slot, setSlot, clearSlot }}>
      {children}
    </MobileNavSlotContext>
  )
}

export function useMobileNavSlot() {
  return useContext(MobileNavSlotContext)
}
