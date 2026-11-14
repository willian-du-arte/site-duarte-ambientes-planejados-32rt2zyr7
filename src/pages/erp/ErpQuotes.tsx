// Módulo Orçamentos do Duarte Gestão.
// Fluxo: cliente → oportunidade → orçamento com cálculo automático (quoteTotals),
// versionamento (updateQuote incrementa version + snapshot em quote_versions)
// e proposta imprimível (QuoteProposal). Aprovação gera projeto + etapas + contas.
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { CheckCircle2, FileText, Loader2, Plus, Printer, RefreshCw, Trash2, X } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  createQuote,
  deleteQuote,
  listOpportunities,
  listQuotes,
  listQuoteVersions,
  quoteTotals,
  updateQuote,
  type QuoteVersionSummary,
} from '@/services/erp'
import { approveQuoteAndIntegrate } from '@/services/quote-approval'
import { ErpValidationError, getErrorMessage } from '@/lib/pocketbase/errors'
import { formatCurrency, formatDate } from '@/lib/format'
import { ErpEmptyState, ErpPageHeader, ErpStatCard } from './ErpShared'
import { QuoteClientSelect, useClientNames } from './QuoteClientSelect'
import { QuoteProposal, printQuoteProposal } from './QuoteProposal'
import type {
  OpportunityRecord,
  QuoteFormValues,
  QuoteItem,
  QuoteRecord,
  QuoteStatus,
} from '@/types/erp'

const QUOTE_STATUS_ORDER: QuoteStatus[] = ['rascunho', 'enviado', 'aprovado', 'perdido']

const QUOTE_STATUS_META: Record<QuoteStatus, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'border-white/15 bg-white/5 text-zinc-300' },
  enviado: { label: 'Enviado', className: 'border-blue-400/30 bg-blue-400/10 text-blue-300' },
  aprovado: {
    label: 'Aprovado',
    className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  },
  perdido: { label: 'Perdido', className: 'border-red-400/30 bg-red-400/10 text-red-300' },
}

type QuoteFormState = Omit<QuoteFormValues, 'items'> & {
  // vínculos tratados fora do QuoteFormValues (passados separadamente ao serviço)
  client: string
  opportunity: string
  // itens editáveis como strings (campos de texto do formulário)
  items: { description: string; quantity: string; unit_cost: string }[]
}

const emptyForm: QuoteFormState = {
  title: '',
  description: '',
  environments: '',
  dimensions: '',
  materials: '',
  labor_cost: '',
  third_party_cost: '',
  transport_cost: '',
  assembly_cost: '',
  additional_costs: '',
  margin_percent: '',
  manual_price: false,
  manual_final_price: '',
  warranty: '90 dias contra defeitos de fabricação',
  payment_terms: '50% entrada + 2x',
  deadline_days: '',
  status: 'rascunho',
  client: '',
  opportunity: '',
  items: [{ description: '', quantity: '1', unit_cost: '' }],
}

function recordToForm(q: QuoteRecord): QuoteFormState {
  const s = (v: unknown) => (v === undefined || v === null ? '' : String(v))
  const items = (q.items ?? []).map((i) => ({
    description: i.description ?? '',
    quantity: s(i.quantity ?? 1),
    unit_cost: s(i.unit_cost ?? 0),
  }))
  return {
    title: q.title ?? '',
    description: s(q.description),
    environments: s(q.environments),
    dimensions: s(q.dimensions),
    materials: s(q.materials),
    labor_cost: s(q.labor_cost ?? 0),
    third_party_cost: s(q.third_party_cost ?? 0),
    transport_cost: s(q.transport_cost ?? 0),
    assembly_cost: s(q.assembly_cost ?? 0),
    additional_costs: s(q.additional_costs ?? 0),
    margin_percent: s(q.margin_percent ?? 0),
    manual_price: q.manual_price ?? false,
    manual_final_price: q.manual_price ? s(q.final_price ?? '') : '',
    warranty: s(q.warranty) || emptyForm.warranty,
    payment_terms: s(q.payment_terms) || emptyForm.payment_terms,
    deadline_days: s(q.deadline_days ?? ''),
    status: q.status,
    client: q.client ?? '',
    opportunity: q.opportunity ?? '',
    items: items.length > 0 ? items : [{ description: '', quantity: '1', unit_cost: '' }],
  }
}

