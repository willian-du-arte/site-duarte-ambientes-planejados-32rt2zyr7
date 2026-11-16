// Compras (etapa 2) — registro de pedidos a fornecedores com conta a pagar automática.
import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ShoppingCart,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  PackageCheck,
  CircleDollarSign,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErpEmptyState, ErpPageHeader, ErpStatCard } from './ErpShared'
import { useClientNames } from './QuoteClientSelect'
import {
  createPurchase,
  deletePurchase,
  listPurchases,
  markPurchasePaid,
  markPurchaseReceived,
  purchaseTotal,
  updatePurchase,
} from '@/services/inventory'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatCurrency, formatDate, todayISO } from '@/lib/format'
import {
  emptyPurchaseForm,
  PURCHASE_STATUS_LABELS,
  type PurchaseFormValues,
  type PurchaseRecord,
} from '@/types/inventory'

const statusTone: Record<string, string> = {
  orcamento: 'bg-sky-400/10 text-sky-300',
  pedido: 'bg-amber-300/10 text-amber-200',
  recebido: 'bg-emerald-400/10 text-emerald-300',
  cancelado: 'bg-zinc-400/10 text-zinc-400',
}

const paymentTone: Record<string, string> = {
  pendente: 'bg-red-400/10 text-red-300',
  parcial: 'bg-amber-300/10 text-amber-200',
  pago: 'bg-emerald-400/10 text-emerald-300',
}

function validatePurchase(form: PurchaseFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.description.trim()) errors.description = 'Informe o material/serviço comprado.'
  if (!form.supplier) errors.supplier = 'Selecione o fornecedor.'
  if (!form.order_date) errors.order_date = 'Informe a data da compra.'
  if (form.quantity === '' || Number(form.quantity) <= 0)
    errors.quantity = 'Quantidade deve ser maior que zero.'
  if (form.unit_price === '' || Number(form.unit_price) <= 0)
    errors.unit_price = 'Valor unitário deve ser maior que zero.'
  if (form.expected_date && form.order_date && form.expected_date < form.order_date)
    errors.expected_date = 'Previsão não pode ser antes da data da compra.'
  return errors
}

