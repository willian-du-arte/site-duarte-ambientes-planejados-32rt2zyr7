// Cálculos do módulo PÓS-VENDA (Etapa 5): garantias, alertas e métricas.
// Datas em ISO (yyyy-mm-dd) — comparações lexicográficas, padrão do projeto.
import type { AfterSalesTicketRecord } from '@/types/aftersales'

export const WARRANTY_MONTHS = 3 // garantia padrão de 90 dias
export const OPEN_TICKET_ALERT_DAYS = 15 // chamado aberto há mais de X dias
export const SCHEDULED_SOON_DAYS = 7 // retornos agendados nos próximos X dias

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso.length > 10 ? iso : iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function addMonthsISO(iso: string, months: number): string {
  const d = new Date(iso.length > 10 ? iso : iso + 'T12:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

/** Fim da garantia de um projeto entregue (null se não entregue). */
export function warrantyEndOf(
  project: { delivered_at?: string } | undefined,
  months = WARRANTY_MONTHS,
): string | null {
  const delivered = project?.delivered_at
  if (!delivered) return null
  return addMonthsISO(delivered, months)
}

export type WarrantyState = 'vigente' | 'vencendo' | 'vencida'

export function warrantyStateOf(endISO: string | null, today = todayISO()): WarrantyState | null {
  if (!endISO) return null
  if (endISO < today) return 'vencida'
  if (endISO <= addDaysISO(today, 30)) return 'vencendo'
  return 'vigente'
}

export interface AfterSalesAlert {
  id: string
  kind: 'warranty_expiring' | 'warranty_expired' | 'ticket_old' | 'return_soon'
  title: string
  detail: string
  ticketId?: string
}

export interface AfterSalesStats {
  open: number
  scheduled: number
  resolved: number
  avgRating: number | null
  warrantiesActive: number
  warrantiesExpiring: number
  warrantiesExpired: number
}

export function computeAfterSalesStats(
  tickets: AfterSalesTicketRecord[],
  activeWarranties: number,
  expiringWarranties: number,
  expiredWarranties: number,
): AfterSalesStats {
  const open = tickets.filter((t) => t.status === 'aberto').length
  const scheduled = tickets.filter((t) => t.status === 'agendado').length
  const resolved = tickets.filter((t) => t.status === 'resolvido').length
  const rated = tickets.filter((t) => typeof t.rating === 'number' && t.rating > 0)
  const avgRating =
    rated.length > 0 ? rated.reduce((a, t) => a + (t.rating ?? 0), 0) / rated.length : null
  return {
    open,
    scheduled,
    resolved,
    avgRating,
    warrantiesActive: activeWarranties,
    warrantiesExpiring: expiringWarranties,
    warrantiesExpired: expiredWarranties,
  }
}

/**
 * Alertas do painel de pós-venda:
 * - garantia vencendo (≤30 dias) e vencida, por projeto entregue;
 * - chamados abertos/em atendimento há mais de OPEN_TICKET_ALERT_DAYS;
 * - retornos agendados para os próximos SCHEDULED_SOON_DAYS.
 */
export function computeAfterSalesAlerts(
  tickets: AfterSalesTicketRecord[],
  projects: Array<{
    id: string
    title: string
    delivered_at?: string
    expand?: { client?: { name?: string } }
  }>,
  today = todayISO(),
): AfterSalesAlert[] {
  const alerts: AfterSalesAlert[] = []
  const soonLimit = addDaysISO(today, SCHEDULED_SOON_DAYS)

  for (const p of projects) {
    if (!p.delivered_at) continue
    const end = warrantyEndOf(p)
    const state = warrantyStateOf(end, today)
    if (state === 'vencendo') {
      alerts.push({
        id: `w-expiring-${p.id}`,
        kind: 'warranty_expiring',
        title: `Garantia vencendo: ${p.title}`,
        detail: `Vence em ${end} (cliente ${p.expand?.client?.name ?? '—'}). Oportunidade de contato proativo.`,
      })
    } else if (state === 'vencida') {
      alerts.push({
        id: `w-expired-${p.id}`,
        kind: 'warranty_expired',
        title: `Garantia vencida: ${p.title}`,
        detail: `Venceu em ${end} (cliente ${p.expand?.client?.name ?? '—'}). Fora da garantia — possível novo serviço pago.`,
      })
    }
  }

  for (const t of tickets) {
    const clientName = t.expand?.client?.name ?? t.expand?.project?.title ?? '—'
    if (t.status === 'aberto' || t.status === 'em_atendimento') {
      const days = Math.floor((Date.parse(today) - Date.parse(t.opened_at)) / 86400000)
      if (days > OPEN_TICKET_ALERT_DAYS) {
        alerts.push({
          id: `t-old-${t.id}`,
          kind: 'ticket_old',
          title: `Chamado parado há ${days} dias`,
          detail: `"${t.description.slice(0, 60)}" — ${clientName}. Status: ${t.status.replace('_', ' ')}.`,
          ticketId: t.id,
        })
      }
    }
    if (t.scheduled_for && t.scheduled_for >= today && t.scheduled_for <= soonLimit) {
      alerts.push({
        id: `t-soon-${t.id}`,
        kind: 'return_soon',
        title: `Retorno agendado: ${t.scheduled_for}`,
        detail: `${clientName} — "${t.description.slice(0, 60)}".`,
        ticketId: t.id,
      })
    }
  }

  return alerts
}
