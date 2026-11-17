// Tela "Produção" do Duarte Gestão (Etapa 2, bloco 4):
// Kanban de 11 etapas com drag & drop nativo (HTML5) + calendário mensal de
// prazos de projetos e compromissos da agenda. Sem dados fictícios.
// Espelha o padrão das outras telas do ERP (grafite + dourado, PT-BR, DD/MM/AAAA).
import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, KanbanSquare, CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { ErpEmptyState, ErpPageHeader, ErpStatCard } from './ErpShared'
import { ProjectDetailDrawer } from './ProductionDetail'
import {
  listProductionProjects,
  markProjectDelivered,
  moveProjectStage,
} from '@/services/production'
import { listAgendaEvents } from '@/services/contracts'
import { AGENDA_KIND_LABELS } from '@/types/contracts'
import type { AgendaEventRecord } from '@/types/contracts'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatDate, isOverdue, todayISO } from '@/lib/format'
import type { ProjectRecord, TaskRecord } from '@/types/erp'

const PRODUCTION_STAGES: { order: number; name: string }[] = [
  { order: 1, name: 'Projeto aprovado' },
  { order: 2, name: 'Conferência de medidas' },
  { order: 3, name: 'Planejamento de materiais' },
  { order: 4, name: 'Compra de materiais' },
  { order: 5, name: 'Aguardando materiais' },
  { order: 6, name: 'Fabricação' },
  { order: 7, name: 'Acabamento' },
  { order: 8, name: 'Preparação para entrega' },
  { order: 9, name: 'Transporte' },
  { order: 10, name: 'Instalação' },
  { order: 11, name: 'Finalizado' },
]

type View = 'kanban' | 'calendario'

