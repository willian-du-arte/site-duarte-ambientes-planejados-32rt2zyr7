// Fornecedores (etapa 2) — cadastro completo com busca, CRUD e confirmação de exclusão.
import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search, Truck, Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErpEmptyState, ErpPageHeader, ErpStatCard } from './ErpShared'
import { createSupplier, deleteSupplier, listSuppliers, updateSupplier } from '@/services/inventory'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { emptySupplierForm, type SupplierFormValues, type SupplierRecord } from '@/types/inventory'

function validateSupplier(form: SupplierFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = 'Informe o nome do fornecedor.'
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    errors.email = 'E-mail inválido.'
  return errors
}

function SupplierFields({
  form,
  setForm,
  errors,
}: {
  form: SupplierFormValues
  setForm: (f: SupplierFormValues) => void
  errors: Record<string, string>
}) {
  const set = (patch: Partial<SupplierFormValues>) => setForm({ ...form, ...patch })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="sup-name">Nome / razão social *</Label>
        <Input
          id="sup-name"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          className="bg-white/5"
          placeholder="Ex.: Madeireira Central"
        />
        {errors.name && <p className="mt-1 text-xs text-red-300">{errors.name}</p>}
      </div>
      <div>
        <Label htmlFor="sup-doc">CNPJ / CPF</Label>
        <Input
          id="sup-doc"
          value={form.document}
          onChange={(e) => set({ document: e.target.value })}
          className="bg-white/5"
          placeholder="00.000.000/0000-00"
        />
      </div>
      <div>
        <Label htmlFor="sup-phone">Telefone / WhatsApp</Label>
        <Input
          id="sup-phone"
          value={form.phone}
          onChange={(e) => set({ phone: e.target.value })}
          className="bg-white/5"
          placeholder="(55) 99999-0000"
        />
      </div>
      <div>
        <Label htmlFor="sup-email">E-mail</Label>
        <Input
          id="sup-email"
          type="email"
          value={form.email}
          onChange={(e) => set({ email: e.target.value })}
          className="bg-white/5"
          placeholder="contato@fornecedor.com.br"
        />
        {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email}</p>}
      </div>
      <div>
        <Label htmlFor="sup-address">Endereço</Label>
        <Input
          id="sup-address"
          value={form.address}
          onChange={(e) => set({ address: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="sup-cat">Produtos / serviços fornecidos</Label>
        <Input
          id="sup-cat"
          value={form.categories}
          onChange={(e) => set({ categories: e.target.value })}
          className="bg-white/5"
          placeholder="Ex.: MDF, ferragens, corrediças"
        />
      </div>
      <div>
        <Label htmlFor="sup-terms">Condições de pagamento</Label>
        <Input
          id="sup-terms"
          value={form.payment_terms}
          onChange={(e) => set({ payment_terms: e.target.value })}
          className="bg-white/5"
          placeholder="Ex.: 28 dias, entrada + 2x"
        />
      </div>
      <div>
        <Label htmlFor="sup-delivery">Prazo de entrega</Label>
        <Input
          id="sup-delivery"
          value={form.delivery_time}
          onChange={(e) => set({ delivery_time: e.target.value })}
          className="bg-white/5"
          placeholder="Ex.: 7 dias úteis"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="sup-notes">Observações</Label>
        <Textarea
          id="sup-notes"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={2}
          className="bg-white/5"
        />
      </div>
    </div>
  )
}

function supplierFormFrom(s: SupplierRecord): SupplierFormValues {
  return {
    name: s.name ?? '',
    document: s.document ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    address: s.address ?? '',
    categories: s.categories ?? '',
    payment_terms: s.payment_terms ?? '',
    delivery_time: s.delivery_time ?? '',
    notes: s.notes ?? '',
  }
}

export function ErpSuppliers() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<{ open: boolean; editing: SupplierRecord | null }>({
    open: false,
    editing: null,
  })
  const [form, setForm] = useState<SupplierFormValues>(emptySupplierForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<SupplierRecord | null>(null)

  const load = async () => setSuppliers(await listSuppliers())

  useEffect(() => {
    ;(async () => {
      try {
        await load()
      } catch (e) {
        toast({
          title: 'Erro ao carregar fornecedores',
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
    if (!q) return suppliers
    return suppliers.filter((s) =>
      [s.name, s.categories, s.phone, s.document, s.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [suppliers, search])

  const save = async () => {
    const errs = validateSupplier(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      if (dialog.editing) {
        await updateSupplier(dialog.editing.id, form)
        toast({ title: 'Fornecedor atualizado' })
      } else {
        await createSupplier(form)
        toast({ title: 'Fornecedor cadastrado' })
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
    setSaving(true)
    try {
      await deleteSupplier(deleteTarget.id)
      toast({ title: 'Fornecedor excluído' })
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

  const comPrazo = suppliers.filter((s) => s.payment_terms).length

  return (
    <div>
      <ErpPageHeader
        title="Fornecedores"
        subtitle="Quem fornece MDF, ferragens e serviços — com condições de pagamento e prazo."
        actions={
          <Button
            onClick={() => {
              setForm(emptySupplierForm)
              setErrors({})
              setDialog({ open: true, editing: null })
            }}
            className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo fornecedor
          </Button>
        }
      />

      {suppliers.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ErpStatCard label="Cadastrados" value={String(suppliers.length)} />
          <ErpStatCard label="Com condições de pagamento" value={String(comPrazo)} tone="wood" />
          <ErpStatCard
            label="Resultado da busca"
            value={String(filtered.length)}
            hint={search || undefined}
          />
        </div>
      )}

      {suppliers.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, produto, telefone…"
            className="pl-9 bg-white/5"
          />
        </div>
      )}

      {suppliers.length === 0 ? (
        <ErpEmptyState
          title="Nenhum fornecedor cadastrado"
          description="Cadastre aqui as madeireiras e lojas de ferragens que você usa — com condições de pagamento e prazo de entrega."
          icon={<Truck className="h-8 w-8" />}
          action={
            <Button
              onClick={() => {
                setForm(emptySupplierForm)
                setErrors({})
                setDialog({ open: true, editing: null })
              }}
              className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            >
              <Plus className="mr-2 h-4 w-4" /> Cadastrar fornecedor
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <ErpEmptyState
          title="Nenhum fornecedor encontrado"
          description={`Nada para "${search}". Tente outro termo.`}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-400">
                <th className="px-3 py-2">Fornecedor</th>
                <th className="px-3 py-2">Contato</th>
                <th className="px-3 py-2">Produtos / serviços</th>
                <th className="px-3 py-2">Pagamento</th>
                <th className="px-3 py-2">Entrega</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2 font-medium text-zinc-100">{s.name}</td>
                  <td className="px-3 py-2 text-zinc-300">
                    {s.phone || '—'}
                    {s.email && <p className="text-[11px] text-zinc-500">{s.email}</p>}
                  </td>
                  <td className="max-w-[220px] px-3 py-2 text-zinc-300">{s.categories || '—'}</td>
                  <td className="px-3 py-2 text-zinc-300">{s.payment_terms || '—'}</td>
                  <td className="px-3 py-2 text-zinc-300">{s.delivery_time || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] text-zinc-300 hover:bg-white/10"
                        onClick={() => {
                          setForm(supplierFormFrom(s))
                          setErrors({})
                          setDialog({ open: true, editing: s })
                        }}
                      >
                        <Pencil className="mr-1 h-3 w-3" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-red-300 hover:bg-red-400/10"
                        onClick={() => setDeleteTarget(s)}
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

      {/* Dialog fornecedor */}
      <Dialog
        open={dialog.open}
        onOpenChange={(o) => setDialog({ open: o, editing: dialog.editing })}
      >
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialog.editing ? 'Editar fornecedor' : 'Novo fornecedor'}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Dados de contato, condições de pagamento e prazo de entrega.
            </DialogDescription>
          </DialogHeader>
          <SupplierFields form={form} setForm={setForm} errors={errors} />
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
            <DialogTitle>Excluir fornecedor</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Excluir "{deleteTarget?.name}"? Esta ação não pode ser desfeita.
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
