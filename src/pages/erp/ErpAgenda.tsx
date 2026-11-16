// Agenda e tarefas (Bloco 2 da Etapa 2) — compromissos por data com alertas de atraso.
import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle, CalendarClock, Check, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErpEmptyState, ErpPageHeader, ErpStatCard } from './ErpShared'
import {
  createAgendaEvent,
  deleteAgendaEvent,
  listAgendaEvents,
  toggleAgendaEventDone,
  updateAgendaEvent,
} from '@/services/contracts'
import { listClients, listProjects } from '@/services/erp'
import { listSuppliers } from '@/services/inventory'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatDate, formatDateTime, todayISO } from '@/lib/format'
import {
  AGENDA_KINDS,
  AGENDA_KIND_LABELS,
  emptyAgendaEventForm,
  type AgendaEventFormValues,
  type AgendaEventRecord,
  type AgendaKind,
} from '@/types/contracts'

function validateAgenda(form: AgendaEventFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.title.trim()) errors.title = 'Informe o título do compromisso.'
  if (!form.event_date) errors.event_date = 'Informe a data do compromisso.'
  if (!form.client && !form.project && !form.supplier)
    errors.context = 'Vincule o compromisso a um cliente, projeto ou fornecedor.'
  return errors
}

function formFromRecord(e: AgendaEventRecord): AgendaEventFormValues {
  return {
    title: e.title ?? '',
    kind: e.kind ?? 'reuniao',
    event_date: e.event_date ? e.event_date.slice(0, 10) : '',
    time: e.time ? e.time.slice(0, 5) : '',
    notes: e.notes ?? '',
    client: e.client ?? '',
    project: e.project ?? '',
    supplier: e.supplier ?? '',
  }
}

const kindTone: Record<AgendaKind, string> = {
  reuniao: 'bg-sky-400/10 text-sky-300',
  visita_tecnica: 'bg-violet-400/10 text-violet-300',
  medicao: 'bg-cyan-400/10 text-cyan-300',
  entrega: 'bg-emerald-400/10 text-emerald-300',
  instalacao: 'bg-amber-400/10 text-amber-300',
  pagamento: 'bg-lime-400/10 text-lime-300',
  compra: 'bg-orange-400/10 text-orange-300',
  prazo: 'bg-red-400/10 text-red-300',
}

