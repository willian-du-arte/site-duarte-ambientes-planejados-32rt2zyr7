// Diálogo de criar/editar conta financeira, com validação (ErpValidationError) e activity_log.
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { ErpValidationError, getErrorMessage } from '@/lib/pocketbase/errors'
import { createAccount, updateAccount } from '@/services/erp'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  AccountFormValues,
  AccountKind,
  FinancialAccountRecord,
  ProjectRecord,
} from '@/types/erp'

const emptyForm: AccountFormValues = {
  kind: 'receber',
  description: '',
  amount: '',
  due_date: '',
  client: '',
  supplier: '',
  project: '',
  purchase: '',
  category: '',
  installment_number: '',
  installment_total: '',
  notes: '',
}

const CATEGORIES_RECEBER = ['Entrada', 'Parcela', 'Sinal', 'Outros']
const CATEGORIES_PAGAR = ['Material', 'Mão de obra', 'Ferragens', 'Frete', 'Impostos', 'Outros']

export default function AccountDialog({
  open,
  onOpenChange,
  editing,
  kind,
  projects,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: FinancialAccountRecord | null
  kind: AccountKind
  projects: ProjectRecord[]
  onSaved: () => Promise<void>
}) {
  const [form, setForm] = useState<AccountFormValues>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setErrors({})
      if (editing) {
        setForm({
          kind: editing.kind as AccountKind,
          description: editing.description ?? '',
          amount: editing.amount != null ? String(editing.amount) : '',
          due_date: editing.due_date ? editing.due_date.slice(0, 10) : '',
          client: editing.client ?? '',
          supplier: editing.supplier ?? '',
          project: editing.project ?? '',
          purchase: editing.purchase ?? '',
          category: editing.category ?? '',
          installment_number:
            editing.installment_number != null ? String(editing.installment_number) : '',
          installment_total:
            editing.installment_total != null ? String(editing.installment_total) : '',
          notes: editing.notes ?? '',
        })
      } else {
        setForm({ ...emptyForm, kind })
      }
    }
  }, [open, editing, kind])

  const set = (patch: Partial<AccountFormValues>) => setForm((f) => ({ ...f, ...patch }))

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.description.trim()) e.description = 'Informe a descrição.'
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Informe um valor maior que zero.'
    if (!form.due_date) e.due_date = 'Informe o vencimento.'
    if (form.kind === 'receber' && !form.client) e.client = 'Vincule um cliente.'
    if (form.kind === 'pagar' && !form.supplier) e.supplier = 'Vincule um fornecedor.'
    if (form.installment_total && Number(form.installment_total) < 1)
      e.installment_total = 'Total de parcelas deve ser ao menos 1.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) {
        await updateAccount(editing.id, form)
        toast({ title: 'Conta atualizada' })
      } else {
        await createAccount(form)
        toast({ title: 'Conta criada' })
      }
      await onSaved()
    } catch (err) {
      if (err instanceof ErpValidationError) {
        setErrors(err.fields)
        toast({ title: 'Verifique os campos', variant: 'destructive' })
      } else {
        toast({
          title: 'Erro ao salvar',
          description: getErrorMessage(err),
          variant: 'destructive',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const cats = form.kind === 'receber' ? CATEGORIES_RECEBER : CATEGORIES_PAGAR

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? 'Editar conta'
              : form.kind === 'receber'
                ? 'Nova conta a receber'
                : 'Nova conta a pagar'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Contas a receber costumam nascer da aprovação de orçamento — cadastre aqui variações
            manuais.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Descrição *</Label>
            <Input
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              className="bg-white/5"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-300">{errors.description}</p>
            )}
          </div>
          <div>
            <Label>Valor (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => set({ amount: e.target.value })}
              className="bg-white/5"
            />
            {errors.amount && <p className="mt-1 text-xs text-red-300">{errors.amount}</p>}
          </div>
          <div>
            <Label>Vencimento *</Label>
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => set({ due_date: e.target.value })}
              className="bg-white/5"
            />
            {errors.due_date && <p className="mt-1 text-xs text-red-300">{errors.due_date}</p>}
          </div>
          <div>
            <Label>Cliente</Label>
            <ClientSelect value={form.client} onChange={(v) => set({ client: v })} />
            {errors.client && <p className="mt-1 text-xs text-red-300">{errors.client}</p>}
          </div>
          <div>
            <Label>Fornecedor</Label>
            <SupplierSelect value={form.supplier} onChange={(v) => set({ supplier: v })} />
            {errors.supplier && <p className="mt-1 text-xs text-red-300">{errors.supplier}</p>}
          </div>
          <div>
            <Label>Projeto</Label>
            <Select
              value={form.project || '_none'}
              onValueChange={(v) => set({ project: v === '_none' ? '' : v })}
            >
              <SelectTrigger className="bg-white/5">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Nenhum</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select
              value={form.category || '_none'}
              onValueChange={(v) => set({ category: v === '_none' ? '' : v })}
            >
              <SelectTrigger className="bg-white/5">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {cats.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Parcela (nº)</Label>
            <Input
              type="number"
              min="1"
              value={form.installment_number}
              onChange={(e) => set({ installment_number: e.target.value })}
              className="bg-white/5"
            />
          </div>
          <div>
            <Label>Total de parcelas</Label>
            <Input
              type="number"
              min="1"
              value={form.installment_total}
              onChange={(e) => set({ installment_total: e.target.value })}
              className="bg-white/5"
            />
            {errors.installment_total && (
              <p className="mt-1 text-xs text-red-300">{errors.installment_total}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
              className="bg-white/5"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
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
  )
}

// selects de cliente/fornecedor carregados sob demanda
import { listClients } from '@/services/erp'
import { listSuppliers } from '@/services/inventory'
import type { ClientRecord } from '@/types/erp'
import type { SupplierRecord } from '@/types/inventory'

function ClientSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [clients, setClients] = useState<ClientRecord[]>([])
  useEffect(() => {
    listClients()
      .then(setClients)
      .catch(() => {})
  }, [])
  return (
    <Select value={value || '_none'} onValueChange={(v) => onChange(v === '_none' ? '' : v)}>
      <SelectTrigger className="bg-white/5">
        <SelectValue placeholder="Nenhum" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">Nenhum</SelectItem>
        {clients.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function SupplierSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  useEffect(() => {
    listSuppliers()
      .then(setSuppliers)
      .catch(() => {})
  }, [])
  return (
    <Select value={value || '_none'} onValueChange={(v) => onChange(v === '_none' ? '' : v)}>
      <SelectTrigger className="bg-white/5">
        <SelectValue placeholder="Nenhum" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">Nenhum</SelectItem>
        {suppliers.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
