// Tipos do módulo PÓS-VENDA E GARANTIA (Etapa 5).
// Espelham a coleção after_sales_tickets (migração 0010).

export type AfterSalesStatus = 'aberto' | 'em_atendimento' | 'agendado' | 'resolvido'

export const AFTER_SALES_STATUS_LABELS: Record<AfterSalesStatus, string> = {
  aberto: 'Aberto',
  em_atendimento: 'Em atendimento',
  agendado: 'Agendado',
  resolvido: 'Resolvido',
}

export const AFTER_SALES_STATUSES = Object.keys(AFTER_SALES_STATUS_LABELS) as AfterSalesStatus[]

export interface AfterSalesTicketRecord {
  id: string
  description: string
  status: AfterSalesStatus
  opened_at: string
  scheduled_for?: string
  scheduled_time?: string
  maintenance_date?: string
  maintenance_notes?: string
  maintenance_cost?: number
  rating?: number
  resolution_notes?: string
  client?: string
  project: string
  created: string
  updated: string
  expand?: {
    client?: { id: string; name: string; phone?: string; whatsapp?: string }
    project?: {
      id: string
      title: string
      delivered_at?: string
      contracted_value?: number
      status: string
    }
  }
}

export interface AfterSalesTicketFormValues {
  client: string
  project: string
  description: string
  opened_at: string
  status: AfterSalesStatus
  scheduled_for: string
  scheduled_time: string
  maintenance_date: string
  maintenance_notes: string
  maintenance_cost: string
  rating: string
  resolution_notes: string
}

export const emptyAfterSalesForm: AfterSalesTicketFormValues = {
  client: '',
  project: '',
  description: '',
  opened_at: new Date().toISOString().slice(0, 10),
  status: 'aberto',
  scheduled_for: '',
  scheduled_time: '',
  maintenance_date: '',
  maintenance_notes: '',
  maintenance_cost: '',
  rating: '',
  resolution_notes: '',
}
