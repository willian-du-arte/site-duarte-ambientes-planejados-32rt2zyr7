// Drawer de detalhe do projeto (tela Produção) — Duarte Gestão.
// Mostra cliente, valor, prazo, etapa, tarefas pendentes (marcáveis), materiais,
// fornecedores envolvidos, observações e histórico (activity_log).
import { useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ErpSectionTitle } from './ErpShared'
import {
  getProjectQuote,
  listProjectHistory,
  listProjectPurchases,
  listTasksByProject,
  moveProjectStage,
} from '@/services/production'
import { toggleTaskDone } from '@/services/erp'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatCurrency, formatDate, formatDateTime, isOverdue } from '@/lib/format'
import type {
  ActivityLogRecord,
  ProjectRecord,
  QuoteItem,
  QuoteRecord,
  TaskRecord,
} from '@/types/erp'
import type { PurchaseRecord } from '@/types/inventory'

const STAGE_NAMES = [
  'Projeto aprovado',
  'Conferência de medidas',
  'Planejamento de materiais',
  'Compra de materiais',
  'Aguardando materiais',
  'Fabricação',
  'Acabamento',
  'Preparação para entrega',
  'Transporte',
  'Instalação',
  'Finalizado',
]

interface DetailData {
  tasks: TaskRecord[]
  history: ActivityLogRecord[]
  purchases: PurchaseRecord[]
  quote: QuoteRecord | null
}

