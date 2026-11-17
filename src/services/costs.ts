// Camada de acesso a dados dos CUSTOS DE PROJETO (cost_items, migração 0009).
// Espelha o padrão dos outros services (throwPbError + activity_log).
import pb from '@/lib/pocketbase/client'
import { ErpValidationError, extractFieldErrors } from '@/lib/pocketbase/errors'
import type { CostItemFormValues, CostItemRecord } from '@/types/costs'

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
  entityId: string,
  action: string,
  description: string,
): Promise<void> {
  try {
    await pb.collection('activity_log').create({
      entity,
      entity_id: entityId,
      action,
      description,
      user_email: userEmail(),
    })
  } catch {
    // log é best-effort
  }
}

const num = (v: string | number | undefined | null): number => {
  if (v === '' || v === undefined || v === null) return 0
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isNaN(n) ? 0 : n
}

const opt = (v: string): string | undefined => (v.trim() === '' ? undefined : v.trim())

function costPayload(form: CostItemFormValues) {
  return {
    description: form.description.trim(),
    category: form.category || 'outros',
    amount: num(form.amount),
    date: form.date || undefined,
    notes: opt(form.notes),
    project: form.project,
  }
}

export async function listCostItems(projectId?: string): Promise<CostItemRecord[]> {
  return pb.collection('cost_items').getFullList<CostItemRecord>({
    filter: projectId ? `project = "${projectId}"` : '',
    sort: '-created',
    expand: 'project',
  })
}

export async function createCostItem(form: CostItemFormValues): Promise<CostItemRecord> {
  try {
    const rec = await pb.collection('cost_items').create<CostItemRecord>(costPayload(form))
    await log(
      'cost_items',
      rec.id,
      'criado',
      `Custo "${rec.description}" (${rec.category}) lançado no projeto`,
    )
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function updateCostItem(
  id: string,
  form: CostItemFormValues,
): Promise<CostItemRecord> {
  try {
    const rec = await pb.collection('cost_items').update<CostItemRecord>(id, costPayload(form))
    await log('cost_items', id, 'editado', `Custo "${rec.description}" editado`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function deleteCostItem(id: string, description: string): Promise<void> {
  await pb.collection('cost_items').delete(id)
  await log('cost_items', id, 'excluído', `Custo "${description}" excluído`)
}
