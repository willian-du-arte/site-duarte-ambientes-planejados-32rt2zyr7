// Módulos de Projetos, Financeiro e Tarefas (etapa 1: listas funcionais com CRUD).
import { useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ErpEmptyState, ErpPageHeader, ErpSectionTitle } from './ErpShared'
import { useClientNames } from './QuoteClientSelect'
import {
  createAccount,
  createTask,
  deleteAccount,
  deleteTask,
  listAccounts,
  listProjects,
  listProjectStages,
  listTasks,
  markAccountPaid,
  updateAccount,
  updateProject,
  updateProjectStage,
  updateTask,
  toggleTaskDone,
  type TaskFormInput,
} from '@/services/erp'
import { createContract } from '@/services/contracts'
import { emptyContractForm, type ContractFormValues } from '@/types/contracts'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatCurrency, formatDate, formatDateTime, isOverdue, todayISO } from '@/lib/format'
import { useNavigate } from 'react-router-dom'
import {
  PROJECT_STATUS_LABELS,
  emptyAccountForm,
  emptyProjectForm,
  emptyTaskForm,
  type AccountFormValues,
  type AccountKind,
  type FinancialAccountRecord,
  type ProjectFormValues,
  type ProjectRecord,
  type ProjectStageRecord,
  type ProjectStatus,
  type TaskRecord,
} from '@/types/erp'
import { CheckCircle2, FolderKanban, Loader2, Plus, ScrollText, Trash2 } from 'lucide-react'

// Saldo em aberto de uma conta (não existe coluna "remaining": é valor - pago).
const remainingOf = (a: FinancialAccountRecord) =>
  Math.max((a.amount ?? 0) - (a.paid_amount ?? 0), 0)

function projectFormFromRecord(p: ProjectRecord, status?: ProjectStatus): ProjectFormValues {
  return {
    title: p.title ?? '',
    contracted_value: p.contracted_value ? String(p.contracted_value) : '',
    status: status ?? p.status,
    expected_delivery: p.expected_delivery ? p.expected_delivery.slice(0, 10) : '',
    notes: p.notes ?? '',
  }
}

// ---------- Projetos ----------

