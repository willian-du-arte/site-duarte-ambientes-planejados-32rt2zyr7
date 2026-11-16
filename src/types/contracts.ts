// Tipos do Bloco 2 da Etapa 2: contratos e agenda/tarefas.
// Espelham o schema real de `contracts` e `agenda_events` (migração 0008).
import type { ActivityLogRecord, ClientRecord, ProjectRecord } from './erp'
import type { SupplierRecord } from './inventory'

// ---------- Contratos ----------
export type ContractStatus = 'ativo' | 'encerrado' | 'cancelado'

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  ativo: 'Ativo',
  encerrado: 'Encerrado',
  cancelado: 'Cancelado',
}

export interface ContractRecord {
  id: string
  title: string
  description?: string
  value?: number
  contract_date?: string
  deadline?: string
  payment_terms?: string
  documents?: string
  notes?: string
  status?: ContractStatus
  client?: string
  project: string
  created: string
  updated: string
  expand?: { client?: ClientRecord; project?: ProjectRecord }
}

export interface ContractFormValues {
  title: string
  description: string
  value: string
  contract_date: string
  deadline: string
  payment_terms: string
  status: ContractStatus
  documents: string
  notes: string
  client: string
  project: string
}

export const emptyContractForm: ContractFormValues = {
  title: '',
  description: '',
  value: '',
  contract_date: '',
  deadline: '',
  payment_terms: '',
  status: 'ativo',
  documents: '',
  notes: '',
  client: '',
  project: '',
}

// ---------- Agenda / tarefas ----------
export type AgendaKind =
  | 'reuniao'
  | 'visita_tecnica'
  | 'medicao'
  | 'entrega'
  | 'instalacao'
  | 'pagamento'
  | 'compra'
  | 'prazo'

export const AGENDA_KIND_LABELS: Record<AgendaKind, string> = {
  reuniao: 'Reunião',
  visita_tecnica: 'Visita técnica',
  medicao: 'Medição',
  entrega: 'Entrega',
  instalacao: 'Instalação',
  pagamento: 'Pagamento',
  compra: 'Compra',
  prazo: 'Prazo',
}

export const AGENDA_KINDS = Object.keys(AGENDA_KIND_LABELS) as AgendaKind[]

export type { ActivityLogRecord }

export interface AgendaEventRecord {
  id: string
  title: string
  kind: AgendaKind
  event_date: string
  time?: string
  notes?: string
  done?: boolean
  done_at?: string
  client?: string
  project?: string
  supplier?: string
  created: string
  updated: string
  expand?: {
    client?: ClientRecord
    project?: ProjectRecord
    supplier?: SupplierRecord
  }
}

export interface AgendaEventFormValues {
  title: string
  kind: AgendaKind
  event_date: string
  time: string
  notes: string
  client: string
  project: string
  supplier: string
}

export const emptyAgendaEventForm: AgendaEventFormValues = {
  title: '',
  kind: 'reuniao',
  event_date: '',
  time: '',
  notes: '',
  client: '',
  project: '',
  supplier: '',
}
