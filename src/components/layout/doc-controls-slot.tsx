'use client'

/**
 * DocControlsSlot — lets document pages inject their controls into the TopNav.
 *
 * Pages call setDocControls() on mount (and on every relevant state change)
 * and clearDocControls() on unmount. TopNav reads the context and renders
 * the controls on the right side of the desktop nav bar.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

export type DocType = 'resume' | 'cover-letter' | 'interview-guide' | 'negotiation-guide'

export interface DocControlsState {
  workflowId: string
  activeDoc: DocType
  companyName: string
  appStatus: string
  isDirty: boolean
  docLocked: boolean
  onSave: () => void
  onToggleLock: () => void
  onStatusChange: (val: string) => void
  onDelete: () => void          // caller is responsible for the confirm modal
}

interface ContextValue {
  controls: DocControlsState | null
  setDocControls: (c: DocControlsState) => void
  clearDocControls: () => void
}

const DocControlsContext = createContext<ContextValue>({
  controls: null,
  setDocControls: () => {},
  clearDocControls: () => {},
})

export function DocControlsProvider({ children }: { children: ReactNode }) {
  const [controls, setControlsState] = useState<DocControlsState | null>(null)
  const setDocControls = useCallback((c: DocControlsState) => setControlsState(c), [])
  const clearDocControls = useCallback(() => setControlsState(null), [])

  return (
    <DocControlsContext value={{ controls, setDocControls, clearDocControls }}>
      {children}
    </DocControlsContext>
  )
}

export function useDocControls() {
  return useContext(DocControlsContext)
}
