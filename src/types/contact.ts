export type ContactStatus = 'novo' | 'atendido' | 'orcamento_enviado' | 'convertido'

export interface ContactRecord {
  id: string
  name: string
  contact_info: string
  need: string
  status: ContactStatus
  notes?: string
  converted_client?: string
  created: string
  updated: string
}

export interface CreateContactDTO {
  name: string
  contact_info: string
  need: string
  notes?: string
}