function PurchaseFields({
  form,
  setForm,
  errors,
  suppliers,
  projects,
  loadingDeps,
}: {
  form: PurchaseFormValues
  setForm: (f: PurchaseFormValues) => void
  errors: Record<string, string>
  suppliers: { id: string; name: string }[]
  projects: { id: string; name: string }[]
  loadingDeps: boolean
}) {
  const set = (patch: Partial<PurchaseFormValues>) => setForm({ ...form, ...patch })
  const total = purchaseTotal(form)
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="pur-desc">Material / serviço *</Label>
        <Input
          id="pur-desc"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          className="bg-white/5"
          placeholder="Ex.: Chapa MDF 18mm branco — 2750x1850"
        />
        {errors.description && <p className="mt-1 text-xs text-red-300">{errors.description}</p>}
      </div>
      <div>
        <Label htmlFor="pur-supplier">Fornecedor *</Label>
        <select
          id="pur-supplier"
          value={form.supplier}
          onChange={(e) => set({ supplier: e.target.value })}
          className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-100"
        >
          <option value="">{loadingDeps ? 'Carregando…' : 'Selecione um fornecedor'}</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {errors.supplier && <p className="mt-1 text-xs text-red-300">{errors.supplier}</p>}
      </div>
      <div>
        <Label htmlFor="pur-project">Projeto relacionado</Label>
        <select
          id="pur-project"
          value={form.project}
          onChange={(e) => set({ project: e.target.value })}
          className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-100"
        >
          <option value="">Sem vínculo / estoque geral</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="pur-qty">Quantidade *</Label>
        <Input
          id="pur-qty"
          type="number"
          min="0"
          step="any"
          value={form.quantity}
          onChange={(e) => set({ quantity: e.target.value })}
          className="bg-white/5"
        />
        {errors.quantity && <p className="mt-1 text-xs text-red-300">{errors.quantity}</p>}
      </div>
      <div>
        <Label htmlFor="pur-price">Valor unitário (R$) *</Label>
        <Input
          id="pur-price"
          type="number"
          min="0"
          step="any"
          value={form.unit_price}
          onChange={(e) => set({ unit_price: e.target.value })}
          className="bg-white/5"
        />
        {errors.unit_price && <p className="mt-1 text-xs text-red-300">{errors.unit_price}</p>}
      </div>
      <div className="sm:col-span-2 rounded-md border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-sm">
        <span className="text-zinc-400">Valor total: </span>
        <span className="font-semibold text-amber-200">{formatCurrency(total)}</span>
      </div>
      <div>
        <Label htmlFor="pur-order-date">Data da compra *</Label>
        <Input
          id="pur-order-date"
          type="date"
          value={form.order_date}
          onChange={(e) => set({ order_date: e.target.value })}
          className="bg-white/5"
        />
        {errors.order_date && <p className="mt-1 text-xs text-red-300">{errors.order_date}</p>}
      </div>
      <div>
        <Label htmlFor="pur-expected">Previsão de entrega</Label>
        <Input
          id="pur-expected"
          type="date"
          value={form.expected_date}
          onChange={(e) => set({ expected_date: e.target.value })}
          className="bg-white/5"
        />
        {errors.expected_date && (
          <p className="mt-1 text-xs text-red-300">{errors.expected_date}</p>
        )}
      </div>
      <div>
        <Label htmlFor="pur-status">Status do pedido</Label>
        <select
          id="pur-status"
          value={form.status}
          onChange={(e) => set({ status: e.target.value as PurchaseFormValues['status'] })}
          className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-100"
        >
          {Object.entries(PURCHASE_STATUS_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="pur-payment">Situação do pagamento</Label>
        <select
          id="pur-payment"
          value={form.payment_status}
          onChange={(e) =>
            set({ payment_status: e.target.value as PurchaseFormValues['payment_status'] })
          }
          className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-100"
        >
          {Object.entries(PURCHASE_PAYMENT_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        {form.payment_status === 'pendente' && (
          <p className="mt-1 text-[11px] text-amber-200/80">
            Ao salvar, uma conta a pagar é criada automaticamente no Financeiro.
          </p>
        )}
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="pur-notes">Observações</Label>
        <Textarea
          id="pur-notes"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={2}
          className="bg-white/5"
        />
      </div>
    </div>
  )
}

function purchaseFormFrom(p: PurchaseRecord): PurchaseFormValues {
  return {
    description: p.description ?? '',
    supplier: p.supplier ?? '',
    project: p.project ?? '',
    quantity: p.quantity != null ? String(p.quantity) : '',
    unit_price: p.unit_price != null ? String(p.unit_price) : '',
    status: p.status ?? 'pedido',
    payment_status: p.payment_status ?? 'pendente',
    order_date: p.order_date ? p.order_date.slice(0, 10) : '',
    expected_date: p.expected_date ? p.expected_date.slice(0, 10) : '',
    notes: p.notes ?? '',
  }
}

export function ErpPurchases() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<{ open: boolean; editing: PurchaseRecord | null }>({
    open: false,
    editing: null,
  })
  const [form, setForm] = useState<PurchaseFormValues>(emptyPurchaseForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<PurchaseRecord | null>(null)
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [depsLoaded, setDepsLoaded] = useState(false)

  const load = async () => setPurchases(await listPurchases())

  useEffect(() => {
    ;(async () => {
      try {
        await load()
        const { listSuppliers: sup } = await import('@/services/inventory')
        setSuppliers((await sup()).map((s) => ({ id: s.id, name: s.name })))
        const { listProjects } = await import('@/services/erp')
        setProjects((await listProjects()).map((p) => ({ id: p.id, name: p.name })))
        setDepsLoaded(true)
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return purchases
    return purchases.filter((p) =>
      [p.description, p.expand?.supplier?.name, p.expand?.project?.name, p.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [purchases, search])

  const save = async () => {
    const errs = validatePurchase(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      if (dialog.editing) {
        await updatePurchase(dialog.editing.id, dialog.editing, form)
        toast({ title: 'Compra atualizada' })
      } else {
        await createPurchase(form)
        toast({ title: 'Compra registrada' })
      }
      setDialog({ open: false, editing: null })
      await load()
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const withBusy = async (id: string, fn: () => Promise<unknown>, okTitle: string) => {
    setBusyId(id)
    try {
      await fn()
      toast({ title: okTitle })
      await load()
    } catch (e) {
      toast({ title: 'Erro', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setBusyId(null)
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

  const pendentes = purchases.filter((p) => p.payment_status === 'pendente').length
  const abertos = purchases.filter(
    (p) => p.status !== 'recebido' && p.status !== 'cancelado',
  ).length
  const totalPeriodo = purchases.reduce((acc, p) => acc + (p.total ?? 0), 0)

  return (
    <div>
      <ErpPageHeader
        title="Compras"
        subtitle="Pedidos a fornecedores — com conta a pagar gerada automaticamente quando pendente."
        actions={
          <Button
            onClick={() => {
              setForm({ ...emptyPurchaseForm, order_date: todayISO() })
              setErrors({})
              setDialog({ open: true, editing: null })
            }}
            className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
          >
            <Plus className="mr-2 h-4 w-4" /> Nova compra
          </Button>
        }
      />

      {purchases.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ErpStatCard label="Pedidos abertos" value={String(abertos)} />
          <ErpStatCard label="Pagamentos pendentes" value={String(pendentes)} tone="wood" />
          <ErpStatCard label="Valor total comprado" value={formatCurrency(totalPeriodo)} />
          <ErpStatCard
            label="Resultado da busca"
            value={String(filtered.length)}
            hint={search || undefined}
          />
        </div>
      )}

      {purchases.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por material, fornecedor, projeto…"
            className="pl-9 bg-white/5"
          />
        </div>
      )}

      {purchases.length === 0 ? (
        <ErpEmptyState
          title="Nenhuma compra registrada"
          description="Registre aqui os pedidos de MDF, ferragens e serviços. Compras pendentes geram conta a pagar no Financeiro automaticamente."
          icon={<ShoppingCart className="h-8 w-8" />}
          action={
            <Button
              onClick={() => {
                setForm({ ...emptyPurchaseForm, order_date: todayISO() })
                setErrors({})
                setDialog({ open: true, editing: null })
              }}
              className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            >
              <Plus className="mr-2 h-4 w-4" /> Registrar compra
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <ErpEmptyState title="Nenhuma compra encontrada" description={`Nada para "${search}".`} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-400">
                <th className="px-3 py-2">Material / serviço</th>
                <th className="px-3 py-2">Fornecedor</th>
                <th className="px-3 py-2">Projeto</th>
                <th className="px-3 py-2">Qtd.</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Compra</th>
                <th className="px-3 py-2">Entrega</th>
                <th className="px-3 py-2">Pagamento</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2">
                    <p className="font-medium text-zinc-100">{p.description}</p>
                    {p.notes && <p className="text-[11px] text-zinc-500">{p.notes}</p>}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{p.expand?.supplier?.name || '—'}</td>
                  <td className="px-3 py-2 text-zinc-300">{p.expand?.project?.name || '—'}</td>
                  <td className="px-3 py-2 text-zinc-300">{p.quantity ?? '—'}</td>
                  <td className="px-3 py-2 font-medium text-amber-200">
                    {formatCurrency(p.total ?? 0)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[11px] ${statusTone[p.status] || ''}`}
                    >
                      {PURCHASE_STATUS_LABELS[p.status] || p.status}
                    </span>
                    <p className="mt-1 text-[11px] text-zinc-500">{formatDate(p.order_date)}</p>
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {p.status === 'recebido' ? (
                      <span className="text-emerald-300">
                        ✓ {p.received_at ? formatDate(p.received_at) : ''}
                      </span>
                    ) : p.expected_date ? (
                      formatDate(p.expected_date)
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[11px] ${paymentTone[p.payment_status] || ''}`}
                    >
                      {PURCHASE_PAYMENT_LABELS[p.payment_status] || p.payment_status || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      {p.status !== 'recebido' && p.status !== 'cancelado' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === p.id}
                          className="h-7 text-[11px] text-emerald-300 hover:bg-emerald-400/10"
                          onClick={() =>
                            withBusy(
                              p.id,
                              () => markPurchaseReceived(p.id),
                              'Compra marcada como recebida',
                            )
                          }
                        >
                          {busyId === p.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <PackageCheck className="mr-1 h-3 w-3" />
                          )}
                          Recebida
                        </Button>
                      )}
                      {p.payment_status !== 'pago' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === p.id}
                          className="h-7 text-[11px] text-amber-200 hover:bg-amber-300/10"
                          onClick={() =>
                            withBusy(
                              p.id,
                              () => markPurchasePaid(p.id, p),
                              'Compra marcada como paga',
                            )
                          }
                        >
                          {busyId === p.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CircleDollarSign className="mr-1 h-3 w-3" />
                          )}
                          Paga
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] text-zinc-300 hover:bg-white/10"
                        onClick={() => {
                          setForm(purchaseFormFrom(p))
                          setErrors({})
                          setDialog({ open: true, editing: p })
                        }}
                      >
                        <Pencil className="mr-1 h-3 w-3" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-red-300 hover:bg-red-400/10"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog compra */}
      <Dialog
        open={dialog.open}
        onOpenChange={(o) => setDialog({ open: o, editing: dialog.editing })}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialog.editing ? 'Editar compra' : 'Nova compra'}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Vincule a um fornecedor e, opcionalmente, a um projeto. Compra pendente gera conta a
              pagar no Financeiro.
            </DialogDescription>
          </DialogHeader>
          <PurchaseFields
            form={form}
            setForm={setForm}
            errors={errors}
            suppliers={suppliers}
            projects={projects}
            loadingDeps={!depsLoaded}
          />
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

      {/* Exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir compra</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Excluir a compra "{deleteTarget?.description}"? A conta a pagar gerada por ela (se
              houver) continua no Financeiro e pode ser excluída lá.
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
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() =>
                deleteTarget &&
                withBusy(deleteTarget.id, () => deletePurchase(deleteTarget.id), 'Compra excluída')
              }
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