function AgendaFields({
  form,
  setForm,
  errors,
  clients,
  projects,
  suppliers,
}: {
  form: AgendaEventFormValues
  setForm: (f: AgendaEventFormValues) => void
  errors: Record<string, string>
  clients: { id: string; name: string }[]
  projects: { id: string; title: string }[]
  suppliers: { id: string; name: string }[]
}) {
  const set = (patch: Partial<AgendaEventFormValues>) => setForm({ ...form, ...patch })
  const selectCls =
    'h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-100'

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="ag-title">Título *</Label>
        <Input
          id="ag-title"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          className="bg-white/5"
          placeholder="Ex.: Medição no apartamento Centro"
        />
        {errors.title && <p className="mt-1 text-xs text-red-300">{errors.title}</p>}
      </div>
      <div>
        <Label htmlFor="ag-kind">Tipo</Label>
        <select
          id="ag-kind"
          value={form.kind}
          onChange={(e) => set({ kind: e.target.value as AgendaKind })}
          className={selectCls}
        >
          {AGENDA_KINDS.map((k) => (
            <option key={k} value={k}>
              {AGENDA_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ag-date">Data *</Label>
          <Input
            id="ag-date"
            type="date"
            value={form.event_date}
            onChange={(e) => set({ event_date: e.target.value })}
            className="bg-white/5"
          />
          {errors.event_date && <p className="mt-1 text-xs text-red-300">{errors.event_date}</p>}
        </div>
        <div>
          <Label htmlFor="ag-time">Hora</Label>
          <Input
            id="ag-time"
            type="time"
            value={form.time}
            onChange={(e) => set({ time: e.target.value })}
            className="bg-white/5"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="ag-client">Cliente</Label>
        <select
          id="ag-client"
          value={form.client}
          onChange={(e) => set({ client: e.target.value })}
          className={selectCls}
        >
          <option value="">—</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="ag-project">Projeto</Label>
        <select
          id="ag-project"
          value={form.project}
          onChange={(e) => set({ project: e.target.value })}
          className={selectCls}
        >
          <option value="">—</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="ag-supplier">Fornecedor</Label>
        <select
          id="ag-supplier"
          value={form.supplier}
          onChange={(e) => set({ supplier: e.target.value })}
          className={selectCls}
        >
          <option value="">—</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {errors.context && <p className="text-xs text-red-300 sm:col-span-2">{errors.context}</p>}
      <div className="sm:col-span-2">
        <Label htmlFor="ag-notes">Observações</Label>
        <Textarea
          id="ag-notes"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={2}
          className="bg-white/5"
          placeholder="Ex.: levar trena e caderno de medidas"
        />
      </div>
    </div>
  )
}

export default function ErpAgenda() {
  const [events, setEvents] = useState<AgendaEventRecord[]>([])
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState<{ open: boolean; editing: AgendaEventRecord | null }>({
    open: false,
    editing: null,
  })
  const [form, setForm] = useState<AgendaEventFormValues>(emptyAgendaEventForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<AgendaEventRecord | null>(null)
  const [filter, setFilter] = useState<'todas' | 'atrasadas' | 'hoje' | 'proximas' | 'concluidas'>(
    'todas',
  )

  const load = async () => setEvents(await listAgendaEvents())

  useEffect(() => {
    ;(async () => {
      try {
        const [ev, cl, pr, sp] = await Promise.all([
          listAgendaEvents(),
          listClients(),
          listProjects(),
          listSuppliers(),
        ])
        setEvents(ev)
        setClients(cl)
        setProjects(pr)
        setSuppliers(sp)
      } catch (e) {
        toast({
          title: 'Erro ao carregar agenda',
          description: getErrorMessage(e),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const today = todayISO()

  const buckets = useMemo(() => {
    const atrasadas: AgendaEventRecord[] = []
    const hoje: AgendaEventRecord[] = []
    const proximas: AgendaEventRecord[] = []
    const concluidas: AgendaEventRecord[] = []
    for (const e of events) {
      const date = e.event_date?.slice(0, 10) ?? ''
      if (e.done) concluidas.push(e)
      else if (date && date < today) atrasadas.push(e)
      else if (date === today) hoje.push(e)
      else proximas.push(e)
    }
    atrasadas.sort((a, b) => a.event_date.localeCompare(b.event_date))
    proximas.sort((a, b) => a.event_date.localeCompare(b.event_date))
    return { atrasadas, hoje, proximas, concluidas }
  }, [events, today])

  const openNew = () => {
    setForm(emptyAgendaEventForm)
    setErrors({})
    setDialog({ open: true, editing: null })
  }

  const openEdit = (e: AgendaEventRecord) => {
    setForm(formFromRecord(e))
    setErrors({})
    setDialog({ open: true, editing: e })
  }

  const save = async () => {
    const errs = validateAgenda(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      if (dialog.editing) {
        await updateAgendaEvent(dialog.editing.id, form)
        toast({ title: 'Compromisso atualizado' })
      } else {
        await createAgendaEvent(form)
        toast({ title: 'Compromisso criado' })
      }
      setDialog({ open: false, editing: null })
      await load()
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteAgendaEvent(deleteTarget.id, deleteTarget.title)
      toast({ title: 'Compromisso excluído' })
      await load()
    } catch (e) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleToggle = async (e: AgendaEventRecord) => {
    try {
      await toggleAgendaEventDone(e.id, !e.done)
      await load()
    } catch (err) {
      toast({
        title: 'Erro ao atualizar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-300" />
      </div>
    )
  }

  const visible = (() => {
    switch (filter) {
      case 'atrasadas':
        return buckets.atrasadas
      case 'hoje':
        return buckets.hoje
      case 'proximas':
        return buckets.proximas
      case 'concluidas':
        return buckets.concluidas
      default:
        return [...buckets.atrasadas, ...buckets.hoje, ...buckets.proximas, ...buckets.concluidas]
    }
  })()

  const contextLabel = (e: AgendaEventRecord): string => {
    if (e.expand?.project?.title) return e.expand.project.title
    if (e.expand?.client?.name) return e.expand.client.name
    if (e.expand?.supplier?.name) return e.expand.supplier.name
    return '—'
  }

  const renderRow = (e: AgendaEventRecord) => {
    const date = e.event_date?.slice(0, 10) ?? ''
    const overdue = !e.done && date !== '' && date < today
    return (
      <div key={e.id} className={cnRow(overdue)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Checkbox
              checked={e.done}
              onCheckedChange={() => handleToggle(e)}
              aria-label={e.done ? 'Reabrir compromisso' : 'Concluir compromisso'}
              className="mt-1 border-white/30 data-[state=checked]:border-amber-300 data-[state=checked]:bg-amber-300 data-[state=checked]:text-zinc-900"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={`font-medium ${
                    e.done
                      ? 'text-zinc-500 line-through'
                      : overdue
                        ? 'text-red-200'
                        : 'text-zinc-100'
                  }`}
                >
                  {e.title}
                </p>
                <Badge className={`border-0 ${kindTone[e.kind] ?? ''}`}>
                  {AGENDA_KIND_LABELS[e.kind] ?? e.kind}
                </Badge>
                {overdue && (
                  <Badge className="border-0 bg-red-400/15 text-red-200">
                    <AlertTriangle className="mr-1 h-3 w-3" /> atrasado
                  </Badge>
                )}
                {date === today && !e.done && (
                  <Badge className="border-0 bg-amber-300/15 text-amber-200">hoje</Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">
                {formatDate(e.event_date)}
                {e.time ? ` · ${e.time.slice(0, 5)}` : ''} · {contextLabel(e)}
              </p>
              {e.notes && <p className="mt-0.5 text-xs text-zinc-500">{e.notes}</p>}
              {e.done && e.done_at && (
                <p className="mt-0.5 text-[11px] text-zinc-600">
                  concluído em {formatDateTime(e.done_at)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-zinc-300 hover:bg-white/10"
              onClick={() => handleToggle(e)}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              {e.done ? 'Reabrir' : 'Concluir'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-white/15 text-zinc-200 hover:bg-white/10"
              onClick={() => openEdit(e)}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-red-300 hover:bg-red-400/10"
              onClick={() => setDeleteTarget(e)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ErpPageHeader
        title="Agenda e tarefas"
        subtitle="Compromissos e prazos vinculados a clientes, projetos e fornecedores."
        actions={
          <Button onClick={openNew} className="bg-amber-300 text-zinc-900 hover:bg-amber-200">
            <Plus className="mr-2 h-4 w-4" /> Novo compromisso
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <ErpStatCard label="Atrasados" value={String(buckets.atrasadas.length)} tone="negative" />
        <ErpStatCard label="Hoje" value={String(buckets.hoje.length)} tone="wood" />
        <ErpStatCard label="Próximos" value={String(buckets.proximas.length)} />
        <ErpStatCard label="Concluídos" value={String(buckets.concluidas.length)} tone="positive" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['todas', `Todas (${events.length})`],
            ['atrasadas', `Atrasadas (${buckets.atrasadas.length})`],
            ['hoje', `Hoje (${buckets.hoje.length})`],
            ['proximas', `Próximas (${buckets.proximas.length})`],
            ['concluidas', `Concluídas (${buckets.concluidas.length})`],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'default' : 'outline'}
            className={
              filter === key
                ? 'bg-amber-300 text-zinc-900 hover:bg-amber-200'
                : 'border-white/15 text-zinc-300 hover:bg-white/10'
            }
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <ErpEmptyState
          title="Nada por aqui"
          description="Nenhum compromisso neste filtro. Crie um novo compromisso para organizar reuniões, medições, entregas e prazos."
          icon={<CalendarClock className="h-8 w-8" />}
          action={
            <Button
              onClick={openNew}
              variant="outline"
              className="border-white/15 text-zinc-200 hover:bg-white/10"
            >
              <Plus className="mr-2 h-4 w-4" /> Novo compromisso
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">{visible.map(renderRow)}</div>
      )}

      {/* diálogo de cadastro/edição */}
      <Dialog
        open={dialog.open}
        onOpenChange={(o) => !o && setDialog({ open: false, editing: null })}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#1d1f24] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialog.editing ? 'Editar compromisso' : 'Novo compromisso'}</DialogTitle>
            <DialogDescription>
              Vincule a um cliente, projeto ou fornecedor — ao menos um é obrigatório.
            </DialogDescription>
          </DialogHeader>
          <AgendaFields
            form={form}
            setForm={setForm}
            errors={errors}
            clients={clients}
            projects={projects}
            suppliers={suppliers}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialog({ open: false, editing: null })}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar compromisso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* confirmação de exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="border-white/10 bg-[#1d1f24] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir compromisso</DialogTitle>
            <DialogDescription>
              Excluir “{deleteTarget?.title}”? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function cnRow(overdue: boolean): string {
  return overdue
    ? 'rounded-lg border border-red-400/30 bg-red-400/[0.06] p-4'
    : 'rounded-lg border border-white/10 bg-white/[0.03] p-4'
}
