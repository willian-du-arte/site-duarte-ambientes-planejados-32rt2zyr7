// Contratos (Bloco 2 da Etapa 2) — cadastro por projeto com histórico no activity_log.
import { useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { History, Loader2, Pencil, Plus, ScrollText, Trash2 } from 'lucide-react'
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
  createContract,
  deleteContract,
  listContractHistory,
  listContracts,
  updateContract,
} from '@/services/contracts'
import { listProjects } from '@/services/erp'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import {
  CONTRACT_STATUS_LABELS,
  emptyContractForm,
  type ContractFormValues,
  type ContractRecord,
} from '@/types/contracts'
import type { ProjectRecord } from '@/types/erp'

const statusTone: Record<string, string> = {
  ativo: 'bg-emerald-400/10 text-emerald-300',
  encerrado: 'bg-zinc-400/10 text-zinc-400',
  cancelado: 'bg-red-400/10 text-red-300',
}

function validateContract(form: ContractFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.title.trim()) errors.title = 'Informe o título do contrato.'
  if (!form.project) errors.project = 'Vincule o contrato a um projeto.'
  if (!form.contract_date) errors.contract_date = 'Informe a data da contratação.'
  if (form.value === '' || Number(form.value) < 0)
    errors.value = 'Informe o valor contratado (0 ou mais).'
  if (form.deadline && form.contract_date && form.deadline < form.contract_date)
    errors.deadline = 'O prazo não pode ser anterior à contratação.'
  return errors
}

function formFromRecord(c: ContractRecord): ContractFormValues {
  return {
    title: c.title ?? '',
    description: c.description ?? '',
    value: c.value != null && c.value !== 0 ? String(c.value) : '',
    contract_date: c.contract_date ? c.contract_date.slice(0, 10) : '',
    deadline: c.deadline ? c.deadline.slice(0, 10) : '',
    payment_terms: c.payment_terms ?? '',
    status: c.status ?? 'ativo',
    documents: c.documents ?? '',
    notes: c.notes ?? '',
    client: c.client ?? '',
    project: c.project ?? '',
  }
}

function ContractFields({
  form,
  setForm,
  errors,
  projects,
  loadingProjects,
}: {
  form: ContractFormValues
  setForm: (f: ContractFormValues) => void
  errors: Record<string, string>
  projects: ProjectRecord[]
  loadingProjects: boolean
}) {
  const set = (patch: Partial<ContractFormValues>) => setForm({ ...form, ...patch })
  const project = projects.find((p) => p.id === form.project)
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="ct-title">Título *</Label>
        <Input
          id="ct-title"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          className="bg-white/5"
          placeholder="Ex.: Contrato cozinha e dormitórios — Apartamento Centro"
        />
        {errors.title && <p className="mt-1 text-xs text-red-300">{errors.title}</p>}
      </div>
      <div>
        <Label htmlFor="ct-project">Projeto *</Label>
        <select
          id="ct-project"
          value={form.project}
          onChange={(e) => {
            const projectId = e.target.value
            const p = projects.find((pp) => pp.id === projectId)
            set({ project: projectId, client: p?.client ?? '' })
          }}
          className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-100"
        >
          <option value="">{loadingProjects ? 'Carregando…' : 'Selecione um projeto'}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        {errors.project && <p className="mt-1 text-xs text-red-300">{errors.project}</p>}
      </div>
      <div>
        <Label>Cliente (do projeto)</Label>
        <Input
          value={project ? (project.expand?.client?.name ?? '—') : 'Selecione um projeto'}
          readOnly
          className="bg-white/5 text-zinc-400"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="ct-description">Descrição dos serviços (escopo)</Label>
        <Textarea
          id="ct-description"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          rows={3}
          className="bg-white/5"
          placeholder="Ex.: Fabricação e instalação de cozinha compacta, guarda-roupa casal e painel de TV…"
        />
      </div>
      <div>
        <Label htmlFor="ct-value">Valor contratado (R$) *</Label>
        <Input
          id="ct-value"
          type="number"
          min="0"
          step="0.01"
          value={form.value}
          onChange={(e) => set({ value: e.target.value })}
          className="bg-white/5"
        />
        {errors.value && <p className="mt-1 text-xs text-red-300">{errors.value}</p>}
      </div>
      <div>
        <Label htmlFor="ct-date">Data da contratação *</Label>
        <Input
          id="ct-date"
          type="date"
          value={form.contract_date}
          onChange={(e) => set({ contract_date: e.target.value })}
          className="bg-white/5"
        />
        {errors.contract_date && (
          <p className="mt-1 text-xs text-red-300">{errors.contract_date}</p>
        )}
      </div>
      <div>
        <Label htmlFor="ct-deadline">Prazo de execução</Label>
        <Input
          id="ct-deadline"
          type="date"
          value={form.deadline}
          onChange={(e) => set({ deadline: e.target.value })}
          className="bg-white/5"
        />
        {errors.deadline && <p className="mt-1 text-xs text-red-300">{errors.deadline}</p>}
      </div>
      <div>
        <Label>Situação</Label>
        <select
          value={form.status}
          onChange={(e) => set({ status: e.target.value as ContractFormValues['status'] })}
          className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-100"
        >
          {(Object.keys(CONTRACT_STATUS_LABELS) as (keyof typeof CONTRACT_STATUS_LABELS)[]).map(
            (s) => (
              <option key={s} value={s}>
                {CONTRACT_STATUS_LABELS[s]}
              </option>
            ),
          )}
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="ct-payment">Condições de pagamento</Label>
        <Textarea
          id="ct-payment"
          value={form.payment_terms}
          onChange={(e) => set({ payment_terms: e.target.value })}
          rows={2}
          className="bg-white/5"
          placeholder="Ex.: 50% na assinatura, 40% na entrega, 10% na instalação"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="ct-documents">Documentos / observações</Label>
        <Textarea
          id="ct-documents"
          value={form.documents}
          onChange={(e) => set({ documents: e.target.value })}
          rows={2}
          className="bg-white/5"
          placeholder="Nº do documento, anexos físicos, registros de aprovação…"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="ct-notes">Notas internas</Label>
        <Textarea
          id="ct-notes"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={2}
          className="bg-white/5"
        />
      </div>
    </div>
  )
}

