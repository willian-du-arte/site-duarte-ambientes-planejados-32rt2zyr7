// Módulo Orçamentos do Duarte Gestão.
// Fluxo: cliente → oportunidade → orçamento com cálculo de totais, versionamento
// (updateQuote grava snapshot em quote_versions) e proposta imprimível.
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import {
  createQuote,
  deleteQuote,
  listOpportunities,
  listQuoteVersions,
  quoteTotals,
  sendQuote,
  updateQuote,
} from '@/services/erp'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatCurrency, formatDate } from '@/lib/format'
import { ErpPageHeader, ErpEmptyState, ErpStatCard } from './ErpShared'
import { QuoteClientSelect, useClientNames } from './QuoteClientSelect'
import { QuoteProposal, printQuoteProposal } from './QuoteProposal'
import type {
  ClientRecord,
  OpportunityRecord,
  QuoteFormValues,
  QuoteItemInput,
  QuoteRecord,
  QuoteStatus,
} from '@/types/erp'

const QUOTE_STATUS_ORDER: QuoteStatus[] = ['rascunho', 'enviado', 'aprovado', 'perdido']

const QUOTE_STATUS_META: Record<
  QuoteStatus,
  { label: string; className: string }
> = {
  rascunho: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  enviado: { label: 'Enviado', className: 'bg-blue-500/15 text-blue-300' },
  aprovado: { label: 'Aprovado', className: 'bg-emerald-500/15 text-emerald-300' },
  perdido: { label: 'Perdido', className: 'bg-red-500/15 text-red-300' },
}

interface QuoteFormState {
  title: string
  description: string
  client: string
  opportunity: string
  environments: string
  dimensions: string
  materials: string
  items: QuoteItemInput[]
  labor_cost: string
  third_party_cost: string
  transport_cost: string
  assembly_cost: string
  additional_costs: string
  margin_percent: string
  manual_price: string
  warranty: string
  payment_terms: string
  deadline_days: string
  notes: string
}

function emptyQuoteForm(): QuoteFormState {
  return {
    title: '',
    description: '',
    client: '',
    opportunity: 'none',
    environments: '',
    dimensions: '',
    materials: '',
    items: [{ description: '', quantity: '1', unit_cost: '' }],
    labor_cost: '',
    third_party_cost: '',
    transport_cost: '',
    assembly_cost: '',
    additional_costs: '',
    margin_percent: '0',
    manual_price: '',
    warranty: '90 dias contra defeitos de fabricação',
    payment_terms: '50% entrada + 2x',
    deadline_days: '30',
    notes: '',
  }
}

