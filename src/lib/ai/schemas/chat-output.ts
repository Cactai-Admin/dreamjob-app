export interface ChatAction {
  type: 'open_tab' | 'confirm_fact' | 'continue' | 'regenerate' | 'save_to_drive'
  label: string
  value?: string
}

export interface ChatWarning {
  code: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}

export interface StructuredChatOutput {
  message: string
  suggestions?: string[]
  actions?: ChatAction[]
  warnings?: ChatWarning[]
  facts_to_confirm?: string[]
  completion_signal?: string | null
}

export function isValidStructuredChatOutput(input: StructuredChatOutput): boolean {
  return Boolean(input.message && input.message.trim().length > 0)
}

export function coerceStructuredChatOutput(input: unknown): StructuredChatOutput {
  if (!input || typeof input !== 'object') {
    return { message: '' }
  }

  const record = input as Record<string, unknown>
  return {
    message: typeof record.message === 'string' ? record.message : '',
    suggestions: Array.isArray(record.suggestions) ? record.suggestions.filter((v): v is string => typeof v === 'string') : undefined,
    actions: Array.isArray(record.actions) ? record.actions.filter((v): v is ChatAction => !!v && typeof v === 'object' && typeof (v as Record<string, unknown>).label === 'string' && typeof (v as Record<string, unknown>).type === 'string') : undefined,
    warnings: Array.isArray(record.warnings) ? record.warnings.filter((v): v is ChatWarning => !!v && typeof v === 'object' && typeof (v as Record<string, unknown>).message === 'string') : undefined,
    facts_to_confirm: Array.isArray(record.facts_to_confirm) ? record.facts_to_confirm.filter((v): v is string => typeof v === 'string') : undefined,
    completion_signal: typeof record.completion_signal === 'string' ? record.completion_signal : null,
  }
}
