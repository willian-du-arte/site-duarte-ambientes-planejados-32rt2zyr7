// Tipos e constantes do Duarte Gestão (ERP).
// Espelham o schema real das coleções PocketBase (migrações 0004–0006).

// ---------- CRM ----------
export type ClientType = 'pessoa_fisica' | 'pessoa_juridica'

export type ClientOrigin =
  | 'site'
  | 'indicacao'
  | 'instagram'
  | 'facebook'
  | 'google'
  | 'telefone'
  | 'loja'
  | 'outro'

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  pessoa_fisica: 'Pessoa física',
  pessoa_juridica: 'Pessoa jurídica',
}

export const CLIENT_ORIGIN_LABELS: Record<ClientOrigin, string> = {
  site: 'Site',
  indicacao: 'Indicação',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  telefone: 'Telefone',
  loja: 'Loja',
  outro: 'Outro',
}

export const CLIENT_ORIGINS = Object.keys(CLIENT_ORIGIN_LABELS) as ClientOrigin[]
export const CLIENT_TYPES = Object.keys(CLIENT_TYPE_LABELS) as ClientType[]

export interface ClientRecord {
  id: string
  name: string
  document?: string
  phone?: string
  whatsapp?: string
  email?: string
  address?: string
  client_type?: ClientType
  origin?: ClientOrigin
  history?: string
  notes?: string
  created: string
  updated: string
  expand?: { converted_opportunity?: OpportunityRecord }
}

export interface StageTotals {
  stage: FunnelStage
  count: number
  value: number
}

export interface ClientFormValues {
  name: string
  document: string
  phone: string
  whatsapp: string
  email: string
  address: string
  client_type: ClientType | ''
  origin: ClientOrigin | ''
  history: string
  notes: string
}

export const emptyClientForm: ClientFormValues = {
  name: '',
  document: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  client_type: '',
  origin: '',
  history: '',
  notes: '',
}

// ---------- Funil de vendas ----------
export const FUNNEL_STAGES = [
  'novo_contato',
  'atendimento',
  'levantamento_medidas',
  'desenvolvimento_projeto',
  'elaboracao_orcamento',
  'orcamento_enviado',
  'negociacao',
  'venda_fechada',
  'venda_perdida',
] as const

export type FunnelStage = (typeof FUNNEL_STAGES)[number]

export const FUNNEL_STAGE_LABELS: Record<FunnelStage, string> = {
  novo_contato: 'Novo contato',
  atendimento: 'Atendimento',
  levantamento_medidas: 'Levantamento de medidas',
  desenvolvimento_projeto: 'Desenvolvimento do projeto',
  elaboracao_orcamento: 'Elaboração de orçamento',
  orcamento_enviado: 'Orçamento enviado',
  negociacao: 'Negociação',
  venda_fechada: 'Venda fechada',
  venda_perdida: 'Venda perdida',
}

export type OpportunityRecord = {
  id: string
  title: string
  description?: string
  value?: number
  stage: FunnelStage
  next_action?: string
  next_action_date?: string
  lost_reason?: string
  notes?: string
  client: string
  created: string
  updated: string
}

export interface OpportunityFormValues {
  title: string
  description?: string
  value: string
  stage: FunnelStage
  next_action: string
  next_action_date: string
  lost_reason: string
  notes: string
}

export const emptyOpportunityForm: OpportunityFormValues = {
  title: '',
  value: '',
  stage: 'novo_contato',
  next_action: '',
  next_action_date: '',
  lost_reason: '',
  notes: '',
}

// ---------- Orçamentos ----------
export type QuoteStatus = 'rascunho' | 'enviado' | 'aprovado' | 'perdido'

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  perdido: 'Perdido',
}

export interface QuoteItem {
  description: string
  quantity: number
  unit_cost: number
}

export interface QuoteRecord {
  id: string
  title: string
  description?: string
  environments?: string
  dimensions?: string
  materials?: string
  items?: QuoteItem[] | null
  labor_cost?: number
  third_party_cost?: number
  transport_cost?: number
  assembly_cost?: number
  additional_costs?: number
  margin_percent?: number
  total_cost?: number
  final_price?: number
  manual_price?: boolean
  warranty?: string
  payment_terms?: string
  deadline_days?: number
  status: QuoteStatus
  approved_at?: string
  version?: number
  client: string
  opportunity?: string
  created: string
  updated: string
  expand?: { client?: ClientRecord }
}

export interface QuoteFormValues {
  title: string
  description: string
  environments: string
  dimensions: string
  materials: string
  labor_cost: string
  third_party_cost: string
  transport_cost: string
  assembly_cost: string
  additional_costs: string
  margin_percent: string
  manual_price: boolean
  manual_final_price: string
  warranty: string
  payment_terms: string
  deadline_days: string
  status: QuoteStatus
  items?: QuoteItem[]
}