export default function ErpProduction() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [events, setEvents] = useState<AgendaEventRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('kanban')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<number | null>(null)
  const [savingStage, setSavingStage] = useState<string | null>(null)

  const load = async () => {
    const [rows, agenda] = await Promise.all([listProductionProjects(), listAgendaEvents()])
    setProjects(rows)
    setEvents(agenda)
  }

  useEffect(() => {
    ;(async () => {
      try {
        await load()
      } catch (e) {
        toast({
          title: 'Erro ao carregar produção',
          description: getErrorMessage(e),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const detailProject = useMemo(
    () => projects.find((p) => p.id === detailId) ?? null,
    [projects, detailId],
  )

  // ---------- estatísticas ----------
  const stats = useMemo(() => {
    const today = todayISO()
    const in7 = new Date()
    in7.setDate(in7.getDate() + 7)
    const in7ISO = in7.toISOString().slice(0, 10)
    let executing = 0
    let overdue = 0
    let finished = 0
    let next7 = 0
    for (const p of projects) {
      if (p.status === 'cancelado') continue
      const stage = p.current_stage ?? 1
      if (p.status === 'concluido' || stage >= 11) finished += 1
      else {
        executing += 1
        if (p.expected_delivery && isOverdue(p.expected_delivery)) overdue += 1
        if (
          p.expected_delivery &&
          p.expected_delivery.slice(0, 10) >= today &&
          p.expected_delivery.slice(0, 10) <= in7ISO
        )
          next7 += 1
      }
    }
    return { executing, overdue, finished, next7 }
  }, [projects])

  // ---------- drag & drop (HTML5 nativo) ----------
  const handleDrop = async (stageOrder: number) => {
    const id = draggingId
    setOverStage(null)
    setDraggingId(null)
    if (!id) return
    const project = projects.find((p) => p.id === id)
    if (!project) return
    const from = project.current_stage ?? 1
    if (from === stageOrder) return
    const stageName =
      PRODUCTION_STAGES.find((s) => s.order === stageOrder)?.name ?? `Etapa ${stageOrder}`
    // atualização otimista com rollback em erro
    const prev = projects
    setProjects((rows) => rows.map((p) => (p.id === id ? { ...p, current_stage: stageOrder } : p)))
    setSavingStage(id)
    try {
      await moveProjectStage(project, stageOrder, stageName)
      // se finalizou, grava delivered_at também
      if (stageOrder >= 11 && !project.delivered_at) await markProjectDelivered(project)
      toast({ title: 'Etapa atualizada', description: `Projeto movido para "${stageName}".` })
    } catch (e) {
      setProjects(prev)
      toast({
        title: 'Erro ao mover projeto',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setSavingStage(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-300" />
      </div>
    )
  }

  return (
    <div>
      <ErpPageHeader
        title="Produção"
        subtitle="Kanban das 11 etapas de produção e calendário de prazos e compromissos."
        actions={
          <div className="flex rounded-md border border-white/10 bg-white/[0.03] p-0.5">
            <Button
              size="sm"
              variant={view === 'kanban' ? 'secondary' : 'ghost'}
              className={cn(
                'h-8 gap-1.5 text-xs',
                view === 'kanban' && 'bg-amber-300/10 text-amber-200 hover:bg-amber-300/15',
              )}
              onClick={() => setView('kanban')}
            >
              <KanbanSquare className="h-3.5 w-3.5" /> Kanban
            </Button>
            <Button
              size="sm"
              variant={view === 'calendario' ? 'secondary' : 'ghost'}
              className={cn(
                'h-8 gap-1.5 text-xs',
                view === 'calendario' && 'bg-amber-300/10 text-amber-200 hover:bg-amber-300/15',
              )}
              onClick={() => setView('calendario')}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendário
            </Button>
          </div>
        }
      />

      {/* estatísticas */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ErpStatCard label="Em execução" value={String(stats.executing)} tone="wood" />
        <ErpStatCard
          label="Atrasados"
          value={String(stats.overdue)}
          tone="negative"
          hint="Prazo vencido e não finalizados"
        />
        <ErpStatCard label="Finalizados" value={String(stats.finished)} tone="positive" />
        <ErpStatCard label="Próximos 7 dias" value={String(stats.next7)} tone="warning" />
      </div>

      {projects.length === 0 && events.length === 0 && view === 'calendario' ? (
        <ErpEmptyState
          title="Nada no calendário"
          description="Cadastre prazos de projetos e compromissos na Agenda para vê-los aqui."
          icon={<CalendarDays className="h-8 w-8" />}
        />
      ) : projects.length === 0 ? (
        <ErpEmptyState
          title="Nenhum projeto em produção"
          description="Aprove um orçamento e o projeto nasce aqui, na etapa 1 (Projeto aprovado)."
          icon={<KanbanSquare className="h-8 w-8" />}
        />
      ) : view === 'kanban' ? (
        <ProductionKanban
          projects={projects}
          draggingId={draggingId}
          overStage={overStage}
          savingStage={savingStage}
          onDragStart={(id) => setDraggingId(id)}
          onDragEnd={() => {
            setDraggingId(null)
            setOverStage(null)
          }}
          onDragOverStage={setOverStage}
          onDropStage={handleDrop}
          onOpenDetail={setDetailId}
        />
      ) : (
        <ProductionCalendar projects={projects} events={events} onOpenDetail={setDetailId} />
      )}

      <ProjectDetailDrawer
        project={detailProject}
        onClose={() => setDetailId(null)}
        onTasksChanged={load}
      />
    </div>
  )
}

// ---------- Kanban ----------

function ProductionKanban({
  projects,
  draggingId,
  overStage,
  savingStage,
  onDragStart,
  onDragEnd,
  onDragOverStage,
  onDropStage,
  onOpenDetail,
}: {
  projects: ProjectRecord[]
  draggingId: string | null
  overStage: number | null
  savingStage: string | null
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDragOverStage: (stage: number | null) => void
  onDropStage: (stage: number) => void
  onOpenDetail: (id: string) => void
}) {
  const pendingByProject = useProjectPendingCounts(projects)

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {PRODUCTION_STAGES.map((stage) => {
        const cards = projects.filter((p) => (p.current_stage ?? 1) === stage.order)
        return (
          <div
            key={stage.order}
            className={cn(
              'flex w-60 shrink-0 flex-col rounded-lg border bg-white/[0.02] transition-colors',
              overStage === stage.order
                ? 'border-amber-300/60 bg-amber-300/[0.06]'
                : 'border-white/10',
            )}
            onDragOver={(e) => {
              e.preventDefault()
              onDragOverStage(stage.order)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) onDragOverStage(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              onDropStage(stage.order)
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-300">
                <span className="text-amber-200/70">{stage.order}.</span> {stage.name}
              </p>
              <Badge variant="outline" className="border-white/15 text-[10px] text-zinc-400">
                {cards.length}
              </Badge>
            </div>
            <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
              {cards.length === 0 && (
                <p className="px-1 py-3 text-center text-[11px] text-zinc-600">
                  Arraste um projeto para cá
                </p>
              )}
              {cards.map((p) => {
                const overdue =
                  p.expected_delivery &&
                  isOverdue(p.expected_delivery) &&
                  (p.current_stage ?? 1) < 11
                const pending = pendingByProject[p.id] ?? null
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => onDragStart(p.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => onOpenDetail(p.id)}
                    className={cn(
                      'cursor-grab rounded-md border border-white/10 bg-[#1d1f24] p-3 transition-shadow hover:border-amber-300/40 hover:shadow-md active:cursor-grabbing',
                      draggingId === p.id && 'opacity-40',
                      savingStage === p.id && 'animate-pulse',
                      overdue && 'border-red-400/40 bg-red-400/[0.06]',
                    )}
                  >
                    <p className="text-sm font-medium leading-snug text-zinc-100">{p.title}</p>
                    <p className="mt-1 truncate text-xs text-zinc-400">
                      {p.expand?.client?.name ?? 'Sem cliente'}
                    </p>
                    {p.responsible && (
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        Resp.: {p.responsible}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {p.expected_delivery && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'border-white/15 text-[10px] text-zinc-300',
                            overdue && 'border-red-400/40 bg-red-400/10 text-red-300',
                          )}
                        >
                          {overdue && '⚠ '}
                          {formatDate(p.expected_delivery)}
                          {overdue ? ' · atrasado' : ''}
                        </Badge>
                      )}
                      {pending !== null && pending > 0 && (
                        <Badge
                          variant="outline"
                          className="border-amber-300/30 bg-amber-300/10 text-[10px] text-amber-200"
                        >
                          {pending} pendência{pending > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// contagem de tarefas pendentes por projeto (uma consulta única, em vez de uma por card)
function useProjectPendingCounts(projects: ProjectRecord[]): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const key = projects.map((p) => p.updated).join('|')
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const all = await pb.collection('tasks').getFullList<TaskRecord>({
          filter: 'done = false || done = null',
        })
        if (!alive) return
        const map: Record<string, number> = {}
        for (const t of all) {
          if (t.project) map[t.project] = (map[t.project] ?? 0) + 1
        }
        setCounts(map)
      } catch {
        if (alive) setCounts({})
      }
    })()
    return () => {
      alive = false
    }
  }, [key])
  return counts
}

// ---------- Calendário mensal ----------

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function ProductionCalendar({
  projects,
  events,
  onOpenDetail,
}: {
  projects: ProjectRecord[]
  events: AgendaEventRecord[]
  onOpenDetail: (id: string) => void
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-11
  const ym = `${year}-${String(month + 1).padStart(2, '0')}`

  // prazos de projetos no mês (um por dia)
  const projectsByDay = useMemo(() => {
    const map: Record<number, ProjectRecord[]> = {}
    for (const p of projects) {
      if (!p.expected_delivery) continue
      if (p.expected_delivery.slice(0, 7) !== ym) continue
      const day = parseInt(p.expected_delivery.slice(8, 10), 10)
      if (!Number.isNaN(day)) (map[day] ??= []).push(p)
    }
    return map
  }, [projects, ym])

  // compromissos da agenda no mês
  const eventsByDay = useMemo(() => {
    const map: Record<number, AgendaEventRecord[]> = {}
    for (const ev of events) {
      if (!ev.event_date || ev.event_date.slice(0, 7) !== ym) continue
      const day = parseInt(ev.event_date.slice(8, 10), 10)
      if (!Number.isNaN(day)) (map[day] ??= []).push(ev)
    }
    return map
  }, [events, ym])

  const monthHasContent = Object.keys(projectsByDay).length + Object.keys(eventsByDay).length > 0

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = firstDay.getDay()
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const monthLabel = new Date(year, month, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
  const today = todayISO()

  const dayISO = (day: number) => `${ym}-${String(day).padStart(2, '0')}`

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-serif text-lg capitalize tracking-wide text-zinc-100">{monthLabel}</p>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-zinc-300 hover:bg-white/10"
            aria-label="Mês anterior"
            onClick={() => {
              const m = month - 1
              if (m < 0) {
                setMonth(11)
                setYear((y) => y - 1)
              } else setMonth(m)
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-white/15 text-xs text-zinc-200 hover:bg-white/10"
            onClick={() => {
              const t = new Date()
              setYear(t.getFullYear())
              setMonth(t.getMonth())
            }}
          >
            Hoje
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-zinc-300 hover:bg-white/10"
            aria-label="Próximo mês"
            onClick={() => {
              const m = month + 1
              if (m > 11) {
                setMonth(0)
                setYear((y) => y + 1)
              } else setMonth(m)
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* legenda */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-300" /> Prazo de projeto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-400" /> Compromisso da agenda
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="pb-1 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-500"
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={cn(
              'min-h-24 rounded-md border p-1.5',
              day ? 'border-white/10 bg-white/[0.02]' : 'border-transparent',
              day && dayISO(day) === today && 'border-amber-300/50 bg-amber-300/[0.06]',
            )}
          >
            {day && (
              <>
                <p
                  className={cn(
                    'text-[11px] text-zinc-500',
                    dayISO(day) === today && 'font-bold text-amber-200',
                  )}
                >
                  {day}
                </p>
                <div className="mt-1 space-y-1">
                  {(projectsByDay[day] ?? []).map((p) => {
                    const finished = (p.current_stage ?? 1) >= 11 || p.status === 'concluido'
                    return (
                      <button
                        key={p.id}
                        onClick={() => onOpenDetail(p.id)}
                        className={cn(
                          'block w-full truncate rounded border border-amber-200/20 bg-amber-200/5 px-1.5 py-0.5 text-left text-[10px] text-amber-100 hover:bg-amber-200/15',
                          finished &&
                            'border-emerald-400/30 bg-emerald-400/10 text-emerald-200 line-through',
                          !finished &&
                            isOverdue(p.expected_delivery) &&
                            'border-red-400/40 bg-red-400/10 text-red-300',
                        )}
                        title={`Prazo: ${p.title} — ${p.expand?.client?.name ?? ''}`}
                      >
                        {p.title}
                      </button>
                    )
                  })}
                  {(eventsByDay[day] ?? []).map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => onOpenDetail(ev.project || null)}
                      disabled={!ev.project}
                      className="block w-full truncate rounded border border-sky-300/25 bg-sky-300/10 px-1.5 py-0.5 text-left text-[10px] text-sky-100 hover:bg-sky-300/20 disabled:cursor-default"
                      title={`${AGENDA_KIND_LABELS[ev.kind]}: ${ev.title}${
                        ev.time ? ` (${ev.time})` : ''
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {ev.time && <Clock className="h-2.5 w-2.5 shrink-0" />}
                        {ev.title}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {!monthHasContent && (
        <p className="mt-4 text-center text-xs text-zinc-500">
          Nenhum prazo de projeto ou compromisso da agenda neste mês.
        </p>
      )}
    </div>
  )
}
