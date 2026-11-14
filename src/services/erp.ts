// Camada de acesso a dados do Duarte Gestão (ERP) sobre PocketBase.
// Toda escrita em entidades principais grava um registro em `activity_log`.
import pb from '@/lib/pocketbase/client'
import { ErpValidationError, extractFieldErrors } from '@/lib/pocketbase/errors'

import type {
  ActivityLogRecord,
  ClientFormValues,
  ClientRecord,
  ClientType,
  ClientOrigin,
  FinancialAccountRecord,
  OpportunityFormValues,
  OpportunityRecord,
  ProjectFormValues,
  ProjectRecord,
  ProjectStageRecord,
  QuoteFormValues,
  QuoteItem,
  QuoteRecord,
  QuoteStatus,
  TaskFormValues,
  TaskRecord,
} from '@/types/erp'

function throwPbError(error: unknown): never {
  if (error && typeof error === 'object' && 'response' in error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) throw new ErpValidationError(fields)
  }
  throw error
}

function userEmail(): string {
  return pb.authStore.record?.email || ''
}

async function log(
  entity: string,
  entity_id: string,
  action: string,
  description: string,
  changes?: { field: string; old_value?: string; new_value?: string }[],
): Promise<void> {
  try {
    const base = { entity, entity_id, action, description, user_email: userEmail() }
    if (changes && changes.length > 0) {
      for (const c of changes) {
        await pb.collection('activity_log').create({ ...base, ...c })
      }
    } else {
      await pb.collection('activity_log').create(base)
    }
  } catch {
    // log é best-effort; nunca bloqueia a operação principal
  }
}

const num = (v: string | number | undefined | null): number => {
  if (v === '' || v === undefined || v === null) return 0
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isNaN(n) ? 0 : n
}

const opt = (v: string): string | undefined => (v.trim() === '' ? undefined : v.trim())

// ---------- Clients ----------

function clientPayload(form: ClientFormValues) {
  return {
    name: form.name.trim(),
    document: opt(form.document),
    phone: opt(form.phone),
    whatsapp: opt(form.whatsapp),
    email: opt(form.email),
    address: opt(form.address),
    client_type: form.client_type || undefined,
    origin: form.origin || undefined,
    history: opt(form.history),
    notes: opt(form.notes),
  }
}