export function ProjectDetailDrawer({
  project,
  onClose,
  onTasksChanged,
}: {
  project: ProjectRecord | null
  onClose: () => void
  onTasksChanged: () => void | Promise<void>
}) {
  const [data, setData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!project) {
      setData(null)
      return
    }
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const [tasks, history, purchases, quote] = await Promise.all([
          listTasksByProject(project.id),
          listProjectHistory(project.id),
          listProjectPurchases(project.id),
          getProjectQuote(project.quote),
        ])
        if (alive) setData({ tasks, history, purchases, quote })
      } catch {
        if (alive) setData({ tasks: [], history: [], purchases: [], quote: null })
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [project?.id])

  if (!project) return null

  const stageOrder = project.current_stage ?? 1
  const stageName = STAGE_NAMES[stageOrder - 1] ?? `Etapa ${stageOrder}`
  const pending = (data?.tasks ?? []).filter((t) => !t.done)

  const toggle = async (task: TaskRecord, done: boolean) => {
    try {
      await toggleTaskDone(task.id, done)
      setData((d) =>
        d ? { ...d, tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, done } : t)) } : d,
      )
      onTasksChanged()
    } catch (e) {
      toast({
        title: 'Erro ao atualizar tarefa',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    }
  }

  const advanceTo = async (order: number) => {
    try {
      await moveProjectStage(project, order, STAGE_NAMES[order - 1] ?? `Etapa ${order}`)
      onTasksChanged()
    } catch (e) {
      toast({
        title: 'Erro ao mover etapa',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    }
  }

  const suppliers = Array.from(
    new Set(
      (data?.purchases ?? [])
        .map((p) => p.expand?.supplier?.name)
        .filter((n): n is string => Boolean(n)),
    ),
  )

  const materials: QuoteItem[] = (data?.quote?.items ?? []).filter(
    (it): it is QuoteItem =>
      Boolean(it) && typeof it === 'object' && typeof it.description === 'string',
  )

  return (
    <Sheet open={Boolean(project)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-white/10 bg-[#17181c] p-5 sm:max-w-lg"
      >
        <SheetHeader className="p-0 text-left">
          <SheetTitle className="font-serif text-xl tracking-wide text-zinc-100">
            {project.title}
          </SheetTitle>
          <SheetDescription className="text-zinc-400">
            {project.expand?.client?.name ?? 'Sem cliente'} · {stageName}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            {/* resumo */}
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm">
              <Info label="Valor contratado">{formatCurrency(project.contracted_value ?? 0)}</Info>
              <Info label="Responsável">{project.responsible || '—'}</Info>
              <Info label="Prazo previsto">
                <span
                  className={cn(
                    isOverdue(project.expected_delivery) && stageOrder < 11 && 'text-red-300',
                  )}
                >
                  {formatDate(project.expected_delivery)}
                  {isOverdue(project.expected_delivery) && stageOrder < 11 ? ' (atrasado)' : ''}
                </span>
              </Info>
              <Info label="Etapa atual">
                <span className="text-amber-200">
                  {stageOrder}. {stageName}
                </span>
              </Info>
            </div>

            {/* mover etapa */}
            <div>
              <ErpSectionTitle>Mover etapa</ErpSectionTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={stageOrder <= 1}
                  className="h-8 border-white/15 text-xs text-zinc-200 hover:bg-white/10"
                  onClick={() => advanceTo(stageOrder - 1)}
                >
                  ← Voltar etapa
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={stageOrder >= 11}
                  className="h-8 border-white/15 text-xs text-zinc-200 hover:bg-white/10"
                  onClick={() => advanceTo(stageOrder + 1)}
                >
                  Avançar etapa →
                </Button>
              </div>
            </div>

            {/* tarefas */}
            <div>
              <ErpSectionTitle>
                Tarefas {data && `(${pending.length} pendente${pending.length === 1 ? '' : 's'})`}
              </ErpSectionTitle>
              {(data?.tasks ?? []).length === 0 ? (
                <p className="text-xs text-zinc-500">Nenhuma tarefa vinculada a este projeto.</p>
              ) : (
                <ul className="space-y-2">
                  {(data?.tasks ?? []).map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start gap-2.5 rounded-md border border-white/10 bg-white/[0.02] p-2.5"
                    >
                      <Checkbox
                        checked={t.done}
                        onCheckedChange={(v) => toggle(t, v === true)}
                        className="mt-0.5 border-white/30 data-[state=checked]:border-amber-300 data-[state=checked]:bg-amber-300 data-[state=checked]:text-[#17181c]"
                        aria-label={t.title}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'text-sm text-zinc-200',
                            t.done && 'text-zinc-500 line-through',
                          )}
                        >
                          {t.title}
                        </p>
                        {t.due_date && (
                          <p className="mt-0.5 text-[11px] text-zinc-500">
                            Prazo: {formatDate(t.due_date)}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          t.priority === 'alta'
                            ? 'border-red-400/40 text-red-300'
                            : t.priority === 'media'
                              ? 'border-amber-300/40 text-amber-200'
                              : 'border-white/15 text-zinc-400',
                        )}
                      >
                        {t.priority === 'alta'
                          ? 'Alta'
                          : t.priority === 'media'
                            ? 'Média'
                            : 'Baixa'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* materiais */}
            <div>
              <ErpSectionTitle>Materiais necessários</ErpSectionTitle>
              {materials.length > 0 ? (
                <div className="space-y-1 text-sm text-zinc-300">
                  {project.materials_needed && (
                    <p className="whitespace-pre-wrap">{project.materials_needed}</p>
                  )}
                  {materials.map((it, i) => (
                    <p key={i} className="text-xs text-zinc-400">
                      • {it.description} — {it.quantity} un
                      {it.unit_cost ? ` (${formatCurrency(it.unit_cost)})` : ''}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">
                  Sem materiais lançados (itens do orçamento aprovado aparecem aqui).
                </p>
              )}
            </div>

            {/* fornecedores */}
            <div>
              <ErpSectionTitle>Fornecedores envolvidos</ErpSectionTitle>
              {suppliers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {suppliers.map((n) => (
                    <Badge
                      key={n}
                      variant="outline"
                      className="border-white/15 text-xs text-zinc-300"
                    >
                      {n}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">
                  Nenhuma compra vinculada a este projeto ainda.
                </p>
              )}
            </div>

            {/* observações */}
            <div>
              <ErpSectionTitle>Observações</ErpSectionTitle>
              <p className="whitespace-pre-wrap text-sm text-zinc-300">{project.notes || '—'}</p>
            </div>

            {/* histórico */}
            <div>
              <ErpSectionTitle>Histórico de alterações</ErpSectionTitle>
              {(data?.history ?? []).length === 0 ? (
                <p className="text-xs text-zinc-500">Nenhum registro de alteração.</p>
              ) : (
                <ol className="space-y-2.5 border-l border-white/10 pl-3">
                  {(data?.history ?? []).map((h) => (
                    <li key={h.id} className="relative text-xs">
                      <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-amber-300/70" />
                      <p className="text-zinc-200">
                        {h.description || `${h.action} — ${h.field ?? ''}`}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">
                        {formatDateTime(h.created)}
                        {h.user_email ? ` · ${h.user_email}` : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 text-zinc-100">{children}</p>
    </div>
  )
}