export function ErpProjects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [stagesByProject, setStagesByProject] = useState<Record<string, ProjectStageRecord[]>>({})
  const [openStages, setOpenStages] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const clientName = useClientNames()

  const load = async () => {
    const ps = await listProjects()
    setProjects(ps)
  }

  const loadStages = async (projectId: string) => {
    const rows = await listProjectStages(projectId)
    setStagesByProject((m) => ({ ...m, [projectId]: rows }))
  }

  useEffect(() => {
    ;(async () => {
      try {
        await load()
      } catch (e) {
        toast({
          title: 'Erro ao carregar projetos',
          description: getErrorMessage(e),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const advanceStage = async (stage: ProjectStageRecord, projectId: string) => {
    try {
      await updateProjectStage(stage.id, 'concluida')
      await loadStages(projectId)
      await load()
      toast({ title: 'Etapa concluída' })
    } catch (e) {
      toast({
        title: 'Erro ao concluir etapa',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    }
  }

  const [generatingId, setGenerating] = useState<string | null>(null)

  const generateContract = async (p: ProjectRecord) => {
    try {
      setGenerating(p.id)
      const form: ContractFormValues = {
        ...emptyContractForm,
        title: `Contrato — ${p.title}`,
        client: p.client,
        project: p.id,
        description: p.description || `Execução do projeto ${p.title}.`,
        value: p.contracted_value ? String(p.contracted_value) : '',
        contract_date: todayISO(),
        status: 'ativo',
        notes: 'Gerado a partir do projeto aprovado.',
      }
      await createContract(form)
      toast({ title: 'Contrato criado', description: 'Veja em Contratos no menu lateral.' })
      navigate('/erp/contratos')
    } catch (e) {
      toast({
        title: 'Erro ao gerar contrato',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setGenerating(null)
    }
  }

  const changeStatus = async (p: ProjectRecord, status: ProjectStatus) => {
    try {
      await updateProject(p.id, p, projectFormFromRecord(p, status))
      await load()
      toast({ title: 'Situação atualizada' })
    } catch (e) {
      toast({ title: 'Erro ao atualizar', description: getErrorMessage(e), variant: 'destructive' })
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
        title="Projetos"
        subtitle="Contratos em execução — criados automaticamente pela aprovação de orçamentos."
      />
      {projects.length === 0 ? (
        <ErpEmptyState
          title="Nenhum projeto em andamento"
          description="Aprove um orçamento e o projeto contratado nasce aqui, com as etapas de produção."
          icon={<FolderKanban className="h-8 w-8" />}
        />
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const stages = stagesByProject[p.id]
            const current = stages?.find((s) => s.status !== 'concluida')
            const overdue =
              p.expected_delivery && isOverdue(p.expected_delivery) && p.status !== 'concluido'
            return (
              <div key={p.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-100">{p.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {clientName(p.client)} · {formatCurrency(p.contracted_value ?? 0)}
                      {p.expected_delivery && (
                        <span className={overdue ? ' text-red-300' : ''}>
                          {' '}
                          · entrega {formatDate(p.expected_delivery)}
                          {overdue ? ' (atrasado)' : ''}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={p.status}
                      onValueChange={(v) => changeStatus(p, v as ProjectStatus)}
                    >
                      <SelectTrigger className="h-8 w-44 bg-white/5 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {PROJECT_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-white/15 text-zinc-200 hover:bg-white/10"
                      disabled={generatingId === p.id}
                      onClick={() => generateContract(p)}
                      title="Gerar contrato a partir deste projeto"
                    >
                      {generatingId === p.id ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ScrollText className="mr-1 h-3.5 w-3.5" />
                      )}
                      Gerar contrato
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-white/15 text-zinc-200 hover:bg-white/10"
                      onClick={() => {
                        setOpenStages(openStages === p.id ? null : p.id)
                        if (openStages !== p.id) loadStages(p.id)
                      }}
                    >
                      Etapas
                    </Button>
                  </div>
                </div>

                {openStages === p.id && (
                  <div className="mt-3 rounded-md border border-white/10 bg-[#1d1f24] p-3">
                    {!stages ? (
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Loader2 className="h-3 w-3 animate-spin" /> Carregando etapas…
                      </div>
                    ) : (
                      <ol className="space-y-1.5">
                        {stages.map((s, i) => (
                          <li
                            key={s.id}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span
                              className={
                                s.status === 'concluida'
                                  ? 'text-zinc-500 line-through'
                                  : 'text-zinc-200'
                              }
                            >
                              {i + 1}. {s.name}
                            </span>
                            {s.status === 'concluida' ? (
                              <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                                concluída
                              </Badge>
                            ) : s.status === 'em_andamento' ? (
                              <div className="flex items-center gap-2">
                                <Badge className="border-amber-300/30 bg-amber-300/10 text-amber-200">
                                  em andamento
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px] text-emerald-300 hover:bg-emerald-400/10"
                                  onClick={() => advanceStage(s, p.id)}
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> Concluir
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[10px] text-amber-200 hover:bg-amber-300/10"
                                onClick={async () => {
                                  try {
                                    await updateProjectStage(s.id, 'em_andamento')
                                    await loadStages(p.id)
                                  } catch (e) {
                                    toast({
                                      title: 'Erro',
                                      description: getErrorMessage(e),
                                      variant: 'destructive',
                                    })
                                  }
                                }}
                              >
                                Iniciar
                              </Button>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- Financeiro ----------

function AccountFields({
  form,
  setForm,
  errors,
  lockKind,
}: {
  form: AccountFormValues
  setForm: (f: AccountFormValues) => void
  errors: Record<string, string>
  lockKind?: AccountKind
}) {
  const set = (patch: Partial<AccountFormValues>) => setForm({ ...form, ...patch })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="acc-desc">Descrição *</Label>
        <Input
          id="acc-desc"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          className="bg-white/5"
        />
        {errors.description && <p className="mt-1 text-xs text-red-300">{errors.description}</p>}
      </div>
      {!lockKind && (
        <div>
          <Label>Tipo</Label>
          <Select value={form.kind} onValueChange={(v) => set({ kind: v as AccountKind })}>
            <SelectTrigger className="bg-white/5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="receber">A receber</SelectItem>
              <SelectItem value="pagar">A pagar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label htmlFor="acc-amount">Valor (R$) *</Label>
        <Input
          id="acc-amount"
          type="number"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={(e) => set({ amount: e.target.value })}
          className="bg-white/5"
        />
        {errors.amount && <p className="mt-1 text-xs text-red-300">{errors.amount}</p>}
      </div>
      <div>
        <Label htmlFor="acc-due">Vencimento *</Label>
        <Input
          id="acc-due"
          type="date"
          value={form.due_date}
          onChange={(e) => set({ due_date: e.target.value })}
          className="bg-white/5"
        />
        {errors.due_date && <p className="mt-1 text-xs text-red-300">{errors.due_date}</p>}
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="acc-notes">Observações</Label>
        <Textarea
          id="acc-notes"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={2}
          className="bg-white/5"
        />
      </div>
    </div>
  )
}

function validateAccount(form: AccountFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.description.trim()) errors.description = 'Informe a descrição.'
  if (!form.amount || Number(form.amount) <= 0) errors.amount = 'Informe um valor maior que zero.'
  if (!form.due_date) errors.due_date = 'Informe o vencimento.'
  return errors
}

export function ErpFinance() {
  const [accounts, setAccounts] = useState<FinancialAccountRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState<{
    open: boolean
    editing: FinancialAccountRecord | null
    kind: AccountKind
  }>({ open: false, editing: null, kind: 'receber' })
  const [form, setForm] = useState<AccountFormValues>(emptyAccountForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<FinancialAccountRecord | null>(null)
  const [confirmPay, setConfirmPay] = useState<{
    acc: FinancialAccountRecord
    mode: 'total' | 'parcial'
  } | null>(null)

  const clientName = useClientNames()

  const load = async () => setAccounts(await listAccounts())

  useEffect(() => {
    ;(async () => {
      try {
        await load()
      } catch (e) {
        toast({
          title: 'Erro ao carregar contas',
          description: getErrorMessage(e),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const openNew = (kind: AccountKind) => {
    setForm({ ...emptyAccountForm, kind })
    setErrors({})
    setDialog({ open: true, editing: null, kind })
  }

  const openEdit = (a: FinancialAccountRecord) => {
    setForm({
      kind: a.kind as AccountKind,
      description: a.description ?? '',
      amount: a.amount ? String(a.amount) : '',
      due_date: a.due_date ? a.due_date.slice(0, 10) : '',
      notes: a.notes ?? '',
    })
    setErrors({})
    setDialog({ open: true, editing: a, kind: a.kind as AccountKind })
  }

  const save = async () => {
    const errs = validateAccount(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      if (dialog.editing) {
        await updateAccount(dialog.editing.id, form)
        toast({ title: 'Conta atualizada' })
      } else {
        await createAccount(form)
        toast({ title: 'Conta criada' })
      }
      setDialog({ open: false, editing: null, kind: dialog.kind })
      await load()
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const doMark = async (acc: FinancialAccountRecord, mode: 'total' | 'parcial') => {
    const restante = remainingOf(acc)
    if (mode === 'parcial') {
      const valueStr = window.prompt('Valor recebido/pago agora (R$):')
      if (!valueStr) return
      const value = Number(valueStr)
      if (!Number.isFinite(value) || value <= 0) {
        toast({
          title: 'Valor inválido',
          description: 'Informe um valor maior que zero.',
          variant: 'destructive',
        })
        return
      }
      if (value > restante) {
        toast({
          title: 'Valor maior que o saldo',
          description: `O saldo em aberto é ${formatCurrency(restante)}. Use a baixa total.`,
          variant: 'destructive',
        })
        return
      }
      setSaving(true)
      try {
        await markAccountPaid(acc.id, acc, value)
        toast({ title: 'Pagamento parcial registrado' })
        setConfirmPay(null)
        await load()
      } catch (e) {
        toast({
          title: 'Erro ao registrar',
          description: getErrorMessage(e),
          variant: 'destructive',
        })
      } finally {
        setSaving(false)
      }
      return
    }
    setSaving(true)
    try {
      await markAccountPaid(acc.id, acc, restante)
      toast({ title: 'Baixa total registrada' })
      setConfirmPay(null)
      await load()
    } catch (e) {
      toast({ title: 'Erro ao registrar', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteAccount(deleteTarget.id)
      toast({ title: 'Conta excluída' })
      setDeleteTarget(null)
      await load()
    } catch (e) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-300" />
      </div>
    )
  }

  const receber = accounts.filter((a) => a.kind === 'receber')
  const pagar = accounts.filter((a) => a.kind === 'pagar')
  const sum = (rows: FinancialAccountRecord[]) =>
    rows.reduce((acc, a) => acc + (a.paid ? 0 : remainingOf(a)), 0)

  const renderTable = (rows: FinancialAccountRecord[], kind: AccountKind) => (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-400">
            <th className="px-3 py-2">Descrição</th>
            <th className="px-3 py-2">Vencimento</th>
            <th className="px-3 py-2">Valor</th>
            <th className="px-3 py-2">Situação</th>
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const overdue = !a.paid && a.due_date && isOverdue(a.due_date)
            return (
              <tr
                key={a.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
              >
                <td className="px-3 py-2 text-zinc-100">
                  {a.description}
                  {a.client && <p className="text-[11px] text-zinc-500">{clientName(a.client)}</p>}
                </td>
                <td className={`px-3 py-2 ${overdue ? 'text-red-300' : 'text-zinc-300'}`}>
                  {formatDate(a.due_date)}
                </td>
                <td className="px-3 py-2 text-zinc-100">
                  {formatCurrency(a.amount ?? 0)}
                  {!a.paid && (a.paid_amount ?? 0) > 0 && (
                    <p className="text-[11px] text-emerald-300">
                      faltam {formatCurrency(remainingOf(a))}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    className={
                      a.paid
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                        : overdue
                          ? 'border-red-400/30 bg-red-400/10 text-red-300'
                          : 'border-white/15 bg-white/5 text-zinc-300'
                    }
                  >
                    {a.paid
                      ? a.paid_at
                        ? `pago ${formatDate(a.paid_at)}`
                        : 'pago'
                      : overdue
                        ? 'vencido'
                        : 'em aberto'}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {!a.paid && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-emerald-300 hover:bg-emerald-400/10"
                          onClick={() => setConfirmPay({ acc: a, mode: 'total' })}
                        >
                          Baixar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-amber-200 hover:bg-amber-300/10"
                          onClick={() => setConfirmPay({ acc: a, mode: 'parcial' })}
                        >
                          Parcial
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] text-zinc-300 hover:bg-white/10"
                      onClick={() => openEdit(a)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] text-red-300 hover:bg-red-400/10"
                      onClick={() => setDeleteTarget(a)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div>
      <ErpPageHeader
        title="Financeiro"
        subtitle={`A receber em aberto: ${formatCurrency(sum(receber))} · A pagar em aberto: ${formatCurrency(sum(pagar))}`}
        actions={
          <>
            <Button
              onClick={() => openNew('receber')}
              className="bg-emerald-500 text-white hover:bg-emerald-400"
            >
              <Plus className="mr-2 h-4 w-4" /> Nova conta a receber
            </Button>
            <Button
              onClick={() => openNew('pagar')}
              className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            >
              <Plus className="mr-2 h-4 w-4" /> Nova conta a pagar
            </Button>
          </>
        }
      />

      <ErpSectionTitle>Contas a receber</ErpSectionTitle>
      {receber.length === 0 ? (
        <ErpEmptyState
          title="Nenhuma conta a receber"
          description="Geradas pela aprovação de orçamentos ou cadastro manual."
        />
      ) : (
        renderTable(receber, 'receber')
      )}

      <div className="mt-8">
        <ErpSectionTitle>Contas a pagar</ErpSectionTitle>
        {pagar.length === 0 ? (
          <ErpEmptyState
            title="Nenhuma conta a pagar"
            description="Cadastre despesas de materiais, ferragens, transporte e outras."
          />
        ) : (
          renderTable(pagar, 'pagar')
        )}
      </div>

      {/* Dialog conta */}
      <Dialog
        open={dialog.open}
        onOpenChange={(o) => setDialog({ open: o, editing: dialog.editing, kind: dialog.kind })}
      >
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {dialog.editing
                ? 'Editar conta'
                : dialog.kind === 'receber'
                  ? 'Nova conta a receber'
                  : 'Nova conta a pagar'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Valores e vencimentos reais.
            </DialogDescription>
          </DialogHeader>
          <AccountFields
            form={form}
            setForm={setForm}
            errors={errors}
            lockKind={dialog.editing ? dialog.kind : undefined}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ open: false, editing: null, kind: dialog.kind })}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de baixa */}
      <Dialog open={!!confirmPay} onOpenChange={(o) => !o && setConfirmPay(null)}>
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmPay?.mode === 'total' ? 'Baixar conta' : 'Pagamento parcial'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {confirmPay?.mode === 'total'
                ? `Confirmar baixa total de ${formatCurrency(remainingOf(confirmPay?.acc ?? ({} as FinancialAccountRecord)))} — "${confirmPay?.acc.description}"?`
                : `Registrar pagamento parcial em "${confirmPay?.acc.description}". O restante continua em aberto.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmPay(null)}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => confirmPay && doMark(confirmPay.acc, confirmPay.mode)}
              disabled={saving}
              className="bg-emerald-500 text-white hover:bg-emerald-400"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir conta</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Excluir "{deleteTarget?.description}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button onClick={confirmDelete} disabled={saving} variant="destructive">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- Tarefas ----------

function TaskFields({
  form,
  setForm,
  errors,
}: {
  form: TaskFormInput
  setForm: (f: TaskFormInput) => void
  errors: Record<string, string>
}) {
  const set = (patch: Partial<TaskFormInput>) => setForm({ ...form, ...patch })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="task-title">Título *</Label>
        <Input
          id="task-title"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          className="bg-white/5"
        />
        {errors.title && <p className="mt-1 text-xs text-red-300">{errors.title}</p>}
      </div>
      <div>
        <Label htmlFor="task-due">Prazo</Label>
        <Input
          id="task-due"
          type="date"
          value={form.due_date}
          onChange={(e) => set({ due_date: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div>
        <Label htmlFor="task-project">Projeto vinculado</Label>
        <Select
          value={form.project}
          onValueChange={(v) => set({ project: v === '_none' ? '' : v })}
        >
          <SelectTrigger className="bg-white/5">
            <SelectValue placeholder="Nenhum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Nenhum</SelectItem>
            <TaskProjectOptions />
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="task-notes">Descrição</Label>
        <Textarea
          id="task-notes"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          rows={2}
          className="bg-white/5"
        />
      </div>
    </div>
  )
}

function TaskProjectOptions() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(() => {})
  }, [])
  return (
    <>
      {projects.map((p) => (
        <SelectItem key={p.id} value={p.id}>
          {p.title}
        </SelectItem>
      ))}
    </>
  )
}

export function ErpTasks() {
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState<{ open: boolean; editing: TaskRecord | null }>({
    open: false,
    editing: null,
  })
  const [form, setForm] = useState<TaskFormInput>(emptyTaskForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<TaskRecord | null>(null)

  const clientName = useClientNames()
  const projectName = useProjectMap()

  const load = async () => setTasks(await listTasks())

  useEffect(() => {
    ;(async () => {
      try {
        await load()
      } catch (e) {
        toast({
          title: 'Erro ao carregar tarefas',
          description: getErrorMessage(e),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const save = async () => {
    if (!form.title.trim()) {
      setErrors({ title: 'Informe o título.' })
      return
    }
    setSaving(true)
    try {
      if (dialog.editing) {
        await updateTask(dialog.editing.id, form)
        toast({ title: 'Tarefa atualizada' })
      } else {
        await createTask(form)
        toast({ title: 'Tarefa criada' })
      }
      setDialog({ open: false, editing: null })
      await load()
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const toggleDone = async (t: TaskRecord) => {
    try {
      await toggleTaskDone(t.id, !t.done)
      await load()
    } catch (e) {
      toast({ title: 'Erro ao atualizar', description: getErrorMessage(e), variant: 'destructive' })
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteTask(deleteTarget.id)
      toast({ title: 'Tarefa excluída' })
      setDeleteTarget(null)
      await load()
    } catch (e) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-300" />
      </div>
    )
  }

  const open = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  const row = (t: TaskRecord) => (
    <li
      key={t.id}
      className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
    >
      <div className="min-w-0">
        <p className={`truncate ${t.done ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
          {t.title}
        </p>
        <p className="text-[11px] text-zinc-500">
          {t.project
            ? `Projeto: ${projectName(t.project)}`
            : t.client
              ? clientName(t.client)
              : 'sem vínculo'}
          {t.due_date && ` · prazo ${formatDate(t.due_date)}`}
          {t.description ? ` · ${t.description}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[11px] text-zinc-300 hover:bg-white/10"
          onClick={() => {
            setForm({
              title: t.title ?? '',
              description: t.description ?? '',
              due_date: t.due_date ? t.due_date.slice(0, 10) : '',
              priority: t.priority,
              project: t.project ?? '',
            })
            setErrors({})
            setDialog({ open: true, editing: t })
          }}
        >
          Editar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-emerald-300 hover:bg-emerald-400/10"
          onClick={() => toggleDone(t)}
          title={t.done ? 'Reabrir' : 'Concluir'}
        >
          <CheckCircle2 className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-red-300 hover:bg-red-400/10"
          onClick={() => setDeleteTarget(t)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  )

  return (
    <div>
      <ErpPageHeader
        title="Tarefas"
        subtitle="Pendências simples, vinculadas a cliente ou projeto."
        actions={
          <Button
            onClick={() => {
              setForm(emptyTaskForm)
              setErrors({})
              setDialog({ open: true, editing: null })
            }}
            className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
          >
            <Plus className="mr-2 h-4 w-4" /> Nova tarefa
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <ErpSectionTitle>Em aberto ({open.length})</ErpSectionTitle>
          {open.length === 0 ? (
            <ErpEmptyState title="Nada pendente" />
          ) : (
            <ul className="space-y-2">{open.map(row)}</ul>
          )}
        </div>
        <div>
          <ErpSectionTitle>Concluídas ({done.length})</ErpSectionTitle>
          {done.length === 0 ? (
            <ErpEmptyState title="Nenhuma concluída ainda" />
          ) : (
            <ul className="space-y-2">{done.map(row)}</ul>
          )}
        </div>
      </div>

      <Dialog
        open={dialog.open}
        onOpenChange={(o) => setDialog({ open: o, editing: dialog.editing })}
      >
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog.editing ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Título, prazo e vínculo com projeto.
            </DialogDescription>
          </DialogHeader>
          <TaskFields form={form} setForm={setForm} errors={errors} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ open: false, editing: null })}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir tarefa</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Excluir "{deleteTarget?.title}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button onClick={confirmDelete} disabled={saving} variant="destructive">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- mapas de nome ----------

function useClientMap() {
  return useClientNames()
}

function useProjectMap() {
  const [map, setMap] = useState<Record<string, string>>({})
  useEffect(() => {
    listProjects()
      .then((ps) => setMap(Object.fromEntries(ps.map((p) => [p.id, p.title]))))
      .catch(() => {})
  }, [])
  return (id: string) => map[id] ?? '—'
}
