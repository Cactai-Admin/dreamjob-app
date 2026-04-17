export type DeleteScope = 'listing' | 'workflow' | 'output'
export type DeleteMode = 'soft_delete' | 'purge'

export interface DeleteActionRequest {
  scope: DeleteScope
  mode: DeleteMode
  ids: string[]
}

export function validateDeleteAction(request: DeleteActionRequest): string[] {
  const errors: string[] = []
  if (!request.ids.length) errors.push('At least one id is required')
  if (request.mode === 'purge' && request.scope === 'workflow') {
    errors.push('Workflow purge should only be available from Trash')
  }
  return errors
}
