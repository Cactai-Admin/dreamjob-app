export interface CompletionSignalInput {
  hasGeneratedContent: boolean
  hasManualSave: boolean
  hasAutosave: boolean
  isNavigatingAway: boolean
}

export function isCoverLetterComplete(input: CompletionSignalInput): boolean {
  return input.isNavigatingAway && (input.hasGeneratedContent || input.hasManualSave || input.hasAutosave)
}

export function getSaveButtonLabel(state: 'idle' | 'saving' | 'saved'): string {
  if (state === 'saving') return 'Saving...'
  if (state === 'saved') return 'Saved'
  return 'Save'
}
