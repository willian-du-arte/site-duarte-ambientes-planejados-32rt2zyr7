// Módulo PÓS-VENDA E GARANTIA (Etapa 5): chamados de clientes, alertas de
// garantia (vencendo/vencida), retornos agendados e satisfação (nota 1–5).
// Projeta sobre o banco real: projects (entrega), clients, after_sales_tickets.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ErpEmptyState, ErpPageHeader, ErpStatCard } from './ErpShared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { listClients, listProjects } from '@/services/erp'
import type { ClientRecord, ProjectRecord } from '@/types/erp'
import {
  deleteAfterSalesTicket,
  listAfterSalesTickets,
  setAfterSalesStatus,
} from '@/services/aftersales'
import type { AfterSalesStatus, AfterSalesTicketRecord } from '@/types/aftersales'
import { AFTER_SALES_STATUS_LABELS } from '@/types/aftersales'
import {
  computeAfterSalesAlerts,
  computeAfterSalesStats,
  warrantyEndOf,
  warrantyStateOf,
  type AfterSalesAlert,
} from '@/lib/erp-aftersales'
import useRealtime from '@/hooks/use-realtime'
import { AfterSalesTicketDialog } from './aftersales/AfterSalesTicketDialog'

const STATUS_TONE: Record<AfterSalesStatus, string> = {
  aberto: 'border-red-400/40 bg-red-400/10 text-red-300',
  em_atendimento: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  agendado: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  resolvido: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
}

const ALERT_TONE: Record<AfterSalesAlert['kind'], string> = {
  warranty_expiring: 'border-amber-400/40 bg-amber-400/5 text-amber-200',
  warranty_expired: 'border-red-400/40 bg-red-400/5 text-red-200',
  ticket_old: 'border-orange-400/40 bg-orange-400/5 text-orange-200',
  return_soon: 'border-sky-400/40 bg-sky-400/5 text-sky-200',
}