export const emptyQuoteForm: QuoteFormValues = {
  title: '',
  description: '',
  environments: '',
  dimensions: '',
  materials: '',
  labor_cost: '',
  third_party_cost: '',
  transport_cost: '',
  assembly_cost: '',
  additional_costs: '',
  margin_percent: '',
  manual_price: false,
  manual_final_price: '',
  warranty: '',
  payment_terms: '',
  deadline_days: '',
  status: 'rascunho',
  items: [],
}

// ---------- Projetos ----------
export type ProjectStatus = 'em_andamento' | 'concluido' | 'cancelado'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

export const PRODUCTION_STAGES_KEYS = [
  'projeto_aprovado',
  'conferencia_medidas',
  'planejamento_materiais',
  'compra_materiais',
  'aguardando_materiais',
  'fabricacao',
  'acabamento',
  'preparacao_entrega',
  'transporte',
  'instalacao',
  'finalizado',
] as const

export const PRODUCTION_STAGE_LABELS: Record<(typeof PRODUCTION_STAGES_KEYS)[number], string> = {
  projeto_aprovado: 'Projeto aprovado',
  conferencia_medidas: 'Conferência de medidas',
  planejamento_materiais: 'Planejamento de materiais',
  compra_materiais: 'Compra de materiais',
  aguardando_materiais: 'Aguardando materiais',
  fabricacao: 'Fabricação',
  acabamento: 'Acabamento',
  preparacao_entrega: 'Preparação para entrega',
  transporte: 'Transporte',
  instalacao: 'Instalação',
  finalizado: 'Finalizado',
}

export interface ProjectRecord {
  id: string
  title: string
  description?: string
  contracted_value?: number
  cost_value?: number
  status: ProjectStatus
  expected_delivery?: string
  delivered_at?: string
  notes?: string
  client: string
  quote?: string
  environments?: string
  responsible?: string
  materials_needed?: string
  suppliers_involved?: string
  current_stage?: number
  created: string
  updated: string
  expand?: { client?: ClientRecord; quote?: QuoteRecord }
}

export interface ProjectFormValues {
  title: string
  contracted_value: string
  status: ProjectStatus
  expected_delivery: string
  notes: string
}

export const emptyProjectForm: ProjectFormValues = {
  title: '',
  contracted_value: '',
  status: 'em_andamento',
  expected_delivery: '',
  notes: '',
}

export interface ProjectStageRecord {
  id: string
  order?: number
  name: string
  key?: string
  status: 'pendente' | 'em_andamento' | 'concluida'
  started_at?: string
  completed_at?: string
  notes?: string
  project: string
  created: string
  updated: string
}

// ---------- Financeiro ----------
export type AccountKind = 'receber' | 'pagar'

export interface FinancialAccountRecord {
  id: string
  kind: AccountKind
  description: string
  amount?: number
  due_date: string
  paid?: boolean
  paid_at?: string
  paid_amount?: number
  installment_number?: number
  installment_total?: number
  notes?: string
  client?: string
  supplier?: string
  project?: string
  purchase?: string
  category?: string
  created: string
  updated: string
  expand?: {
    client?: ClientRecord
    project?: ProjectRecord
    supplier?: { id: string; name: string }
  }
}

export interface AccountFormValues {
  kind: AccountKind
  description: string
  amount: string
  due_date: string
  client: string
  supplier: string
  project: string
  purchase: string
  category: string
  installment_number: string
  installment_total: string
  notes: string
}

export const emptyAccountForm: AccountFormValues = {
  kind: 'receber',
  description: '',
  amount: '',
  due_date: '',
  client: '',
  supplier: '',
  project: '',
  purchase: '',
  category: '',
  installment_number: '',
  installment_total: '',
  notes: '',
}

// ---------- Tarefas ----------
export type TaskPriority = 'baixa' | 'media' | 'alta'

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

export interface TaskRecord {
  id: string
  title: string
  description?: string
  due_date?: string
  priority: TaskPriority
  done?: boolean
  completed_at?: string
  client?: string
  project?: string
  opportunity?: string
  created: string
  updated: string
  expand?: { client?: ClientRecord; project?: ProjectRecord }
}

export interface TaskFormValues {
  title: string
  description: string
  due_date: string
  priority: TaskPriority
}

export const emptyTaskForm: TaskFormValues = {
  title: '',
  description: '',
  due_date: '',
  priority: 'media',
}

// ---------- Log de alterações ----------
export interface ActivityLogRecord {
  id: string
  entity: string
  entity_id?: string
  action: string
  description?: string
  field?: string
  old_value?: string
  new_value?: string
  user_email?: string
  created: string
}

// ---------- Contatos do site ----------
export type ConvertedContact = {
  converted?: boolean
  converted_client?: string
  converted_opportunity?: string
}
