// Camada de acesso a dados do PÓS-VENDA (after_sales_tickets) sobre PocketBase.
// Toda escrita grava registro no activity_log, como nos demais módulos.
import pb from '@/lib/pocketbase/client'
import { ErpValidationError, extractFieldErrors } from '@/lib/pocketbase/errors'

import type { AfterSalesTicketFormValues, AfterSalesTicketRecord } from '@/types/aftersales'

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

async function log(entity_id: string, action: string, description: string): Promise<void> {
  try {
    await pb.collection('activity_log').create({
      entity: 'after_sales_tickets',
      entity_id,
      action,
      description,
      user_email: userEmail(),
    })
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

function payload(form: AfterSalesTicketFormValues) {
  return {
    description: form.description.trim(),
    status: form.status,
    opened_at: form.opened_at,
    scheduled_for: opt(form.scheduled_for),
    scheduled_time: opt(form.scheduled_time),
    maintenance_date: opt(form.maintenance_date),
    maintenance_notes: opt(form.maintenance_notes),
    maintenance_cost: form.maintenance_cost ? num(form.maintenance_cost) : undefined,
    rating: form.rating ? num(form.rating) : undefined,
    resolution_notes: opt(form.resolution_notes),
    client: form.client || undefined,
    project: form.project,
  }
}

const EXPAND = 'client,project'

export async function listAfterSalesTickets(): Promise<AfterSalesTicketRecord[]> {
  return pb
    .collection('after_sales_tickets')
    .getFullList<AfterSalesTicketRecord>({ sort: '-opened_at', expand: EXPAND })
}

export async function createAfterSalesTicket(
  form: AfterSalesTicketFormValues,
): Promise<AfterSalesTicketRecord> {
  try {
    const rec = await pb
      .collection('after_sales_tickets')
      .create<AfterSalesTicketRecord>(payload(form))
    await log(rec.id, 'criado', `Chamado de pós-venda criado: "${rec.description.slice(0, 80)}"`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function updateAfterSalesTicket(
  id: string,
  form: AfterSalesTicketFormValues,
): Promise<AfterSalesTicketRecord> {
  try {
    const rec = await pb
      .collection('after_sales_tickets')
      .update<AfterSalesTicketRecord>(id, payload(form))
    await log(id, 'atualizado', `Chamado de pós-venda atualizado (status: ${rec.status})`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

/** Mudança rápida de status (kanban de atendimento / botões da tabela). */
export async function setAfterSalesStatus(
  id: string,
  status: AfterSalesTicketRecord['status'],
): Promise<AfterSalesTicketRecord> {
  const rec = await pb
    .collection('after_sales_tickets')
    .update<AfterSalesTicketRecord>(id, { status })
  await log(id, 'status', `Chamado de pós-venda → ${status}`)
  return rec
}

export async function deleteAfterSalesTicket(id: string, description: string): Promise<void> {
  await pb.collection('after_sales_tickets').delete(id)
  await log(id, 'excluído', `Chamado de pós-venda excluído: "${description.slice(0, 80)}"`)
}

// ---------- Garantia ----------

/** Meses de garantia de um projeto: lê o campo warranty do orçamento vinculado (padrão 90 dias ≈ 3 meses). */
export const DEFAULT_WARRANTY_MONTHS = 3

export function warrantyEnd(deliveredAt: string | undefined, months: number): string | null {
  if (!deliveredAt) return null
  const base = new Date(deliveredAt.length > 10 ? deliveredAt : deliveredAt + 'T12:00:00')
  if (Number.isNaN(base.getTime())) return null
  base.setMonth(base.getMonth() + months)
  return base.toISOString().slice(0, 10)
}

/** Status da garantia: 'vigente' | 'vencendo' (≤30 dias) | 'vencida' | null (sem entrega). */
export function warrantyStatus(
  endISO: string | null,
  today = new Date().toISOString().slice(0, 10),
): 'vigente' | 'vencendo' | 'vencida' | null {
  if (!endISO) return null
  if (endISO < today) return 'vencida'
  const limit = new Date()
  limit.setDate(limit.getDate() + 30)
  const limitISO = limit.toISOString().slice(0, 10)
  return endISO <= limitISO ? 'vencendo' : 'vigente'
}
