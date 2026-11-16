// Camada de acesso a dados do Bloco 2 da Etapa 2: contratos e agenda.
// Espelha o padrão de services/erp.ts (payloads, throwPbError e activity_log).
import pb from '@/lib/pocketbase/client'
import { ErpValidationError, extractFieldErrors } from '@/lib/pocketbase/errors'
import type {
  ActivityLogRecord,
  AgendaEventFormValues,
  AgendaEventRecord,
  ContractFormValues,
  ContractRecord,
} from '@/types/contracts'

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

// ---------- Contratos ----------

function contractPayload(form: ContractFormValues) {
  return {
    title: form.title.trim(),
    status: form.status,
    description: opt(form.description),
    value: num(form.value),
    contract_date: form.contract_date || undefined,
    deadline: form.deadline || undefined,
    payment_terms: opt(form.payment_terms),
    documents: opt(form.documents),
    notes: opt(form.notes),
    client: form.client || undefined,
    project: form.project || undefined,
  }
}

export async function createContract(form: ContractFormValues): Promise<ContractRecord> {
  try {
    const rec = await pb.collection('contracts').create<ContractRecord>(contractPayload(form))
    await log('contracts', rec.id, 'criado', `Contrato "${rec.title}" criado`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function updateContract(
  id: string,
  before: ContractRecord,
  form: ContractFormValues,
): Promise<ContractRecord> {
  try {
    const rec = await pb.collection('contracts').update<ContractRecord>(id, contractPayload(form))
    await log(
      'contracts',
      id,
      'editado',
      `Contrato "${rec.title}" editado`,
      contractChanges(before, rec),
    )
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

function contractChanges(
  before: ContractRecord,
  after: ContractRecord,
): { field: string; old_value: string; new_value: string }[] {
  const map: [string, keyof ContractRecord][] = [
    ['título', 'title'],
    ['situação', 'status'],
    ['valor', 'value'],
    ['data da contratação', 'contract_date'],
    ['prazo', 'deadline'],
    ['condições de pagamento', 'payment_terms'],
    ['documentos', 'documents'],
    ['observações', 'notes'],
  ]
  const changes = map
    .filter(([, key]) => {
      const a = before[key]
      const b = after[key]
      if (typeof a === 'number' || typeof b === 'number') return Number(a) !== Number(b)
      return String(a ?? '') !== String(b ?? '')
    })
    .map(([label, key]) => ({
      field: label,
      old_value: String(before[key] ?? ''),
      new_value: String(after[key] ?? ''),
    }))
  // Mudança de escopo (descrição dos serviços) fica explícita no histórico.
  if (String(before.description ?? '') !== String(after.description ?? '')) {
    changes.push({
      field: 'escopo (descrição dos serviços)',
      old_value: String(before.description ?? ''),
      new_value: String(after.description ?? ''),
    })
  }
  return changes
}

export async function deleteContract(id: string, title?: string): Promise<void> {
  await pb.collection('contracts').delete(id)
  await log('contracts', id, 'excluído', `Contrato "${title ?? id}" excluído`)
}

export async function listContracts(): Promise<ContractRecord[]> {
  return pb.collection('contracts').getFullList<ContractRecord>({
    sort: '-contract_date,-created',
    expand: 'client,project',
  })
}

export async function listContractsByProject(projectId: string): Promise<ContractRecord[]> {
  return pb.collection('contracts').getFullList<ContractRecord>({
    filter: `project = "${projectId}"`,
    sort: '-created',
    expand: 'client,project',
  })
}

export async function listContractHistory(entityId: string): Promise<ActivityLogRecord[]> {
  return pb.collection('activity_log').getFullList<ActivityLogRecord>({
    filter: `entity = "contracts" && entity_id = "${entityId}"`,
    sort: '-created',
  })
}

// ---------- Agenda / tarefas ----------

function agendaPayload(form: AgendaEventFormValues) {
  return {
    title: form.title.trim(),
    kind: form.kind,
    event_date: form.event_date,
    time: opt(form.time),
    notes: opt(form.notes),
    client: form.client || undefined,
    project: form.project || undefined,
    supplier: form.supplier || undefined,
  }
}

export async function createAgendaEvent(form: AgendaEventFormValues): Promise<AgendaEventRecord> {
  try {
    const rec = await pb.collection('agenda_events').create<AgendaEventRecord>(agendaPayload(form))
    await log('agenda_events', rec.id, 'criado', `Compromisso "${rec.title}" criado`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function updateAgendaEvent(
  id: string,
  form: AgendaEventFormValues,
): Promise<AgendaEventRecord> {
  try {
    const rec = await pb
      .collection('agenda_events')
      .update<AgendaEventRecord>(id, agendaPayload(form))
    await log('agenda_events', id, 'editado', `Compromisso "${rec.title}" editado`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function toggleAgendaEventDone(id: string, done: boolean): Promise<AgendaEventRecord> {
  const patch: Record<string, unknown> = { done }
  if (done) patch.done_at = new Date().toISOString()
  const rec = await pb.collection('agenda_events').update<AgendaEventRecord>(id, patch)
  await log('agenda_events', id, done ? 'concluído' : 'reaberto', `Compromisso "${rec.title}"`)
  return rec
}

export async function deleteAgendaEvent(id: string, title?: string): Promise<void> {
  await pb.collection('agenda_events').delete(id)
  await log('agenda_events', id, 'excluído', `Compromisso "${title ?? id}" excluído`)
}

export async function listAgendaEvents(): Promise<AgendaEventRecord[]> {
  return pb.collection('agenda_events').getFullList<AgendaEventRecord>({
    sort: 'event_date,time',
    expand: 'client,project,supplier',
  })
}
