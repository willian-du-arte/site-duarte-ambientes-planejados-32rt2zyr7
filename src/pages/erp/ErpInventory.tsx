// Estoque (etapa 2) — materiais, alerta de estoque baixo e movimentações de entrada/saída.
import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Boxes,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  AlertTriangle,
  PackageSearch,
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
import {
  createInventoryItem,
  createMovement,
  deleteInventoryItem,
  deleteMovement,
  listInventoryItems,
  listMovements,
  updateInventoryItem,
} from '@/services/inventory'
import { listPurchases } from '@/services/inventory'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatCurrency, formatDateTime, todayISO } from '@/lib/format'
import {
  emptyInventoryItemForm,
  emptyMovementForm,
  INVENTORY_CATEGORY_LABELS,
  MOVEMENT_KIND_LABELS,
  isLowStock,
  type InventoryCategory,
  type InventoryItemFormValues,
  type InventoryItemRecord,
  type MovementFormValues,
  type MovementKind,
  type MovementRecord,
} from '@/types/inventory'
import type { ProjectRecordRef } from '@/types/inventory'

const categoryTone: Record<string, string> = {
  mdf: 'bg-amber-300/10 text-amber-200',
  ferragens: 'bg-sky-400/10 text-sky-300',
  corredicas: 'bg-violet-400/10 text-violet-300',
  dobradicas: 'bg-emerald-400/10 text-emerald-300',
  fitas_borda: 'bg-orange-400/10 text-orange-300',
  acessorios: 'bg-cyan-400/10 text-cyan-300',
  acabamento: 'bg-rose-400/10 text-rose-300',
  outros: 'bg-zinc-400/10 text-zinc-300',
}

function validateItem(form: InventoryItemFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = 'Informe o nome do material.'
  if (!form.category) errors.category = 'Selecione a categoria.'
  if (form.quantity === '' || Number(form.quantity) < 0)
    errors.quantity = 'Quantidade não pode ser negativa.'
  if (form.unit_cost !== '' && Number(form.unit_cost) < 0)
    errors.unit_cost = 'Custo unitário não pode ser negativo.'
  if (form.min_quantity !== '' && Number(form.min_quantity) < 0)
    errors.min_quantity = 'Limite não pode ser negativo.'
  return errors
}

function validateMovement(
  form: MovementFormValues,
  available: number | undefined,
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.quantity || Number(form.quantity) <= 0)
    errors.quantity = 'Quantidade deve ser maior que zero.'
  if (form.kind === 'saida' && available != null && Number(form.quantity) > available)
    errors.quantity = 'Quantidade maior que a disponível em estoque.'
  return errors
}

function itemFormFrom(i: InventoryItemRecord): InventoryItemFormValues {
  return {
    name: i.name ?? '',
    category: (i.category as InventoryCategory) ?? 'outros',
    unit: i.unit ?? '',
    quantity: i.quantity != null ? String(i.quantity) : '0',
    unit_cost: i.unit_cost != null ? String(i.unit_cost) : '',
    min_quantity: i.min_quantity != null ? String(i.min_quantity) : '',
    supplier: i.supplier ?? '',
    notes: i.notes ?? '',
  }
}

