import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/** Erro de validação local do ERP (ex.: campos obrigatórios, regras de negócio). */
export class ErpValidationError extends Error {
  readonly fields: Record<string, string>

  constructor(fields: Record<string, string>, message = 'Verifique os campos destacados.') {
    super(message)
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
  if (error instanceof ErpValidationError) return error.message
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'Erro inesperado. Tente novamente.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'Erro inesperado. Tente novamente.'
}
