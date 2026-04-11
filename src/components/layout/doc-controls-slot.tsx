'use client'

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
  onSave: () => void
  onStatusChange: (val: string) => void
  onDelete: () => void
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