function ItemFields({
  form,
  setForm,
  errors,
  suppliers,
}: {
  form: InventoryItemFormValues
  setForm: (f: InventoryItemFormValues) => void
  errors: Record<string, string>
  suppliers: { id: string; name: string }[]
}) {
  const set = (patch: Partial<InventoryItemFormValues>) => setForm({ ...form, ...patch })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="item-name">Material *</Label>
        <Input
          id="item-name"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          className="bg-white/5"
          placeholder="Ex.: MDF 18mm branco AC"
        />
        {errors.name && <p className="mt-1 text-xs text-red-300">{errors.name}</p>}
      </div>
      <div>
        <Label htmlFor="item-cat">Categoria *</Label>
        <select
          id="item-cat"
          value={form.category}
          onChange={(e) => set({ category: e.target.value as InventoryItemFormValues['category'] })}
          className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-100"
        >
          <option value="">Selecione</option>
          {Object.entries(INVENTORY_CATEGORY_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        {errors.category && <p className="mt-1 text-xs text-red-300">{errors.category}</p>}
      </div>
      <div>
        <Label htmlFor="item-unit">Unidade</Label>
        <Input
          id="item-unit"
          value={form.unit}
          onChange={(e) => set({ unit: e.target.value })}
          className="bg-white/5"
          placeholder="un, chapa, m, m², cx…"
        />
      </div>
      <div>
        <Label htmlFor="item-qty">Quantidade disponível</Label>
        <Input
          id="item-qty"
          type="number"
          min="0"
          step="any"
          value={form.quantity}
          onChange={(e) => set({ quantity: e.target.value })}
          className="bg-white/5"
        />
        {errors.quantity && <p className="mt-1 text-xs text-red-300">{errors.quantity}</p>}
        <p className="mt-1 text-[11px] text-zinc-500">
          Se maior que zero, vira uma entrada inicial no histórico.
        </p>
      </div>
      <div>
        <Label htmlFor="item-cost">Custo unitário (R$)</Label>
        <Input
          id="item-cost"
          type="number"
          min="0"
          step="any"
          value={form.unit_cost}
          onChange={(e) => set({ unit_cost: e.target.value })}
          className="bg-white/5"
        />
        {errors.unit_cost && <p className="mt-1 text-xs text-red-300">{errors.unit_cost}</p>}
      </div>
      <div>
        <Label htmlFor="item-low">Alerta de estoque baixo</Label>
        <Input
          id="item-low"
          type="number"
          min="0"
          step="any"
          value={form.min_quantity}
          onChange={(e) => set({ min_quantity: e.target.value })}
          className="bg-white/5"
          placeholder="Ex.: 4 (deixe vazio para não alertar)"
        />
        {errors.min_quantity && <p className="mt-1 text-xs text-red-300">{errors.min_quantity}</p>}
      </div>
      <div>
        <Label htmlFor="item-supplier">Fornecedor habitual</Label>
        <select
          id="item-supplier"
          value={form.supplier}
          onChange={(e) => set({ supplier: e.target.value })}
          className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-100"
        >
          <option value="">Nenhum</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="item-notes">Observações (espessura, cor, padrão…)</Label>
        <Textarea
          id="item-notes"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={2}
          className="bg-white/5"
          placeholder="Ex.: 18mm, branco AC, chapa 2750x1850"
        />
      </div>
    </div>
  )
}

function MovementFields({
  form,
  setForm,
  errors,
  items,
  projects,
  purchases,
  loadingDeps,
}: {
  form: MovementFormValues
  setForm: (f: MovementFormValues) => void
  errors: Record<string, string>
  items: InventoryItemRecord[]
  projects: ProjectRecordRef[]
  purchases: { id: string; description: string }[]
  loadingDeps: boolean
}) {
  const set = (patch: Partial<MovementFormValues>) => setForm({ ...form, ...patch })
  const selectedItem = items.find((i) => i.id === form.item)
  const available = selectedItem?.quantity ?? 0
  const qty = Number(form.quantity || 0)
  const after =
    form.kind === 'ajuste' ? qty : form.kind === 'saida' ? available - qty : available + qty
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="mov-item">Material *</Label>
        <select
          id="mov-item"
          value={form.item}
          onChange={(e) => set({ item: e.target.value })}
          className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-100"
        >
          <option value="">{loadingDeps ? 'Carregando…' : 'Selecione o material'}</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} — atual: {i.quantity ?? 0} {i.unit || 'un'}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="mov-kind">Tipo de movimentação *</Label>
        <select
          id="mov-kind"
          value={form.kind}
          onChange={(e) => set({ kind: e.target.value as MovementKind })}
          className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-100"
        >
          {Object.entries(MOVEMENT_KIND_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="mov-qty">
          {form.kind === 'ajuste' ? 'Quantidade final *' : 'Quantidade *'}
        </Label>
        <Input
          id="mov-qty"
          type="number"
          min="0"
          step="any"
          value={form.quantity}
          onChange={(e) => set({ quantity: e.target.value })}
          className="bg-white/5"
        />
        {errors.quantity && <p className="mt-1 text-xs text-red-300">{errors.quantity}</p>}
        {form.item && form.kind !== 'ajuste' && (
          <p className="mt-1 text-[11px] text-zinc-400">
            Fica: <span className="text-amber-200">{Math.max(0, after)}</span>{' '}
            {selectedItem?.unit || 'un'}
            {form.kind === 'saida' && qty > available && (
              <span className="text-red-300"> — maior que o disponível!</span>
            )}
          </p>
        )}
      </div>
      {form.kind === 'saida' && (
        <div className="sm:col-span-2">
          <Label htmlFor="mov-project">Projeto de destino</Label>
          <select
            id="mov-project"
            value={form.project}
            onChange={(e) => set({ project: e.target.value })}
            className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-100"
          >
            <option value="">Sem vínculo / consumo geral</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-zinc-500">
            Vincule a saída ao projeto que consumiu o material.
          </p>
        </div>
      )}
      {form.kind === 'entrada' && (
        <div className="sm:col-span-2">
          <Label htmlFor="mov-purchase">Compra específica (opcional)</Label>
          <select
            id="mov-purchase"
            value={form.purchase_id ?? ''}
            onChange={(e) => set({ purchase_id: e.target.value })}
            className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-100"
          >
            <option value="">Sem vínculo</option>
            {purchases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.description}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-zinc-500">
            Use quando a entrada corresponde a uma compra específica registrada em Compras.
          </p>
        </div>
      )}
      <div>
        <Label htmlFor="mov-cost">Custo unitário (R$)</Label>
        <Input
          id="mov-cost"
          type="number"
          min="0"
          step="any"
          value={form.unit_cost}
          onChange={(e) => set({ unit_cost: e.target.value })}
          className="bg-white/5"
          placeholder="Padrão: custo do material"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="mov-reason">Motivo / observações</Label>
        <Textarea
          id="mov-reason"
          value={form.reason}
          onChange={(e) => set({ reason: e.target.value })}
          rows={2}
          className="bg-white/5"
          placeholder="Ex.: compra lote 42, consumo bancada cozinha…"
        />
      </div>
    </div>
  )
}

export function ErpInventory() {
  const [items, setItems] = useState<InventoryItemRecord[]>([])
  const [movements, setMovements] = useState<MovementRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecordRef[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [purchases, setPurchases] = useState<{ id: string; description: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [itemDialog, setItemDialog] = useState<{
    open: boolean
    editing: InventoryItemRecord | null
  }>({
    open: false,
    editing: null,
  })
  const [itemForm, setItemForm] = useState<InventoryItemFormValues>(emptyInventoryItemForm)
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({})
  const [itemDeleteTarget, setItemDeleteTarget] = useState<InventoryItemRecord | null>(null)
  const [movDialog, setMovDialog] = useState<{ open: boolean; editing: MovementRecord | null }>({
    open: false,
    editing: null,
  })
  const [movForm, setMovForm] = useState<MovementFormValues>(emptyMovementForm)
  const [movErrors, setMovErrors] = useState<Record<string, string>>({})
  const [movDeleteTarget, setMovDeleteTarget] = useState<MovementRecord | null>(null)
  const [historyOf, setHistoryOf] = useState<InventoryItemRecord | null>(null)

  const load = async () => {
    const [i, m] = await Promise.all([listInventoryItems(), listMovements()])
    setItems(i)
    setMovements(m)
  }

  useEffect(() => {
    ;(async () => {
      try {
        await load()
        const [{ listProjects }, { listPurchases: lp, listSuppliers }] = await Promise.all([
          import('@/services/erp'),
          import('@/services/inventory'),
        ])
        setProjects((await listProjects()).map((p) => ({ id: p.id, name: p.title })))
        setSuppliers((await listSuppliers()).map((s) => ({ id: s.id, name: s.name })))
        setPurchases((await lp()).map((p) => ({ id: p.id, description: p.description })))
      } catch (e) {
        toast({
          title: 'Erro ao carregar estoque',
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
    if (!q) return items
    return items.filter((i) =>
      [i.name, i.category, i.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [items, search])

  const lowStock = items.filter((i) => isLowStock(i)).length
  const totalValue = items.reduce((acc, i) => acc + (i.quantity ?? 0) * (i.unit_cost ?? 0), 0)

  const openItemDialog = (editing: InventoryItemRecord | null) => {
    setItemForm(editing ? itemFormFrom(editing) : emptyInventoryItemForm)
    setItemErrors({})
    setItemDialog({ open: true, editing })
  }

  const openMovementDialog = (kind: MovementKind, itemId?: string) => {
    setMovForm({ ...emptyMovementForm, kind, item: itemId ?? '' })
    setMovErrors({})
    setMovDialog({ open: true, editing: null })
  }

  const saveItem = async () => {
    const errs = validateItem(itemForm)
    if (Object.keys(errs).length > 0) {
      setItemErrors(errs)
      return
    }
    setSaving(true)
    try {
      if (itemDialog.editing) {
        await updateInventoryItem(itemDialog.editing.id, itemForm)
        toast({ title: 'Material atualizado' })
      } else {
        await createInventoryItem(itemForm)
        toast({ title: 'Material cadastrado' })
      }
      setItemDialog({ open: false, editing: null })
      await load()
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const saveMovement = async () => {
    if (!movForm.item) {
      setMovErrors({ item: 'Selecione o material.' })
      return
    }
    const item = items.find((i) => i.id === movForm.item)
    const errs = validateMovement(movForm, item?.quantity)
    if (Object.keys(errs).length > 0) {
      setMovErrors(errs)
      return
    }
    if (!item) return
    setSaving(true)
    try {
      await createMovement(item.id, item, movForm)
      toast({ title: 'Movimentação registrada' })
      setMovDialog({ open: false, editing: null })
      await load()
      if (historyOf) {
        const refreshed = (await listInventoryItems()).find((i) => i.id === historyOf.id)
        if (refreshed) setHistoryOf(refreshed)
      }
    } catch (e) {
      toast({ title: 'Erro ao registrar', description: getErrorMessage(e), variant: 'destructive' })
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
      if (historyOf) {
        const refreshed = (await listInventoryItems()).find((i) => i.id === historyOf.id)
        if (refreshed) setHistoryOf(refreshed)
      }
    } catch (e) {
      toast({ title: 'Erro', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setBusyId(null)
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
        title="Estoque"
        subtitle="Materiais e insumos com quantidade, custo e alerta de estoque baixo."
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => openMovementDialog('entrada')}
              disabled={items.length === 0}
              className="border border-white/15 bg-transparent text-zinc-100 hover:bg-white/10"
              variant="outline"
            >
              <ArrowDownToLine className="mr-2 h-4 w-4" /> Movimentar
            </Button>
            <Button
              onClick={() => openItemDialog(null)}
              className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            >
              <Plus className="mr-2 h-4 w-4" /> Novo material
            </Button>
          </div>
        }
      />

      {items.length > 0 && (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ErpStatCard label="Materiais cadastrados" value={String(items.length)} />
            <ErpStatCard label="Em alerta de estoque baixo" value={String(lowStock)} tone="wood" />
            <ErpStatCard label="Valor em estoque" value={formatCurrency(totalValue)} />
            <ErpStatCard
              label="Movimentações"
              value={String(movements.length)}
              hint="entradas e saídas"
            />
          </div>

          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, categoria, observações…"
              className="pl-9 bg-white/5"
            />
          </div>
        </>
      )}

      {items.length === 0 ? (
        <ErpEmptyState
          title="Nenhum material cadastrado"
          description="Cadastre MDF por espessura/cor, ferragens, corrediças, dobradiças, fitas de borda e outros insumos, com custo e limite de alerta."
          icon={<Boxes className="h-8 w-8" />}
          action={
            <Button
              onClick={() => openItemDialog(null)}
              className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            >
              <Plus className="mr-2 h-4 w-4" /> Cadastrar material
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <ErpEmptyState title="Nenhum material encontrado" description={`Nada para "${search}".`} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-400">
                <th className="px-3 py-2">Material</th>
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2">Disponível</th>
                <th className="px-3 py-2">Custo unit.</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const low = isLowStock(i)
                return (
                  <tr
                    key={i.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium text-zinc-100">{i.name}</p>
                      {i.notes && <p className="text-[11px] text-zinc-500">{i.notes}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[11px] ${categoryTone[i.category] || ''}`}
                      >
                        {INVENTORY_CATEGORY_LABELS[i.category] || i.category}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-200">
                      {i.quantity ?? 0} {i.unit || 'un'}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">{formatCurrency(i.unit_cost ?? 0)}</td>
                    <td className="px-3 py-2">
                      {low ? (
                        <span className="inline-flex items-center gap-1 rounded bg-red-400/10 px-1.5 py-0.5 text-[11px] text-red-300">
                          <AlertTriangle className="h-3 w-3" /> Estoque baixo
                        </span>
                      ) : (
                        <span className="inline-block rounded bg-emerald-400/10 px-1.5 py-0.5 text-[11px] text-emerald-300">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-emerald-300 hover:bg-emerald-400/10"
                          onClick={() => openMovementDialog('entrada', i.id)}
                        >
                          <ArrowDownToLine className="mr-1 h-3 w-3" /> Entrada
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-amber-200 hover:bg-amber-300/10"
                          onClick={() => openMovementDialog('saida', i.id)}
                        >
                          <ArrowUpFromLine className="mr-1 h-3 w-3" /> Saída
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-sky-300 hover:bg-sky-400/10"
                          onClick={() => setHistoryOf(i)}
                        >
                          <History className="mr-1 h-3 w-3" /> Histórico
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-zinc-300 hover:bg-white/10"
                          onClick={() => openItemDialog(i)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-red-300 hover:bg-red-400/10"
                          onClick={() => setItemDeleteTarget(i)}
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
      )}

      {/* Histórico de movimentações */}
      <Dialog open={!!historyOf} onOpenChange={(o) => !o && setHistoryOf(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico — {historyOf?.name}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Todas as entradas e saídas deste material.
            </DialogDescription>
          </DialogHeader>
          {(movements.filter((m) => m.item === historyOf?.id) || []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-zinc-400">
              <PackageSearch className="h-8 w-8 text-zinc-500" />
              Nenhuma movimentação registrada para este material ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {movements
                .filter((m) => m.item === historyOf?.id)
                .map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-zinc-100">
                        <span
                          className={
                            m.kind === 'saida'
                              ? 'text-red-300'
                              : m.kind === 'ajuste'
                                ? 'text-sky-300'
                                : 'text-emerald-300'
                          }
                        >
                          {MOVEMENT_KIND_LABELS[m.kind] || m.kind}
                        </span>{' '}
                        — {m.quantity ?? 0} {historyOf?.unit || 'un'}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {formatDateTime(m.created)}
                        {m.expand?.project ? ` · projeto: ${m.expand.project.name}` : ''}
                        {m.reason ? ` · ${m.reason}` : ''}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === m.id}
                      className="h-7 text-red-300 hover:bg-red-400/10"
                      onClick={() => setMovDeleteTarget(m)}
                    >
                      {busyId === m.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog material */}
      <Dialog
        open={itemDialog.open}
        onOpenChange={(o) => setItemDialog({ open: o, editing: itemDialog.editing })}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{itemDialog.editing ? 'Editar material' : 'Novo material'}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              MDF por espessura/cor, ferragens, corrediças, dobradiças, fitas de borda ou outros.
            </DialogDescription>
          </DialogHeader>
          <ItemFields
            form={itemForm}
            setForm={setItemForm}
            errors={itemErrors}
            suppliers={suppliers}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setItemDialog({ open: false, editing: null })}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveItem}
              disabled={saving}
              className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exclusão material */}
      <Dialog open={!!itemDeleteTarget} onOpenChange={(o) => !o && setItemDeleteTarget(null)}>
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir material</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Excluir "{itemDeleteTarget?.name}"? O histórico de movimentações dele também é
              excluído. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setItemDeleteTarget(null)}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busyId === itemDeleteTarget?.id}
              onClick={() =>
                itemDeleteTarget &&
                withBusy(
                  itemDeleteTarget.id,
                  () => deleteInventoryItem(itemDeleteTarget.id),
                  'Material excluído',
                )
              }
            >
              {busyId === itemDeleteTarget?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{' '}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog movimentação */}
      <Dialog
        open={movDialog.open}
        onOpenChange={(o) => setMovDialog({ open: o, editing: movDialog.editing })}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova movimentação</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Entradas e saídas alteram a quantidade disponível do material. Saídas podem ser
              vinculadas a um projeto.
            </DialogDescription>
          </DialogHeader>
          <MovementFields
            form={movForm}
            setForm={setMovForm}
            errors={movErrors}
            items={items}
            projects={projects}
            purchases={purchases}
            loadingDeps={projects.length === 0 && suppliers.length === 0}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMovDialog({ open: false, editing: null })}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveMovement}
              disabled={saving}
              className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exclusão movimentação */}
      <Dialog open={!!movDeleteTarget} onOpenChange={(o) => !o && setMovDeleteTarget(null)}>
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir movimentação</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Excluir esta movimentação? A quantidade disponível do material será estornada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMovDeleteTarget(null)}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busyId === movDeleteTarget?.id}
              onClick={() =>
                movDeleteTarget &&
                withBusy(
                  movDeleteTarget.id,
                  () => deleteMovement(movDeleteTarget.id, movDeleteTarget),
                  'Movimentação excluída',
                )
              }
            >
              {busyId === movDeleteTarget?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{' '}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