function formToValues(f: QuoteFormState): QuoteFormValues {
  return {
    ...f,
    items: f.items
      .filter((i) => i.description.trim() !== '')
      .map(
        (i): QuoteItem => ({
          description: i.description.trim(),
          quantity: Number(i.quantity.replace(',', '.')) || 1,
          unit_cost: Number(i.unit_cost.replace(',', '.')) || 0,
        }),
      ),
  }
}

export default function ErpQuotes() {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteStatus>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<QuoteFormState>(emptyForm)
  const [editing, setEditing] = useState<QuoteRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')
  const [versionsFor, setVersionsFor] = useState<QuoteRecord | null>(null)
  const [versions, setVersions] = useState<QuoteVersionSummary[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [proposalFor, setProposalFor] = useState<QuoteRecord | null>(null)
  const clientName = useClientNames()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [qs, ops] = await Promise.all([listQuotes(), listOpportunities()])
      setQuotes(qs)
      setOpportunities(ops)
    } catch (e) {
      toast({ title: 'Erro ao carregar orçamentos', description: getErrorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(
    () => (statusFilter === 'all' ? quotes : quotes.filter((q) => q.status === statusFilter)),
    [quotes, statusFilter],
  )

  const numbers = useMemo(() => {
    const open = quotes.filter((q) => q.status === 'rascunho' || q.status === 'enviado')
    const approved = quotes.filter((q) => q.status === 'aprovado')
    const sum = (arr: QuoteRecord[]) => arr.reduce((acc, q) => acc + (q.final_price ?? 0), 0)
    return {
      total: quotes.length,
      open: open.length,
      openValue: sum(open),
      approvedValue: sum(approved),
    }
  }, [quotes])

  const liveTotals = useMemo(() => quoteTotals(formToValues(form)), [form])

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setFieldErrors({})
    setGlobalError('')
    setFormOpen(true)
  }

  const openEdit = (q: QuoteRecord, asNewVersion = false) => {
    setEditing(asNewVersion ? null : q)
    setForm(recordToForm(q))
    setFieldErrors({})
    setGlobalError('')
    setFormOpen(true)
  }

  const setField = <K extends keyof QuoteFormState>(key: K, value: QuoteFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const setItem = (idx: number, key: 'description' | 'quantity' | 'unit_cost', value: string) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((i, k) => (k === idx ? { ...i, [key]: value } : i)),
    }))

  const addItem = () =>
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: '1', unit_cost: '' }],
    }))

  const removeItem = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, k) => k !== idx) : prev.items,
    }))

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = 'Informe o título do orçamento.'
    if (!form.client) errs.client = 'Selecione o cliente.'
    if (form.items.filter((i) => i.description.trim() !== '').length === 0)
      errs.items = 'Adicione ao menos um item com descrição.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    setGlobalError('')
    try {
      const values = formToValues(form)
      const clientId = form.client
      const opportunityId = form.opportunity || undefined
      if (editing) {
        await updateQuote(editing.id, editing, clientId, opportunityId, values)
        toast({
          title: 'Orçamento salvo',
          description: 'Nova versão registrada em quote_versions.',
        })
      } else {
        await createQuote(clientId, opportunityId, values)
        toast({ title: 'Orçamento criado' })
      }
      setFormOpen(false)
      await load()
    } catch (e) {
      if (e instanceof ErpValidationError) {
        setFieldErrors(e.fields)
        setGlobalError('Corrija os campos destacados.')
      } else {
        setGlobalError(getErrorMessage(e))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (q: QuoteRecord) => {
    if (!window.confirm(`Excluir o orçamento "${q.title}"? Esta ação não pode ser desfeita.`))
      return
    try {
      await deleteQuote(q.id)
      toast({ title: 'Orçamento excluído' })
      await load()
    } catch (e) {
      toast({
        title: 'Erro ao excluir',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    }
  }

  const handleStatus = async (q: QuoteRecord, status: QuoteStatus) => {
    try {
      const values: QuoteFormValues = {
        title: q.title,
        description: q.description ?? '',
        environments: q.environments ?? '',
        dimensions: q.dimensions ?? '',
        materials: q.materials ?? '',
        items: q.items ?? [],
        labor_cost: String(q.labor_cost ?? 0),
        third_party_cost: String(q.third_party_cost ?? 0),
        transport_cost: String(q.transport_cost ?? 0),
        assembly_cost: String(q.assembly_cost ?? 0),
        additional_costs: String(q.additional_costs ?? 0),
        margin_percent: String(q.margin_percent ?? 0),
        manual_price: q.manual_price ?? false,
        manual_final_price: q.manual_price ? String(q.final_price ?? '') : '',
        warranty: q.warranty ?? '',
        payment_terms: q.payment_terms ?? '',
        deadline_days: q.deadline_days ? String(q.deadline_days) : '',
        status,
      }
      // mantém cliente e oportunidade atuais; grava nova versão com o novo status
      await updateQuote(q.id, q, q.client, q.opportunity, values)
      toast({ title: 'Situação atualizada' })
      await load()
    } catch (e) {
      toast({
        title: 'Erro ao atualizar situação',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    }
  }

  const handleApprove = async (q: QuoteRecord) => {
    if (
      !window.confirm(
        `Aprovar o orçamento "${q.title}"? Serão criados o projeto, as etapas de produção e as contas a receber.`,
      )
    )
      return
    setApproving(q.id)
    try {
      const result = await approveQuoteAndIntegrate(q)
      toast({
        title: 'Orçamento aprovado',
        description: `Projeto criado com ${result.stages} etapas e ${result.receivables} conta(s) a receber.`,
      })
      await load()
    } catch (e) {
      toast({ title: 'Erro ao aprovar', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setApproving(null)
    }
  }

  const openVersions = async (q: QuoteRecord) => {
    setVersionsFor(q)
    setVersionsLoading(true)
    try {
      setVersions(await listQuoteVersions(q.id))
    } catch {
      setVersions([])
    } finally {
      setVersionsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <ErpPageHeader
        title="Orçamentos"
        subtitle="Cálculo de custos, margem e preço final — com versionamento e proposta imprimível."
        actions={
          <Button onClick={openNew} className="bg-amber-300 text-zinc-900 hover:bg-amber-200">
            <Plus className="mr-2 h-4 w-4" /> Novo orçamento
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ErpStatCard label="Orçamentos" value={String(numbers.total)} />
        <ErpStatCard label="Em aberto" value={String(numbers.open)} />
        <ErpStatCard
          label="Valor em aberto"
          value={formatCurrency(numbers.openValue)}
          tone="warning"
        />
        <ErpStatCard
          label="Valor aprovado"
          value={formatCurrency(numbers.approvedValue)}
          tone="positive"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['all', ...QUOTE_STATUS_ORDER] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === s
                ? 'border-amber-300/60 bg-amber-300/15 text-amber-200'
                : 'border-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {s === 'all' ? 'Todos' : QUOTE_STATUS_META[s as QuoteStatus].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando orçamentos…
        </div>
      ) : filtered.length === 0 ? (
        <ErpEmptyState
          title="Nenhum orçamento"
          description="Crie o primeiro orçamento a partir de uma oportunidade do CRM."
          icon={<FileText className="h-8 w-8" />}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const overdue = q.status === 'enviado' && q.created && isQuoteOld(q.created)
            return (
              <div
                key={q.id}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-4 transition hover:border-amber-300/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-medium text-zinc-100">{q.title}</h3>
                      <Badge className={QUOTE_STATUS_META[q.status].className}>
                        {QUOTE_STATUS_META[q.status].label}
                      </Badge>
                      <span className="text-xs text-zinc-500">v{q.version ?? 1}</span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">
                      Cliente: {clientName(q.client ?? '')}
                      {q.opportunity ? ' · oportunidade vinculada' : ''}
                      {q.created ? ` · ${formatDate(q.created.slice(0, 10))}` : ''}
                      {overdue ? ' · aguardando resposta' : ''}
                    </p>
                    {(q.environments || q.materials) && (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {[q.environments, q.materials].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-lg font-bold text-amber-200">
                      {formatCurrency(q.final_price ?? 0)}
                    </div>
                    <div className="text-xs text-zinc-500">
                      custo {formatCurrency(q.total_cost ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-white/15 text-zinc-200 hover:bg-white/10"
                    onClick={() => openEdit(q)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-white/15 text-zinc-200 hover:bg-white/10"
                    onClick={() => openEdit(q, true)}
                    title="Reabrir os dados deste orçamento e salvar como nova versão"
                  >
                    <RefreshCw className="mr-1 h-3.5 w-3.5" /> Nova versão
                  </Button>
                  {q.status === 'rascunho' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-white/15 text-zinc-200 hover:bg-white/10"
                      onClick={() => handleStatus(q, 'enviado')}
                    >
                      Marcar enviado
                    </Button>
                  )}
                  {q.status !== 'aprovado' && q.status !== 'perdido' && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(q)}
                      disabled={approving === q.id}
                      className="h-8 bg-emerald-500 text-white hover:bg-emerald-400"
                    >
                      {approving === q.id ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      )}
                      Aprovar
                    </Button>
                  )}
                  {q.status !== 'perdido' && q.status !== 'aprovado' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-white/15 text-zinc-200 hover:bg-white/10"
                      onClick={() => handleStatus(q, 'perdido')}
                    >
                      Perdido
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-white/15 text-zinc-200 hover:bg-white/10"
                    onClick={() => printQuoteProposal(q, clientName(q.client ?? ''))}
                    title="Imprimir proposta"
                  >
                    <Printer className="mr-1 h-3.5 w-3.5" /> Proposta
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-white/15 text-zinc-200 hover:bg-white/10"
                    onClick={() => openVersions(q)}
                  >
                    Versões
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-red-300 hover:bg-red-400/10"
                    onClick={() => handleDelete(q)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulário de orçamento */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Editar orçamento — v${editing.version ?? 1}` : 'Novo orçamento'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editing
                ? `Salvar cria a versão v${(editing.version ?? 1) + 1} com snapshot em quote_versions.`
                : 'Preencha os itens e custos — o preço final é calculado pela margem.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {globalError && (
              <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
                {globalError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="q-title">Título *</Label>
                <Input
                  id="q-title"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  className="bg-white/5"
                  placeholder="Ex.: Cozinha completa — MDF branco"
                />
                {fieldErrors.title && <p className="text-xs text-red-300">{fieldErrors.title}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <QuoteClientSelect
                  value={form.client ?? ''}
                  onChange={(id) => setField('client', id)}
                  error={fieldErrors.client}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Oportunidade</Label>
                <Select
                  value={form.opportunity || 'none'}
                  onValueChange={(v) => setField('opportunity', v === 'none' ? '' : v)}
                >
                  <SelectTrigger className="bg-white/5">
                    <SelectValue placeholder="Sem vínculo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {opportunities.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="q-env">Ambientes</Label>
                <Input
                  id="q-env"
                  value={form.environments}
                  onChange={(e) => setField('environments', e.target.value)}
                  className="bg-white/5"
                  placeholder="Ex.: Cozinha + área de serviço"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="q-dim">Dimensões</Label>
                <Input
                  id="q-dim"
                  value={form.dimensions}
                  onChange={(e) => setField('dimensions', e.target.value)}
                  className="bg-white/5"
                  placeholder="Ex.: 4,2 m × 3,0 m"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="q-mat">Materiais</Label>
                <Input
                  id="q-mat"
                  value={form.materials}
                  onChange={(e) => setField('materials', e.target.value)}
                  className="bg-white/5"
                  placeholder="Ex.: MDF branco 18mm, corrediças Blum"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="q-desc">Descrição</Label>
                <Textarea
                  id="q-desc"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  className="bg-white/5"
                />
              </div>
            </div>

            {/* Itens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens do orçamento *</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Item
                </Button>
              </div>
              {fieldErrors.items && <p className="text-xs text-red-300">{fieldErrors.items}</p>}
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <div className="col-span-7">
                    <Input
                      value={item.description}
                      onChange={(e) => setItem(idx, 'description', e.target.value)}
                      className="bg-white/5"
                      placeholder="Descrição do item"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => setItem(idx, 'quantity', e.target.value)}
                      className="bg-white/5"
                      placeholder="Qtd"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(e) => setItem(idx, 'unit_cost', e.target.value)}
                      className="bg-white/5"
                      placeholder="Custo un. (R$)"
                    />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(idx)}
                      disabled={form.items.length === 1}
                      className="text-red-300 hover:bg-red-400/10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Custos e margem */}
            <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <Label>Custos e margem</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ['labor_cost', 'Mão de obra (R$)'],
                    ['third_party_cost', 'Terceiros (R$)'],
                    ['transport_cost', 'Transporte (R$)'],
                    ['assembly_cost', 'Montagem (R$)'],
                    ['additional_costs', 'Custos adicionais (R$)'],
                    ['margin_percent', 'Margem (%)'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`q-${key}`}>{label}</Label>
                    <Input
                      id={`q-${key}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={form[key]}
                      onChange={(e) => setField(key, e.target.value)}
                      className="bg-white/5"
                    />
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="q-manual-price">Preço manual (R$) — opcional</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="q-manual-price"
                      checked={form.manual_price}
                      onCheckedChange={(v) => setField('manual_price', v === true)}
                    />
                    <Label htmlFor="q-manual-price" className="text-xs font-normal text-zinc-400">
                      Definir preço final manualmente
                    </Label>
                  </div>
                  {form.manual_price && (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.manual_final_price}
                      onChange={(e) => setField('manual_final_price', e.target.value)}
                      className="bg-white/5"
                      placeholder="Preço final (R$)"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q-deadline">Prazo de entrega (dias)</Label>
                  <Input
                    id="q-deadline"
                    type="number"
                    min="0"
                    value={form.deadline_days}
                    onChange={(e) => setField('deadline_days', e.target.value)}
                    className="bg-white/5"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="q-warranty">Garantia</Label>
                  <Input
                    id="q-warranty"
                    value={form.warranty}
                    onChange={(e) => setField('warranty', e.target.value)}
                    className="bg-white/5"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q-terms">Condições de pagamento</Label>
                  <Input
                    id="q-terms"
                    value={form.payment_terms}
                    onChange={(e) => setField('payment_terms', e.target.value)}
                    className="bg-white/5"
                    placeholder="Ex.: 50% entrada + 2x"
                  />
                </div>
              </div>

              <div className="rounded-md bg-white/[0.04] p-3 text-sm">
                <div className="flex justify-between text-zinc-300">
                  <span>Custo dos itens</span>
                  <span>{formatCurrency(liveTotals.itemsTotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>Custo total</span>
                  <span>{formatCurrency(liveTotals.totalCost)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-white/10 pt-1 font-semibold text-amber-200">
                  <span>Preço final</span>
                  <span>{formatCurrency(liveTotals.finalPrice)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Salvar (nova versão)' : 'Criar orçamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de versões */}
      <Dialog open={!!versionsFor} onOpenChange={(o) => !o && setVersionsFor(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Versões — {versionsFor?.title}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Histórico gravado em quote_versions a cada salvamento após a criação.
            </DialogDescription>
          </DialogHeader>
          {versionsLoading ? (
            <div className="flex items-center justify-center py-8 text-zinc-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : versions.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">
              Nenhuma versão anterior (o orçamento ainda não foi editado).
            </p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm"
                >
                  <span className="text-zinc-200">
                    v{v.version} — {formatDate(v.created.slice(0, 10))}
                  </span>
                  <span className="text-xs text-zinc-500">{v.note ?? ''}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pré-visualização da proposta */}
      <Dialog open={!!proposalFor} onOpenChange={(o) => !o && setProposalFor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Pré-visualização da proposta</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Use “Imprimir proposta” na lista para gerar o PDF no formato A4.
            </DialogDescription>
          </DialogHeader>
          {proposalFor && (
            <div className="overflow-x-auto">
              <QuoteProposal
                quote={proposalFor}
                clientName={clientName(proposalFor.client ?? '')}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Orçamento enviado há mais de 15 dias e sem resposta — aviso simples na listagem. */
function isQuoteOld(created: string): boolean {
  const t = Date.parse(created)
  if (Number.isNaN(t)) return false
  return Date.now() - t > 15 * 86400000
}
