// Módulo de Orçamentos — precificação calculada, versões, aprovação integrada
// (projeto + etapas + contas a receber) e proposta em PDF via impressão do navegador.
import { useEffect, useRef, useState } from 'react'
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
import { QuoteProposal } from './QuoteProposal'
import { QuoteClientSelect, useClientNames } from './QuoteClientSelect'
import {
  createQuote,
  createQuoteVersion,
  deleteQuote,
  listClients,
  listOpportunities,
  listQuotes,
  listQuoteVersions,
  updateQuote,
} from '@/services/erp'
import { approveQuoteAndIntegrate } from '@/services/quote-approval'
import { ErpValidationError, getErrorMessage } from '@/lib/pocketbase/errors'
import { formatCurrency, formatDate } from '@/lib/format'
import { computeQuoteTotals } from '@/lib/erp-terms'
import {
  emptyQuoteForm,
  PAYMENT_TERMS_OPTIONS,
  type PaymentTerms,
  type QuoteFormValues,
  type QuoteRecord,
} from '@/types/erp'
import { CheckCircle2, FileText, History, Loader2, Plus, Printer, Trash2 } from 'lucide-react'

function QuoteFields({
  form,
  setForm,
  errors,
}: {
  form: QuoteFormValues
  setForm: (f: QuoteFormValues) => void
  errors: Record<string, string>
}) {
  const set = (patch: Partial<QuoteFormValues>) => setForm({ ...form, ...patch })
  const n = (v: string) => (v === '' ? 0 : Number(v))
  const num = (v: number) => (v === 0 ? '' : String(v))

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="quote-title">Descrição / título *</Label>
        <Input
          id="quote-title"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Ex.: Cozinha completa — MDF branco"
          className="bg-white/5"
        />
        {errors.title && <p className="mt-1 text-xs text-red-300">{errors.title}</p>}
      </div>
      <div>
        <Label htmlFor="quote-deadline">Prazo de entrega (dias)</Label>
        <Input
          id="quote-deadline"
          type="number"
          min="0"
          value={form.deadline_days}
          onChange={(e) => set({ deadline_days: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div>
        <Label>Condições de pagamento</Label>
        <Select
          value={form.payment_terms}
          onValueChange={(v) => set({ payment_terms: v as PaymentTerms })}
        >
          <SelectTrigger className="bg-white/5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_TERMS_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="quote-ambientes">Ambientes (um por linha)</Label>
        <Textarea
          id="quote-ambientes"
          value={form.ambientes}
          onChange={(e) => set({ ambientes: e.target.value })}
          rows={2}
          placeholder={'Cozinha\nDormitório'}
          className="bg-white/5"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="quote-dimensions">Dimensões</Label>
        <Textarea
          id="quote-dimensions"
          value={form.dimensions}
          onChange={(e) => set({ dimensions: e.target.value })}
          rows={2}
          className="bg-white/5"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="quote-materials">Materiais e quantidades</Label>
        <Textarea
          id="quote-materials"
          value={form.materials}
          onChange={(e) => set({ materials: e.target.value })}
          rows={2}
          placeholder="MDF 18mm branco — 12 chapas"
          className="bg-white/5"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="quote-hardware">Ferragens</Label>
        <Textarea
          id="quote-hardware"
          value={form.hardware}
          onChange={(e) => set({ hardware: e.target.value })}
          rows={2}
          className="bg-white/5"
        />
      </div>

      <div>
        <Label htmlFor="quote-materials-cost">Custo de materiais (R$)</Label>
        <Input
          id="quote-materials-cost"
          type="number"
          min="0"
          step="0.01"
          value={num(form.materials_cost)}
          onChange={(e) => set({ materials_cost: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div>
        <Label htmlFor="quote-hardware-cost">Custo de ferragens (R$)</Label>
        <Input
          id="quote-hardware-cost"
          type="number"
          min="0"
          step="0.01"
          value={num(form.hardware_cost)}
          onChange={(e) => set({ hardware_cost: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div>
        <Label htmlFor="quote-thirdparty-cost">Serviços terceirizados (R$)</Label>
        <Input
          id="quote-thirdparty-cost"
          type="number"
          min="0"
          step="0.01"
          value={num(form.thirdparty_cost)}
          onChange={(e) => set({ thirdparty_cost: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div>
        <Label htmlFor="quote-labor-cost">Mão de obra (R$)</Label>
        <Input
          id="quote-labor-cost"
          type="number"
          min="0"
          step="0.01"
          value={num(form.labor_cost)}
          onChange={(e) => set({ labor_cost: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div>
        <Label htmlFor="quote-transport-cost">Transporte e montagem (R$)</Label>
        <Input
          id="quote-transport-cost"
          type="number"
          min="0"
          step="0.01"
          value={num(form.transport_cost)}
          onChange={(e) => set({ transport_cost: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div>
        <Label htmlFor="quote-extra-cost">Custos adicionais (R$)</Label>
        <Input
          id="quote-extra-cost"
          type="number"
          min="0"
          step="0.01"
          value={num(form.extra_cost)}
          onChange={(e) => set({ extra_cost: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div>
        <Label htmlFor="quote-margin">Margem de lucro (%)</Label>
        <Input
          id="quote-margin"
          type="number"
          min="0"
          step="0.1"
          value={num(form.margin_percent)}
          onChange={(e) => set({ margin_percent: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div>
        <Label htmlFor="quote-price-adjust">Ajuste manual do preço final (R$)</Label>
        <Input
          id="quote-price-adjust"
          type="number"
          min="0"
          step="0.01"
          value={num(form.price_adjustment)}
          onChange={(e) => set({ price_adjustment: e.target.value })}
          className="bg-white/5"
        />
      </div>

      <div className="sm:col-span-2 rounded-md border border-amber-300/30 bg-amber-300/5 p-3">
        {(() => {
          const t = computeQuoteTotals(
            n(form.materials_cost),
            n(form.hardware_cost),
            n(form.thirdparty_cost),
            n(form.labor_cost),
            n(form.transport_cost),
            n(form.extra_cost),
            n(form.margin_percent),
            form.price_adjustment === '' ? null : n(form.price_adjustment),
          )
          return (
            <div className="space-y-1 text-sm">
              <p className="flex justify-between text-zinc-300">
                <span>Custo total</span>
                <span>{formatCurrency(t.total_cost)}</span>
              </p>
              <p className="flex justify-between text-zinc-300">
                <span>Preço calculado (custo + margem)</span>
                <span>{formatCurrency(t.calculated_price)}</span>
              </p>
              <p className="flex justify-between font-medium text-amber-200">
                <span>Preço final</span>
                <span>{formatCurrency(t.final_price)}</span>
              </p>
              {form.price_adjustment !== '' && (
                <p className="text-[11px] text-zinc-400">
                  Ajuste manual aplicado sobre o preço calculado.
                </p>
              )}
            </div>
          )
        })()}
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="quote-notes">Observações / garantia</Label>
        <Textarea
          id="quote-notes"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={2}
          className="bg-white/5"
        />
      </div>
    </div>
  )
}

function validateQuote(form: QuoteFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.title.trim()) errors.title = 'Informe a descrição do orçamento.'
  return errors
}

export default function ErpQuotes() {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([])
  const [versions, setVersions] = useState<
    Record<string, Awaited<ReturnType<typeof listQuoteVersions>>>
  >({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState<{
    open: boolean
    editing: QuoteRecord | null
    clientId: string
    clientName: string
    versionOf?: QuoteRecord
  }>({ open: false, editing: null, clientId: '', clientName: '' })
  const [form, setForm] = useState<QuoteFormValues>(emptyQuoteForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<QuoteRecord | null>(null)
  const [approveTarget, setApproveTarget] = useState<QuoteRecord | null>(null)
  const [printTarget, setPrintTarget] = useState<QuoteRecord | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const load = async () => setQuotes(await listQuotes())

  useEffect(() => {
    ;(async () => {
      try {
        await load()
      } catch (e) {
        toast({
          title: 'Erro ao carregar orçamentos',
          description: getErrorMessage(e),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const clientName = useClientNames()

  const openNew = (client?: { id: string; name: string }, versionOf?: QuoteRecord) => {
    if (versionOf) {
      setForm({
        ...emptyQuoteForm,
        title: versionOf.title,
        client: versionOf.client,
        ambientes: versionOf.ambientes ?? '',
        dimensions: versionOf.dimensions ?? '',
        materials: versionOf.materials ?? '',
        hardware: versionOf.hardware ?? '',
        materials_cost: versionOf.materials_cost ? String(versionOf.materials_cost) : '',
        hardware_cost: versionOf.hardware_cost ? String(versionOf.hardware_cost) : '',
        thirdparty_cost: versionOf.thirdparty_cost ? String(versionOf.thirdparty_cost) : '',
        labor_cost: versionOf.labor_cost ? String(versionOf.labor_cost) : '',
        transport_cost: versionOf.transport_cost ? String(versionOf.transport_cost) : '',
        extra_cost: versionOf.extra_cost ? String(versionOf.extra_cost) : '',
        margin_percent: versionOf.margin_percent ? String(versionOf.margin_percent) : '',
        price_adjustment: versionOf.price_adjustment ? String(versionOf.price_adjustment) : '',
        payment_terms: (versionOf.payment_terms as QuoteFormValues['payment_terms']) || 'a_vista',
        deadline_days: versionOf.deadline_days ? String(versionOf.deadline_days) : '',
        notes: versionOf.notes ?? '',
      })
      setDialog({
        open: true,
        editing: null,
        clientId: versionOf.client,
        clientName: clientName(versionOf.client),
        versionOf,
      })
      setErrors({})
    } else if (client) {
      setForm({ ...emptyQuoteForm, title: '' })
      setDialog({ open: true, editing: null, clientId: client.id, clientName: client.name })
    } else {
      setForm(emptyQuoteForm)
      setDialog({ open: true, editing: null, clientId: '', clientName: '' })
    }
    setErrors({})
  }

  const openEdit = (q: QuoteRecord) => {
    setForm({
      title: q.title ?? '',
      client: q.client,
      ambientes: q.ambientes ?? '',
      dimensions: q.dimensions ?? '',
      materials: q.materials ?? '',
      hardware: q.hardware ?? '',
      materials_cost: q.materials_cost ? String(q.materials_cost) : '',
      hardware_cost: q.hardware_cost ? String(q.hardware_cost) : '',
      thirdparty_cost: q.thirdparty_cost ? String(q.thirdparty_cost) : '',
      labor_cost: q.labor_cost ? String(q.labor_cost) : '',
      transport_cost: q.transport_cost ? String(q.transport_cost) : '',
      extra_cost: q.extra_cost ? String(q.extra_cost) : '',
      margin_percent: q.margin_percent ? String(q.margin_percent) : '',
      price_adjustment: q.price_adjustment ? String(q.price_adjustment) : '',
      payment_terms: (q.payment_terms as QuoteFormValues['payment_terms']) || 'a_vista',
      deadline_days: q.deadline_days ? String(q.deadline_days) : '',
      notes: q.notes ?? '',
    })
    setErrors({})
    setDialog({ open: true, editing: q, clientId: q.client, clientName: clientName(q.client) })
  }

  const save = async () => {
    const errs = validateQuote(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      if (dialog.editing) {
        await updateQuote(dialog.editing.id, dialog.editing, form)
        toast({ title: 'Orçamento atualizado' })
      } else if (dialog.versionOf) {
        await createQuoteVersion(dialog.versionOf, form)
        toast({ title: 'Nova versão criada' })
      } else {
        await createQuote(form)
        toast({ title: 'Orçamento criado' })
      }
      setDialog({ open: false, editing: null, clientId: '', clientName: '' })
      await load()
    } catch (e) {
      if (e instanceof ErpValidationError) setErrors(e.fields)
      else
        toast({ title: 'Erro ao salvar', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteQuote(deleteTarget.id)
      toast({ title: 'Orçamento excluído' })
      setDeleteTarget(null)
      await load()
    } catch (e) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const confirmApprove = async () => {
    if (!approveTarget) return
    setSaving(true)
    try {
      const r = await approveQuoteAndIntegrate(approveTarget)
      toast({
        title: 'Venda fechada!',
        description: `Projeto criado com ${r.stages} etapas e ${r.receivables} conta(s) a receber.`,
      })
      setApproveTarget(null)
      await load()
    } catch (e) {
      toast({ title: 'Erro ao aprovar', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const openVersions = async (q: QuoteRecord) => {
    try {
      const rows = await listQuoteVersions(q)
      setVersions((v) => ({ ...v, [q.id]: rows }))
    } catch (e) {
      toast({
        title: 'Erro ao carregar versões',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-300" />
      </div>
    )
  }

  const t = (q: QuoteRecord) =>
    computeQuoteTotals(
      q.materials_cost ?? 0,
      q.hardware_cost ?? 0,
      q.thirdparty_cost ?? 0,
      q.labor_cost ?? 0,
      q.transport_cost ?? 0,
      q.extra_cost ?? 0,
      q.margin_percent ?? 0,
      q.price_adjustment,
    )

  return (
    <div>
      <ErpPageHeader
        title="Orçamentos"
        subtitle="Precificação calculada, versões e aprovação que gera projeto + financeiro."
        actions={
          <Button
            onClick={() => openNew()}
            className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo orçamento
          </Button>
        }
      />

      {quotes.length === 0 ? (
        <ErpEmptyState
          title="Nenhum orçamento cadastrado"
          description="Crie orçamentos com precificação calculada; ao aprovar, o projeto e as contas a receber nascem automaticamente."
          icon={<FileText className="h-8 w-8" />}
          action={
            <Button
              onClick={() => openNew()}
              className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            >
              <Plus className="mr-2 h-4 w-4" /> Criar orçamento
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => {
            const totals = t(q)
            const qVersions = versions[q.id]
            return (
              <div key={q.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-zinc-100">{q.title}</p>
                      <Badge
                        className={
                          q.status === 'aprovado'
                            ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                            : q.status === 'recusado'
                              ? 'border-red-400/30 bg-red-400/10 text-red-300'
                              : 'border-amber-300/30 bg-amber-300/10 text-amber-200'
                        }
                      >
                        {q.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {clientName(q.client)} · criado {formatDate(q.created)}
                      {q.opportunity ? ' · via oportunidade' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-lg text-amber-200">
                      {formatCurrency(totals.final_price)}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      custo {formatCurrency(totals.total_cost)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-white/15 text-zinc-200 hover:bg-white/10"
                    onClick={() => openEdit(q)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-white/15 text-zinc-200 hover:bg-white/10"
                    onClick={() => openNew(undefined, q)}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Nova versão
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10"
                    onClick={() => setApproveTarget(q)}
                    disabled={q.status === 'aprovado'}
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />{' '}
                    {q.status === 'aprovado' ? 'Aprovado' : 'Aprovar (venda fechada)'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-white/15 text-zinc-200 hover:bg-white/10"
                    onClick={() => setPrintTarget(q)}
                  >
                    <Printer className="mr-1 h-3 w-3" /> Proposta PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-zinc-300 hover:bg-white/10"
                    onClick={() => openVersions(q)}
                  >
                    <History className="mr-1 h-3 w-3" /> Versões
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-red-300 hover:bg-red-400/10"
                    onClick={() => setDeleteTarget(q)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {qVersions && (
                  <div className="mt-3 rounded-md border border-white/10 bg-[#1d1f24] p-3 text-xs">
                    <p className="mb-1 font-medium text-amber-200/80">Histórico de versões</p>
                    {qVersions.length === 0 ? (
                      <p className="text-zinc-400">Apenas a versão original — nenhuma revisão.</p>
                    ) : (
                      <ul className="space-y-1">
                        {qVersions.map((v) => (
                          <li key={v.id} className="text-zinc-300">
                            {v.title} · {formatCurrency(v.final_price ?? 0)} ·{' '}
                            {formatDate(v.created)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog novo/editar/versão */}
      <Dialog
        open={dialog.open}
        onOpenChange={(o) =>
          setDialog({
            open: o,
            editing: dialog.editing,
            clientId: dialog.clientId,
            clientName: dialog.clientName,
            versionOf: dialog.versionOf,
          })
        }
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {dialog.editing
                ? 'Editar orçamento'
                : dialog.versionOf
                  ? `Nova versão de "${dialog.versionOf.title}"`
                  : 'Novo orçamento'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {dialog.clientName ||
                'Escolha o cliente e informe os custos reais — o preço final é calculado.'}
            </DialogDescription>
          </DialogHeader>
          {!dialog.editing && !dialog.versionOf && (
            <div>
              <Label>Cliente *</Label>
              <QuoteClientSelect
                value={form.client}
                onChange={(id) => setForm((f) => ({ ...f, client: id }))}
                error={errors.client}
              />
            </div>
          )}
          <QuoteFields form={form} setForm={setForm} errors={errors} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDialog({ open: false, editing: null, clientId: '', clientName: '' })
              }
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

      {/* Confirmação de exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir orçamento</DialogTitle>
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

      {/* Confirmação de aprovação */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aprovar orçamento</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Aprovar "{approveTarget?.title}" por{' '}
              {formatCurrency(approveTarget ? t(approveTarget).final_price : 0)}? Serão criados
              automaticamente o projeto, as 11 etapas de produção e as contas a receber conforme as
              condições de pagamento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveTarget(null)}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={saving}
              className="bg-emerald-500 text-white hover:bg-emerald-400"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Aprovar e integrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Área de impressão da proposta */}
      {printTarget && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 p-4 print:bg-white print:p-0">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex justify-end gap-2 print:hidden">
              <Button
                onClick={handlePrint}
                className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
              >
                <Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => setPrintTarget(null)}
                className="border-white/15 bg-[#1d1f24] text-zinc-200 hover:bg-white/10"
              >
                Fechar
              </Button>
            </div>
            <div ref={printRef} className="rounded-lg bg-white text-zinc-900 print:rounded-none">
              <QuoteProposal
                quote={printTarget}
                clientName={clientName(printTarget.client)}
                opportunityTitle={
                  printTarget.opportunity ? clientName(printTarget.client) : undefined
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