function HistoryDialog({
  contractId,
  open,
  onClose,
}: {
  contractId: string
  open: boolean
  onClose: () => void
}) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listContractHistory>>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    listContractHistory(contractId)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [open, contractId])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto border-white/10 bg-[#1d1f24] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico do contrato</DialogTitle>
          <DialogDescription>
            Alterações de escopo, aprovações e operações registradas no log.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-zinc-400">Nenhum registro ainda.</p>
        ) : (
          <ol className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs"
              >
                <p className="text-zinc-200">
                  <span className="font-medium text-amber-200">{r.action}</span>
                  {r.field ? ` — ${r.field}` : ''}
                  {r.description ? ` · ${r.description}` : ''}
                </p>
                {r.old_value !== undefined && r.old_value !== '' && (
                  <p className="mt-0.5 text-zinc-500">
                    de “{r.old_value}” para “{r.new_value ?? ''}”
                  </p>
                )}
                <p className="mt-1 text-[11px] text-zinc-500">
                  {formatDateTime(r.created)}
                  {r.user_email ? ` · ${r.user_email}` : ''}
                </p>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function ErpContracts() {
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState<{ open: boolean; editing: ContractRecord | null }>({
    open: false,
    editing: null,
  })
  const [form, setForm] = useState<ContractFormValues>(emptyContractForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<ContractRecord | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)

  const load = async () => setContracts(await listContracts())

  useEffect(() => {
    ;(async () => {
      try {
        await load()
        setProjects(await listProjects())
      } catch (e) {
        toast({
          title: 'Erro ao carregar dados',
          description: getErrorMessage(e),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const openNew = () => {
    setForm(emptyContractForm)
    setErrors({})
    setDialog({ open: true, editing: null })
  }

  const openNewFromProject = (p: ProjectRecord) => {
    setForm({
      ...emptyContractForm,
      title: `Contrato — ${p.title}`,
      value: p.contracted_value ? String(p.contracted_value) : '',
      contract_date: new Date().toISOString().slice(0, 10),
      client: p.client,
      project: p.id,
    })
    setErrors({})
    setDialog({ open: true, editing: null })
  }

  const openEdit = (c: ContractRecord) => {
    setForm(formFromRecord(c))
    setErrors({})
    setDialog({ open: true, editing: c })
  }

  const save = async () => {
    const errs = validateContract(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      if (dialog.editing) {
        await updateContract(dialog.editing.id, dialog.editing, form)
        toast({ title: 'Contrato atualizado' })
      } else {
        await createContract(form)
        toast({ title: 'Contrato cadastrado' })
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
      await deleteContract(deleteTarget.id, deleteTarget.title)
      toast({ title: 'Contrato excluído' })
      await load()
    } catch (e) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-300" />
      </div>
    )
  }

  const ativos = contracts.filter((c) => c.status === 'ativo').length
  const valorTotal = contracts
    .filter((c) => c.status !== 'cancelado')
    .reduce((acc, c) => acc + (c.value ?? 0), 0)

  return (
    <div>
      <ErpPageHeader
        title="Contratos"
        subtitle="Contratos vinculados aos projetos — com histórico de escopo e aprovações."
        actions={
          <Button
            onClick={openNew}
            className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            disabled={projects.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo contrato
          </Button>
        }
      />

      {projects.length === 0 && (
        <p className="mb-4 rounded-md border border-amber-300/30 bg-amber-300/5 p-3 text-xs text-amber-200">
          Cadastre ou aprove um orçamento para gerar um projeto antes de criar contratos.
        </p>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <ErpStatCard label="Contratos" value={String(contracts.length)} />
        <ErpStatCard label="Ativos" value={String(ativos)} tone="positive" />
        <ErpStatCard label="Valor contratado" value={formatCurrency(valorTotal)} tone="wood" />
      </div>

      {contracts.length === 0 ? (
        <ErpEmptyState
          title="Nenhum contrato cadastrado"
          description="Crie um contrato a partir de um projeto aprovado, com escopo, valor e condições de pagamento."
          icon={<ScrollText className="h-8 w-8" />}
          action={
            projects.length > 0 ? (
              <Button
                onClick={openNew}
                variant="outline"
                className="border-white/15 text-zinc-200 hover:bg-white/10"
              >
                <Plus className="mr-2 h-4 w-4" /> Cadastrar contrato
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => {
            const overdue =
              c.deadline &&
              c.status === 'ativo' &&
              c.deadline.slice(0, 10) < new Date().toISOString().slice(0, 10)
            return (
              <div key={c.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-zinc-100">{c.title}</p>
                      <Badge className={`border-0 ${statusTone[c.status ?? 'ativo'] ?? ''}`}>
                        {CONTRACT_STATUS_LABELS[c.status ?? 'ativo']}
                      </Badge>
                      {overdue && (
                        <Badge className="border-0 bg-red-400/10 text-red-300">prazo vencido</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {c.expand?.project?.title ?? 'Projeto removido'} ·{' '}
                      {c.expand?.client?.name ?? '—'} · {formatCurrency(c.value ?? 0)}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Contratado em {formatDate(c.contract_date)}
                      {c.deadline ? ` · prazo ${formatDate(c.deadline)}` : ''}
                    </p>
                    {c.payment_terms && (
                      <p className="mt-1 text-xs text-zinc-400">Pagamento: {c.payment_terms}</p>
                    )}
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{c.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-zinc-300 hover:bg-white/10"
                      onClick={() => setHistoryId(c.id)}
                    >
                      <History className="mr-1 h-3.5 w-3.5" /> Histórico
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-white/15 text-zinc-200 hover:bg-white/10"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-red-300 hover:bg-red-400/10"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* diálogo de cadastro/edição */}
      <Dialog
        open={dialog.open}
        onOpenChange={(o) => !o && setDialog({ open: false, editing: null })}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#1d1f24] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialog.editing ? 'Editar contrato' : 'Novo contrato'}</DialogTitle>
            <DialogDescription>
              {dialog.editing
                ? 'Alterações de escopo e valores ficam registradas no histórico.'
                : 'O cliente é preenchido automaticamente pelo projeto selecionado.'}
            </DialogDescription>
          </DialogHeader>
          <ContractFields
            form={form}
            setForm={setForm}
            errors={errors}
            projects={projects}
            loadingProjects={loading}
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
              Salvar contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* confirmação de exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="border-white/10 bg-[#1d1f24] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir contrato</DialogTitle>
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

      {historyId && (
        <HistoryDialog contractId={historyId} open onClose={() => setHistoryId(null)} />
      )}
    </div>
  )
}