export async function createClient(form: ClientFormValues): Promise<ClientRecord> {
  try {
    const rec = await pb.collection('clients').create<ClientRecord>(clientPayload(form))
    await log('clients', rec.id, 'criado', `Cliente "${rec.name}" cadastrado`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function updateClient(
  id: string,
  before: ClientRecord,
  form: ClientFormValues,
): Promise<ClientRecord> {
  try {
    const rec = await pb.collection('clients').update<ClientRecord>(id, clientPayload(form))
    const changes = clientChanges(before, rec)
    await log('clients', id, 'editado', `Cliente "${rec.name}" editado`, changes)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

function clientChanges(before: ClientRecord, after: ClientRecord) {
  const map: [
    string,
    keyof Pick<
      ClientRecord,
      | 'name'
      | 'document'
      | 'phone'
      | 'whatsapp'
      | 'email'
      | 'address'
      | 'client_type'
      | 'origin'
      | 'history'
      | 'notes'
    >,
  ][] = [
    ['nome', 'name'],
    ['CPF/CNPJ', 'document'],
    ['telefone', 'phone'],
    ['WhatsApp', 'whatsapp'],
    ['e-mail', 'email'],
    ['endereço', 'address'],
    ['tipo de cliente', 'client_type'],
    ['origem', 'origin'],
    ['histórico', 'history'],
    ['observações', 'notes'],
  ]
  return map
    .filter(([, key]) => (before[key] ?? '') !== (after[key] ?? ''))
    .map(([label, key]) => ({
      field: label,
      old_value: String(before[key] ?? ''),
      new_value: String(after[key] ?? ''),
    }))
}

export async function deleteClient(id: string): Promise<void> {
  await pb.collection('clients').delete(id)
  await log('clients', id, 'excluído', `Cliente ${id} excluído`)
}

export async function listClients(): Promise<ClientRecord[]> {
  return pb.collection('clients').getFullList<ClientRecord>({ sort: 'name' })
}

export async function getClient(id: string): Promise<ClientRecord> {
  return pb.collection('clients').getOne<ClientRecord>(id)
}

export async function findClientByDocument(document: string): Promise<ClientRecord | null> {
  if (!document.trim()) return null
  const rows = await pb.collection('clients').getList<ClientRecord>(1, 1, {
    filter: `document = "${document.trim()}"`,
  })
  return rows.items[0] ?? null
}

// ---------- Opportunities (funil) ----------

function opportunityPayload(form: OpportunityFormValues, clientId: string) {
  return {
    title: form.title.trim(),
    description: opt(form.description ?? ''),
    value: num(form.value),
    stage: form.stage,
    next_action: opt(form.next_action),
    next_action_date: form.next_action_date || undefined,
    lost_reason: opt(form.lost_reason ?? ''),
    notes: opt(form.notes ?? ''),
    client: clientId,
  }
}

export async function createOpportunity(
  clientId: string,
  form: OpportunityFormValues,
): Promise<OpportunityRecord> {
  try {
    const rec = await pb
      .collection('opportunities')
      .create<OpportunityRecord>(opportunityPayload(form, clientId))
    await log('opportunities', rec.id, 'criado', `Oportunidade "${rec.title}" criada`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function updateOpportunity(
  id: string,
  before: OpportunityRecord,
  form: OpportunityFormValues,
): Promise<OpportunityRecord> {
  try {
    const rec = await pb
      .collection('opportunities')
      .update<OpportunityRecord>(id, opportunityPayload(form, before.client))
    const changes: { field: string; old_value: string; new_value: string }[] = []
    if (before.stage !== rec.stage) {
      changes.push({ field: 'etapa', old_value: before.stage, new_value: rec.stage })
    }
    if (num(before.value) !== rec.value) {
      changes.push({
        field: 'valor',
        old_value: String(before.value),
        new_value: String(rec.value),
      })
    }
    if ((before.next_action ?? '') !== (rec.next_action ?? '')) {
      changes.push({
        field: 'próxima ação',
        old_value: before.next_action ?? '',
        new_value: rec.next_action ?? '',
      })
    }
    if ((before.next_action_date ?? '') !== (rec.next_action_date ?? '')) {
      changes.push({
        field: 'data da próxima ação',
        old_value: before.next_action_date ?? '',
        new_value: rec.next_action_date ?? '',
      })
    }
    await log('opportunities', id, 'editado', `Oportunidade "${rec.title}" editada`, changes)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function moveOpportunityStage(
  id: string,
  before: OpportunityRecord,
  stage: OpportunityRecord['stage'],
): Promise<OpportunityRecord> {
  try {
    const rec = await pb.collection('opportunities').update<OpportunityRecord>(id, { stage })
    await log('opportunities', id, 'etapa alterada', `"${rec.title}": etapa movida no funil`, [
      { field: 'etapa', old_value: before.stage, new_value: stage },
    ])
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function deleteOpportunity(id: string): Promise<void> {
  await pb.collection('opportunities').delete(id)
  await log('opportunities', id, 'excluído', `Oportunidade ${id} excluída`)
}

export async function listOpportunities(): Promise<OpportunityRecord[]> {
  return pb.collection('opportunities').getFullList<OpportunityRecord>({ sort: '-created' })
}

// ---------- Quotes (orçamentos) ----------

export function quoteTotals(form: {
  items?: QuoteItem[]
  labor_cost?: string | number
  third_party_cost?: string | number
  transport_cost?: string | number
  assembly_cost?: string | number
  additional_costs?: string | number
  margin_percent?: string | number
  manual_price?: boolean
  manual_final_price?: string | number
}) {
  const itemsTotal = (form.items ?? []).reduce(
    (acc, i) => acc + num(i.quantity) * num(i.unit_cost),
    0,
  )
  const totalCost =
    itemsTotal +
    num(form.labor_cost) +
    num(form.third_party_cost) +
    num(form.transport_cost) +
    num(form.assembly_cost) +
    num(form.additional_costs)
  const margin = Math.min(Math.max(num(form.margin_percent), 0), 100)
  let finalPrice = totalCost * (1 + margin / 100)
  if (form.manual_price) {
    const manual = num(form.manual_final_price)
    if (manual > 0) finalPrice = manual
  }
  return { itemsTotal, totalCost, finalPrice: Math.round(finalPrice * 100) / 100, margin }
}

function quotePayload(form: QuoteFormValues, clientId: string, opportunityId?: string) {
  const t = quoteTotals(form)
  return {
    title: form.title.trim(),
    description: opt(form.description),
    environments: opt(form.environments),
    dimensions: opt(form.dimensions),
    materials: opt(form.materials),
    items: (form.items ?? []).filter((i) => i.description.trim() !== ''),
    labor_cost: num(form.labor_cost),
    third_party_cost: num(form.third_party_cost),
    transport_cost: num(form.transport_cost),
    assembly_cost: num(form.assembly_cost),
    additional_costs: num(form.additional_costs),
    margin_percent: t.margin,
    total_cost: t.totalCost,
    final_price: t.finalPrice,
    manual_price: form.manual_price,
    warranty: opt(form.warranty),
    payment_terms: opt(form.payment_terms),
    deadline_days: form.deadline_days ? parseInt(form.deadline_days, 10) : undefined,
    status: form.status,
    client: clientId,
    opportunity: opportunityId,
  }
}

export async function createQuote(
  clientId: string,
  opportunityId: string | undefined,
  form: QuoteFormValues,
): Promise<QuoteRecord> {
  try {
    const payload = quotePayload(form, clientId, opportunityId)
    const rec = await pb.collection('quotes').create<QuoteRecord>(payload)
    await pb.collection('quote_versions').create({
      quote: rec.id,
      version: 1,
      snapshot: payload,
      note: 'Criação do orçamento',
    })
    await log('quotes', rec.id, 'criado', `Orçamento "${rec.title}" criado (v1)`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function updateQuote(
  id: string,
  before: QuoteRecord,
  clientId: string,
  opportunityId: string | undefined,
  form: QuoteFormValues,
): Promise<QuoteRecord> {
  try {
    const payload = quotePayload(form, clientId, opportunityId)
    const version = (before.version ?? 1) + 1
    const rec = await pb.collection('quotes').update<QuoteRecord>(id, { ...payload, version })
    await pb.collection('quote_versions').create({
      quote: id,
      version,
      snapshot: payload,
      note: `Revisão v${version}`,
    })
    const changes: { field: string; old_value: string; new_value: string }[] = []
    if (before.status !== rec.status) {
      changes.push({ field: 'status', old_value: before.status, new_value: rec.status })
    }
    if ((before.final_price ?? 0) !== rec.final_price) {
      changes.push({
        field: 'preço final',
        old_value: String(before.final_price ?? 0),
        new_value: String(rec.final_price ?? 0),
      })
    }
    await log('quotes', id, 'editado', `Orçamento "${rec.title}" salvo (v${version})`, changes)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function deleteQuote(id: string): Promise<void> {
  await pb.collection('quotes').delete(id)
  await log('quotes', id, 'excluído', `Orçamento ${id} excluído`)
}

export async function listQuotes(): Promise<QuoteRecord[]> {
  return pb.collection('quotes').getFullList<QuoteRecord>({ sort: '-created' })
}

export interface QuoteVersionSummary {
  id: string
  version: number
  note?: string
  created: string
}

export async function listQuoteVersions(quoteId: string): Promise<QuoteVersionSummary[]> {
  const rows = await pb.collection('quote_versions').getFullList<{
    id: string
    version: number
    note?: string
    created: string
  }>({
    filter: `quote = "${quoteId}"`,
    sort: '-version',
  })
  return rows.map((r) => ({ id: r.id, version: r.version, note: r.note, created: r.created }))
}

// ---------- Projetos ----------

function projectPayload(form: ProjectFormValues) {
  return {
    title: form.title.trim(),
    contracted_value: num(form.contracted_value),
    status: form.status,
    expected_delivery: form.expected_delivery || undefined,
    notes: opt(form.notes),
  }
}

export async function createProject(
  clientId: string,
  form: ProjectFormValues,
): Promise<ProjectRecord> {
  try {
    const rec = await pb.collection('projects').create<ProjectRecord>(projectPayload(form))
    await log('projects', rec.id, 'criado', `Projeto "${rec.title}" criado`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function updateProject(
  id: string,
  before: ProjectRecord,
  form: ProjectFormValues,
): Promise<ProjectRecord> {
  try {
    const rec = await pb.collection('projects').update<ProjectRecord>(id, projectPayload(form))
    const changes: { field: string; old_value: string; new_value: string }[] = []
    if (before.status !== rec.status) {
      changes.push({ field: 'situação', old_value: before.status, new_value: rec.status })
    }
    if (num(before.contracted_value) !== num(rec.contracted_value)) {
      changes.push({
        field: 'valor contratado',
        old_value: String(before.contracted_value ?? 0),
        new_value: String(rec.contracted_value ?? 0),
      })
    }
    await log('projects', id, 'editado', `Projeto "${rec.title}" editado`, changes)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function deleteProject(id: string): Promise<void> {
  await pb.collection('projects').delete(id)
  await log('projects', id, 'excluído', `Projeto ${id} excluído`)
}

export async function listProjects(): Promise<ProjectRecord[]> {
  return pb.collection('projects').getFullList<ProjectRecord>({ sort: '-created' })
}

export async function listProjectStages(projectId?: string): Promise<ProjectStageRecord[]> {
  const filter = projectId ? `project = "${projectId}"` : ''
  return pb.collection('project_stages').getFullList<ProjectStageRecord>({
    filter,
    sort: 'order',
  })
}

export async function updateProjectStage(
  id: string,
  status: ProjectStageRecord['status'],
): Promise<void> {
  const patch: Record<string, unknown> = { status }
  if (status === 'concluida') patch.completed_at = new Date().toISOString()
  if (status === 'em_andamento') patch.started_at = new Date().toISOString()
  await pb.collection('project_stages').update(id, patch)
}

// ---------- Financeiro ----------

export interface AccountFormInput {
  kind: 'receber' | 'pagar'
  description: string
  amount: string
  due_date: string
  notes?: string
  client?: string
  project?: string
}

function accountPayload(form: AccountFormInput) {
  return {
    kind: form.kind,
    description: form.description.trim(),
    amount: num(form.amount),
    due_date: form.due_date,
    notes: opt(form.notes ?? ''),
    client: form.client,
    project: form.project,
  }
}

export async function createAccount(form: AccountFormInput): Promise<FinancialAccountRecord> {
  try {
    const rec = await pb
      .collection('financial_accounts')
      .create<FinancialAccountRecord>(accountPayload(form))
    await log(
      'financial_accounts',
      rec.id,
      'criado',
      `Conta a ${form.kind === 'receber' ? 'receber' : 'pagar'} "${rec.description}" criada`,
    )
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function markAccountPaid(
  id: string,
  before: FinancialAccountRecord,
  paidAmount: number,
): Promise<FinancialAccountRecord> {
  const total = before.amount ?? 0
  const newPaid = num(before.paid_amount) + paidAmount
  const fullyPaid = newPaid >= total - 0.005
  const rec = await pb.collection('financial_accounts').update<FinancialAccountRecord>(id, {
    paid_amount: newPaid,
    paid: fullyPaid,
    paid_at: fullyPaid ? new Date().toISOString() : undefined,
  })
  await log(
    'financial_accounts',
    id,
    fullyPaid ? 'quitado' : 'recebimento parcial',
    `"${rec.description}" — ${fullyPaid ? 'quitada' : 'parcial'}`,
    [
      {
        field: 'valor pago',
        old_value: String(before.paid_amount ?? 0),
        new_value: String(newPaid),
      },
    ],
  )
  return rec
}

export async function updateAccount(
  id: string,
  form: AccountFormInput,
): Promise<FinancialAccountRecord> {
  try {
    const rec = await pb
      .collection('financial_accounts')
      .update<FinancialAccountRecord>(id, accountPayload(form))
    await log('financial_accounts', id, 'editado', `Conta "${rec.description}" editada`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function deleteAccount(id: string): Promise<void> {
  await pb.collection('financial_accounts').delete(id)
  await log('financial_accounts', id, 'excluído', `Conta ${id} excluída`)
}

export async function listAccounts(): Promise<FinancialAccountRecord[]> {
  return pb
    .collection('financial_accounts')
    .getFullList<FinancialAccountRecord>({ sort: 'due_date' })
}

// ---------- Tarefas ----------

export interface TaskFormInput extends TaskFormValues {
  client?: string
  project?: string
}

export async function createTask(form: TaskFormInput): Promise<TaskRecord> {
  try {
    const rec = await pb.collection('tasks').create<TaskRecord>({
      title: form.title.trim(),
      description: opt(form.description),
      due_date: form.due_date || undefined,
      priority: form.priority,
      client: form.client,
      project: form.project,
    })
    await log('tasks', rec.id, 'criado', `Tarefa "${rec.title}" criada`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function updateTask(id: string, form: TaskFormInput): Promise<TaskRecord> {
  try {
    const rec = await pb.collection('tasks').update<TaskRecord>(id, {
      title: form.title.trim(),
      description: opt(form.description),
      due_date: form.due_date || undefined,
      priority: form.priority,
    })
    await log('tasks', id, 'editado', `Tarefa "${rec.title}" editada`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function toggleTaskDone(id: string, done: boolean): Promise<TaskRecord> {
  const patch: Record<string, unknown> = { done }
  if (done) patch.completed_at = new Date().toISOString()
  const rec = await pb.collection('tasks').update<TaskRecord>(id, patch)
  await log('tasks', id, done ? 'concluída' : 'reaberta', `Tarefa "${rec.title}"`)
  return rec
}

export async function deleteTask(id: string): Promise<void> {
  await pb.collection('tasks').delete(id)
  await log('tasks', id, 'excluído', `Tarefa ${id} excluída`)
}

export async function listTasks(): Promise<TaskRecord[]> {
  return pb.collection('tasks').getFullList<TaskRecord>({ sort: '-created' })
}

// ---------- Log de alterações ----------

export async function listActivityLog(
  entity: string,
  entityId: string,
): Promise<ActivityLogRecord[]> {
  return pb.collection('activity_log').getFullList<ActivityLogRecord>({
    filter: `entity = "${entity}" && entity_id = "${entityId}"`,
    sort: '-created',
  })
}

// ---------- Conversão de contato do site ----------

export interface ConvertContactResult {
  clientId: string
  opportunityId: string
}

export async function convertContactToClient(
  contact: { id: string; name: string; contact_info: string; need: string; notes?: string },
  origin: ClientOrigin = 'site',
  clientType: ClientType = 'pessoa_fisica',
): Promise<ConvertContactResult> {
  const name = contact.name.trim()
  if (!name) throw new Error('Contato sem nome para converter.')

  // Evita duplicar: se o contato já foi convertido, reaproveita.
  const existing = await pb.collection('contacts').getOne<{
    converted?: boolean
    converted_client?: string
    converted_opportunity?: string
  }>(contact.id)
  if (existing.converted && existing.converted_client && existing.converted_opportunity) {
    return {
      clientId: existing.converted_client,
      opportunityId: existing.converted_opportunity,
    }
  }

  const client = await pb.collection('clients').create<ClientRecord>({
    name,
    phone: contact.contact_info.trim(),
    history: `Contato recebido pelo site: ${contact.need}`,
    notes: opt(contact.notes ?? ''),
    origin,
    client_type: clientType,
  })

  const opportunity = await pb.collection('opportunities').create<OpportunityRecord>({
    title: `Interesse via site — ${name}`,
    description: contact.need,
    stage: 'novo_contato',
    value: 0,
    client: client.id,
  })

  await pb.collection('contacts').update(contact.id, {
    converted: true,
    converted_client: client.id,
    converted_opportunity: opportunity.id,
  })

  await log('clients', client.id, 'convertido', `Contato do site "${name}" convertido em cliente`)
  return { clientId: client.id, opportunityId: opportunity.id }
}