/** Converte o form (strings) no payload numérico esperado pelo serviço. */
function formToPayload(f: QuoteFormState): QuoteFormValues {
  const num = (s: string) => {
    const n = parseFloat(s.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  const items: QuoteItemInput[] = f.items
    .filter((i) => i.description.trim())
    .map((i) => ({
      description: i.description.trim(),
      quantity: num(i.quantity) || 1,
      unit_cost: num(i.unit_cost),
    }))
  return {
    title: f.title.trim(),
    description: f.description.trim() || undefined,
    environments: f.environments.trim() || undefined,
    dimensions: f.dimensions.trim() || undefined,
    materials: f.materials.trim() || undefined,
    items,
    labor_cost: num(f.labor_cost),
    third_party_cost: num(f.third_party_cost),
    transport_cost: num(f.transport_cost),
    assembly_cost: num(f.assembly_cost),
    additional_costs: num(f.additional_costs),
    margin_percent: num(f.margin_percent),
    manual_price: f.manual_price.trim() ? num(f.manual_price) : undefined,
    warranty: f.warranty.trim() || undefined,
    payment_terms: f.payment_terms.trim() || undefined,
    deadline_days: num(f.deadline_days),
    notes: f.notes.trim() || undefined,
  }
}

/** Reabre o form preenchido com um orçamento existente (usado ao editar/gerar nova versão). */
function quoteToForm(q: QuoteRecord): QuoteFormState {
  const s = (v: unknown) => (v === undefined || v === null ? '' : String(v))
  return {
    title: q.title ?? '',
    description: s(q.description),
    client: q.client ?? '',
    opportunity: q.opportunity ?? 'none',
    environments: s(q.environments),
    dimensions: s(q.dimensions),
    materials: s(q.materials),
    items:
      q.items && q.items.length > 0
        ? q.items.map((i) => ({
            description: i.description ?? '',
            quantity: String(i.quantity ?? 1),
            unit_cost: String(i.unit_cost ?? 0),
          }))
        : [{ description: '', quantity: '1', unit_cost: '' }],
    labor_cost: String(q.labor_cost ?? 0),
    third_party_cost: String(q.third_party_cost ?? 0),
    transport_cost: String(q.transport_cost ?? 0),
    assembly_cost: String(q.assembly_cost ?? 0),
    additional_costs: String(q.additional_costs ?? 0),
    margin_percent: String(q.margin_percent ?? 0),
    manual_price: s(q.manual_price),
    warranty: s(q.warranty) || '90 dias contra defeitos de fabricação',
    payment_terms: s(q.payment_terms) || '50% entrada + 2x',
    deadline_days: String(q.deadline_days ?? 30),
    notes: s(q.notes),
  }
}

export default function ErpQuotes() {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<QuoteFormState>(emptyQuoteForm)
  const [editing, setEditing] = useState<QuoteRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')
  const [versionsOpen, setVersionsOpen] = useState<QuoteRecord | null>(null)
  const [versions, setVersions] = useState<QuoteRecord[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [proposalOpen, setProposalOpen] = useState<QuoteRecord | null>(null)
  const clientName = useClientNames()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [qs, ops] = await Promise.all([listQuotes(), listOpportunities()])
      setQuotes(qs)
      setOpportunities(ops)
    } catch (e) {
      setError(getErrorMessage(e))
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

  const liveTotals = useMemo(() => quoteTotals(formToPayload(form)), [form])

  const openNew = () => {
    setEditing(null)
    setForm(emptyQuoteForm())
    setFieldErrors({})
    setGlobalError('')
    setFormOpen(true)
  }

  const openEdit = (q: QuoteRecord, asNewVersion = false) => {
    setEditing(asNewVersion ? null : q)
    setForm(quoteToForm(q))
    setFieldErrors({})
    setGlobalError('')
    setFormOpen(true)
  }

  const setField = (key: keyof QuoteFormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const setItem = (idx: number, key: keyof QuoteItemInput, value: string) =>
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
    const payload = formToPayload(form)
    if (!payload.title) errs.title = 'Informe o título do orçamento.'
    if (!form.client) errs.client = 'Selecione o cliente.'
    if (payload.items.length === 0) errs.items = 'Adicione ao menos um item.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    setGlobalError('')
    try {
      const payload = formToPayload(form)
      const clientId = form.client
      const opportunityId = form.opportunity === 'none' ? undefined : form.opportunity
      if (editing) {
        const before = editing
        await updateQuote(before.id, before, clientId, opportunityId, payload)
      } else {
        await createQuote(clientId, opportunityId, payload)
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
    if (!window.confirm(`Excluir o orçamento "${q.title}"?`)) return
    try {
      await deleteQuote(q.id)
      await load()
    } catch (e) {
      alert(getErrorMessage(e))
    }
  }

  const handleStatus = async (q: QuoteRecord, status: QuoteStatus) => {
    try {
      if (status === 'enviado') await sendQuote(q.id)
      else await updateQuoteStatus(q.id, status)
      await load()
    } catch (e) {
      alert(getErrorMessage(e))
    }
  }

  const openVersions = async (q: QuoteRecord) => {
    setVersionsOpen(q)
    setVersionsLoading(true)
    try {
      setVersions(await listQuoteVersions(q.id))
    } catch {
      setVersions([])
    } finally {
      setVersionsLoading(false)
    }
  }

  const handleApprove = async (q: QuoteRecord) => {
    setApproving(q.id)
    try {
      await approveQuoteAndIntegrate(q)
      await load()
      setApprovedMsg(
        `Orçamento aprovado! Projeto criado com ${'etapas de produção e contas a receber geradas'}.`,
      )
    } catch (e) {
      alert(getErrorMessage(e))
    } finally {
      setApproving(null)
    }
  }

  const [approving, setApproving] = useState<string | null>(null)
  const [approvedMsg, setApprovedMsg] = useState('')

  return (
    <div className="space-y-6">
      <ErpPageHeader
        title="Orçamentos"
        description="Cálculo de custos, margem e preço final — com versionamento e proposta imprimível."
        action={
          <Button onClick={openNew} className="gap-2 bg-amber-500 text-black hover:bg-amber-400">
            <Plus className="h-4 w-4" /> Novo orçamento
          </Button>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ErpStatCard label="Orçamentos" value={String(numbers.total)} />
        <ErpStatCard label="Em aberto" value={String(numbers.open)} />
        <ErpStatCard label="Valor em aberto" value={formatCurrency(numbers.openValue)} />
        <ErpStatCard label="Valor aprovado" value={formatCurrency(numbers.approvedValue)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {['all', ...QUOTE_STATUS_ORDER].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === s
                ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? 'Todos' : QUOTE_STATUS_META[s as QuoteStatus].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando orçamentos…
        </div>
      ) : filtered.length === 0 ? (
        <ErpEmptyState
          icon={FileText}
          title="Nenhum orçamento"
          description="Crie o primeiro orçamento a partir de uma oportunidade do CRM."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <div
              key={q.id}
              className="rounded-xl border border-border bg-card p-4 transition hover:border-amber-500/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-foreground">{q.title}</h3>
                    <Badge className={QUOTE_STATUS_META[q.status].className}>
                      {QUOTE_STATUS_META[q.status].label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">v{q.version ?? 1}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cliente: {clientName(q.client ?? '')}
                    {q.opportunity ? ` · Oportunidade vinculada` : ''}
                    {q.created ? ` · ${formatDate(q.created.slice(0, 10))}` : ''}
                  </p>
                  {(q.environments || q.materials) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[q.environments, q.materials].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-serif text-lg font-bold text-amber-300">
                    {formatCurrency(q.final_price ?? 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    custo {formatCurrency(q.total_cost ?? 0)}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(q)}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(q, true)}
                  title="Reabrir os dados deste orçamento e salvar como nova versão"
                >
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Nova versão
                </Button>
                {q.status === 'rascunho' && (
                  <Button size="sm" variant="outline" onClick={() => handleStatus(q, 'enviado')}>
                    Marcar enviado
                  </Button>
                )}
                {q.status !== 'aprovado' && q.status !== 'perdido' && (
                  <Button
                    size="sm"
                    onClick={() => handleApprove(q)}
                    disabled={approving === q.id}
                    className="bg-emerald-600 hover:bg-emerald-500"
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
                  <Button size="sm" variant="outline" onClick={() => handleStatus(q, 'perdido')}>
                    Perdido
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setProposalOpen(q)}
                  title="Ver proposta imprimível"
                >
                  <Printer className="mr-1 h-3.5 w-3.5" /> Proposta
                </Button>
                <Button size="sm" variant="outline" onClick={() => openVersions(q)}>
                  Versões
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(q)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulário de orçamento */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editing
                ? `Editar orçamento — v${editing.version ?? 1}`
                : editing === null && form.items.length > 0 && !formOpen
                  ? ''
                  : 'Novo orçamento'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Salvar alterações cria uma nova versão (v' +
                  ((editing.version ?? 1) + 1) +
                  ') com snapshot em quote_versions.'
                : 'Preencha os itens e custos — o preço final é calculado pela margem.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {globalError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
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
                  placeholder="Ex.: Cozinha completa — MDF branco"
                />
                {fieldErrors.title && (
                  <p className="text-xs text-red-300">{fieldErrors.title}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <QuoteClientSelect
                  value={form.client}
                  onChange={(id) => setField('client', id)}
                  error={fieldErrors.client}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Oportunidade</Label>
                <Select
                  value={form.opportunity}
                  onValueChange={(v) => setField('opportunity', v)}
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
                  placeholder="Ex.: Cozinha + área de serviço"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="q-dim">Dimensões</Label>
                <Input
                  id="q-dim"
                  value={form.dimensions}
                  onChange={(e) => setField('dimensions', e.target.value)}
                  placeholder="Ex.: 4,2 m × 3,0 m"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="q-mat">Materiais</Label>
                <Input
                  id="q-mat"
                  value={form.materials}
                  onChange={(e) => setField('materials', e.v ? e.target.value : e.target.value)}
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
                      placeholder="Qtd"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      channeled
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(e) => setItem(idx, 'unit_cost', e.target.value)}
                      placeholder="Custo un."
                    />
                  </ items>
                  <div className="col-span-1 flex items-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(idx)}
                      disabled={form.items.length === 1}
                      className="text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Custos e margem */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
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
                    />
                  </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="q-manual">Preço manual (R$) — opcional</Label>
                  <Input
                    id="q-manual"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.manual_price}
                    onChange={(e) => setField('manual_price', e.target.value)}
                    placeholder="Deixe vazio para usar o calculado"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q-deadline">Prazo de entrega (dias)</Label>
                  <Input
                    id="q-deadline"
                    type="number"
                    min="0"
                    value={form.deadline_days}
                    onChange={(e) => setField('deadline_days', e.target.value)}
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
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q-terms">Condições de pagamento</Label>
                  <Input
                    id="q-terms"
                    value={form.payment_terms}
                    onChange={(e) => setField('payment_terms', e.target.value)}
                    placeholder="Ex.: 50% entrada + 2x"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-background p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo dos itens</span>
                  <span>{formatCurrency(liveTotals.itemsCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo total</span>
                  <span>{formatCurrency(liveTotals.totalCost)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold text-amber-300">
                  <span>Preço final</span>
                  <span>{formatCurrency(liveTotals.finalPrice)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="q-notes">Observações internas</Label>
              <Textarea
                id="q-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1 h-4 w-4" />
              )}
              {editing ? 'Salvar (nova versão)' : 'Criar orçamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de versões */}
      <Dialog open={!!versionsOpen} onOpenChange={(open) => !open && setVersionsOpen(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Versões — {versionsOpen?.title}</DialogTitle>
            <DialogDescription>
              Histórico gravado em quote_versions a cada salvamento após a criação.
            </DialogDescription>
          </DialogHeader>
          {versionsLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : versions.length === 0 ? ( 
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma versão anterior (o orçamento ainda não foi editado).
            </p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>
                    v{v.version ?? 1} — {formatDate(v.created?.slice(0, 10) ?? '')}
                  </span>
                  <span className="font-medium text-amber-300">
                    {formatCurrency(v.final_price ?? 0)}
                    {v.items?.length ? ` · ${v.items.length} itens` : ''}
                  </span>
                </div
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Proposta imprimível */}
      {proposalOpen && (
        <QuoteProposal
          quote={proposalOpen}
          clientName={clientName(proposalOpen.client ?? '')}
        />
      )}
    </div>
  )
}

// helper local para impressão (evita importar utilitário extra)
function printProposal(quote: QuoteRecord, clientName: string) {
  printQuoteProposal(quote, clientName)
}