export default function ErpAfterSales() {
  const { toast } = useToast()
  const [tickets, setTickets] = useState<AfterSalesTicketRecord[]>([])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AfterSalesTicketRecord | null>(null)
  const [deleting, setDeleting] = useState<AfterSalesTicketRecord | null>(null)

  const reload = useCallback(async () => {
    try {
      const [t, c, p] = await Promise.all([listAfterSalesTickets(), listClients(), listProjects()])
      setTickets(t)
      setClients(c)
      setProjects(p)
    } catch {
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar o pós-venda.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void reload()
  }, [reload])

  useRealtime('after_sales_tickets', () => void reload())

  const alerts = useMemo(() => computeAfterSalesAlerts(tickets, projects), [tickets, projects])
  const stats = useMemo(() => {
    const delivered = projects.filter((p) => p.delivered_at)
    const active = delivered.filter((p) => warrantyStateOf(warrantyEndOf(p)) === 'vigente').length
    const expiring = delivered.filter(
      (p) => warrantyStateOf(warrantyEndOf(p)) === 'vencendo',
    ).length
    const expired = delivered.filter((p) => warrantyStateOf(warrantyEndOf(p)) === 'vencida').length
    return computeAfterSalesStats(tickets, active, expiring, expired)
  }, [tickets, projects])

  const visible = useMemo(
    () => (statusFilter === 'todos' ? tickets : tickets.filter((t) => t.status === statusFilter)),
    [tickets, statusFilter],
  )

  const clientOptions = useMemo(() => clients.map((c) => ({ id: c.id, name: c.name })), [clients])
  const projectOptions = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id,
        title: p.title,
        client: p.client,
        delivered_at: p.delivered_at,
      })),
    [projects],
  )

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteAfterSalesTicket(deleting.id, deleting.description)
      toast({ title: 'Chamado excluído' })
      setDeleting(null)
      void reload()
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const handleQuickStatus = async (ticket: AfterSalesTicketRecord, status: AfterSalesStatus) => {
    try {
      await setAfterSalesStatus(ticket.id, status)
      toast({ title: `Status: ${AFTER_SALES_STATUS_LABELS[status]}` })
      void reload()
    } catch {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-zinc-400">Carregando pós-venda…</div>
  }

  return (
    <div>
      <ErpPageHeader
        title="Pós-venda e garantia"
        subtitle="Chamados de clientes, garantias por data de entrega, retornos agendados e satisfação."
      />

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={cn('rounded-md border px-3 py-2 text-sm', ALERT_TONE[a.kind])}
            >
              <p className="font-medium">{a.title}</p>
              <p className="text-xs opacity-80">{a.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* Indicadores */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ErpStatCard
          label="Chamados abertos"
          value={String(stats.open)}
          tone={stats.open > 0 ? 'negative' : 'positive'}
        />
        <ErpStatCard label="Agendados" value={String(stats.scheduled)} />
        <ErpStatCard label="Resolvidos" value={String(stats.resolved)} tone="positive" />
        <ErpStatCard
          label="Satisfação média"
          value={stats.avgRating ? `${stats.avgRating.toFixed(1)} ★` : '—'}
          hint="Notas registradas nas resoluções"
        />
        <ErpStatCard
          label="Garantias"
          value={`${stats.warrantiesActive} ativas`}
          hint={`${stats.warrantiesExpiring} vencendo · ${stats.warrantiesExpired} vencidas`}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {(Object.keys(AFTER_SALES_STATUS_LABELS) as AfterSalesStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {AFTER_SALES_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          + Novo chamado
        </Button>
      </div>

      {visible.length === 0 ? (
        <ErpEmptyState
          title="Nenhum chamado"
          description="Registre aqui solicitações de clientes após a entrega: ajustes, retornos e manutenções."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((t) => {
            const end = warrantyEndOf(t.expand?.project)
            const wState = warrantyStateOf(end)
            return (
              <div
                key={t.id}
                className="rounded-lg border border-white/10 bg-white/[0.02] p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={STATUS_TONE[t.status]}>
                        {AFTER_SALES_STATUS_LABELS[t.status]}
                      </Badge>
                      {wState && (
                        <Badge
                          variant="outline"
                          className={cn(
                            wState === 'vigente' && 'border-emerald-400/30 text-emerald-300',
                            wState === 'vencendo' && 'border-amber-400/40 text-amber-300',
                            wState === 'vencida' && 'border-red-400/40 text-red-300',
                          )}
                        >
                          {wState === 'vencida' ? 'Garantia vencida' : `Garantia ${wState}`}
                          {end ? ` · ${formatDate(end)}` : ''}
                        </Badge>
                      )}
                      {typeof t.rating === 'number' && t.rating > 0 && (
                        <Badge variant="outline" className="border-amber-300/40 text-amber-200">
                          {t.rating} ★
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-zinc-100">{t.description}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Cliente: {t.expand?.client?.name ?? '—'} · Projeto:{' '}
                      {t.expand?.project?.title ?? 'sem projeto'} · registrado{' '}
                      {formatDate(t.opened_at)}
                      {t.expand?.project?.delivered_at
                        ? ` · entrega ${formatDate(t.expand.project.delivered_at)}`
                        : ''}
                    </p>
                    {(t.scheduled_for || t.maintenance_date) && (
                      <p className="mt-1 text-xs text-zinc-400">
                        {t.scheduled_for &&
                          `Retorno: ${formatDate(t.scheduled_for)}${t.scheduled_time ? ` ${t.scheduled_time}` : ''}`}
                        {t.scheduled_for && t.maintenance_date && ' · '}
                        {t.maintenance_date && `Manutenção: ${formatDate(t.maintenance_date)}`}
                      </p>
                    )}
                    {t.maintenance_notes && (
                      <p className="mt-1 text-xs text-zinc-400">
                        Manutenção: {t.maintenance_notes}
                      </p>
                    )}
                    {t.maintenance_cost != null && t.maintenance_cost > 0 && (
                      <p className="mt-1 text-xs text-zinc-400">
                        Custo da manutenção: {formatCurrency(t.maintenance_cost)}
                      </p>
                    )}
                    {t.resolution_notes && (
                      <p className="mt-1 text-xs text-emerald-300/80">
                        Resolução: {t.resolution_notes}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <Select
                      value={t.status}
                      onValueChange={(v) => void handleQuickStatus(t, v as AfterSalesStatus)}
                    >
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(AFTER_SALES_STATUS_LABELS) as AfterSalesStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {AFTER_SALES_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(t)
                          setDialogOpen(true)
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-400/40 text-red-300 hover:bg-red-400/10"
                        onClick={() => setDeleting(t)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AfterSalesTicketDialog
        open={dialogOpen}
        ticket={editing}
        clients={clientOptions}
        projects={projectOptions}
        onClose={() => {
          setDialogOpen(false)
          setEditing(null)
        }}
        onSaved={() => void reload()}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O chamado "{deleting?.description.slice(0, 80)}" será
              removido do histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
