// Aba de categorias de receitas e despesas — CRUD simples com confirmação de exclusão.
import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { createCategory, deleteCategory } from '@/services/finance'
import { ErpSectionTitle } from '../ErpShared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { FinanceCategoryKind, FinanceCategoryRecord } from '@/types/finance'

export default function CategoriesTab({
  categories,
  onChanged,
}: {
  categories: FinanceCategoryRecord[]
  onChanged: () => Promise<void>
}) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<FinanceCategoryKind>('despesa')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FinanceCategoryRecord | null>(null)

  const add = async () => {
    if (!name.trim()) {
      toast({ title: 'Informe o nome da categoria', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await createCategory({ name, kind })
      toast({ title: 'Categoria criada' })
      setName('')
      await onChanged()
    } catch (e) {
      toast({
        title: 'Erro ao criar categoria',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteCategory(deleteTarget.id, deleteTarget.name)
      toast({ title: 'Categoria excluída' })
      setDeleteTarget(null)
      await onChanged()
    } catch (e) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const receitas = categories.filter((c) => c.kind === 'receita')
  const despesas = categories.filter((c) => c.kind === 'despesa')

  const list = (title: string, rows: FinanceCategoryRecord[]) => (
    <div>
      <ErpSectionTitle>{title}</ErpSectionTitle>
      {rows.length === 0 ? (
        <p className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-zinc-500">
          Nenhuma categoria ainda — cadastre a primeira ao lado.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
            >
              <span className="text-zinc-100">{c.name}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-red-300 hover:bg-red-400/10"
                onClick={() => setDeleteTarget(c)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <div>
      <ErpSectionTitle>Categorias de receitas e despesas</ErpSectionTitle>
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <div className="min-w-[200px] flex-1">
          <Label>Nova categoria</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Material, Frete, Impostos…"
            className="bg-white/5"
          />
        </div>
        <div className="w-40">
          <Label>Tipo</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as FinanceCategoryKind)}>
            <SelectTrigger className="bg-white/5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={add}
          disabled={saving}
          className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1 h-4 w-4" />
          )}{' '}
          Adicionar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {list('Receitas', receitas)}
        {list('Despesas', despesas)}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir "{deleteTarget?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 text-white hover:bg-red-400"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
