import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/** Erro de validação de formulário do ERP, com mensagem por campo. */
export class ErpValidationError extends Error {
  fields: Record<string, string>
  constructor(fields: Record<string, string>) {
    super('Validação')
    this.name = 'ErpValidationError'
    this.fields = fields
  }
}

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'Erro inesperado. Tente novamente.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'Erro inesperado. Tente novamente.'
}
