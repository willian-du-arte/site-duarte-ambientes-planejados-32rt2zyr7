// Módulo RENTABILIDADE (Etapa 4): custos reais × valor contratado por projeto.
// Compras vinculadas + custos avulsos (cost_items) formam o custo real;
// contas a receber mostram o caixa efetivamente entrado.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ErpEmptyState, ErpPageHeader, ErpSectionTitle, ErpStatCard } from './ErpShared'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { listProjects } from '@/services/erp'
import { listAccounts } from '@/services/finance'
import { listPurchases } from '@/services/inventory'
import { createCostItem, deleteCostItem, listCostItems } from '@/services/costs'
import type { ProjectRecord } from '@/types/erp'
import type { PurchaseRecord } from '@/types/inventory'
import type { CostCategory } from '@/types/costs'
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  emptyCostItemForm,
  type CostItemFormValues,
} from '@/types/costs'
import {
  LOW_MARGIN_THRESHOLD,
  computeProjectProfit,
  profitTotals,
  type ProjectProfitRow,
} from '@/lib/erp-profitability'
import useRealtime from '@/hooks/use-realtime'

export default function ErpProfitability() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [accounts, setAccounts] = useState<Awaited<ReturnType<typeof listAccounts>>>([])
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([])
  const [costItems, setCostItems] = useState<Awaited<ReturnType<typeof listCostItems>>>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dialogFor, setDialogFor] = useState<ProjectRecord | null>(null)

  const reload = useCallback(async () => {
    try {
      const [pj, ac, pc, ci] = await Promise.all([
        listProjects(),
        listAccounts(),
        listPurchases(),
        listCostItems(),
      ])
      setProjects(pj)
      setAccounts(ac)
      setPurchases(pc)
      setCostItems(ci)
    } catch {
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os dados de rentabilidade.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void reload()
  }, [reload])

  // Atualização ao vivo: uma assinatura por coleção (hook aceita uma coleção só).
  useRealtime('cost_items', () => void reload())
  useRealtime('projects', () => void reload())
  useRealtime('financial_accounts', () => void reload())
  useRealtime('purchases', () => void reload())

  const rows = useMemo(
    () => computeProjectProfit(projects, accounts, purchases, costItems),
    [projects, accounts, purchases, costItems],
  )
  const totals = profitTotals(rows)

  if (loading) {
    return <div className="p-6 text-sm text-zinc-400">Carregando rentabilidade…</div>
  }

  return (
    <div>
      <ErpPageHeader
        title="Rentabilidade"
        subtitle="Custos reais por projeto: faturamento contratado × realizado (compras + custos avulsos) × caixa recebido."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ErpStatCard label="Contratado" value={formatCurrency(totals.contracted)} tone="wood" />
        <ErpStatCard
          label="Custos reais"
          value={formatCurrency(totals.totalCost)}
          hint={`Compras ${formatCurrency(totals.totalCost - rows.reduce((a, r) => a + r.extraCosts, 0))} · avulsos ${formatCurrency(rows.reduce((a, r) => a + r.extraCosts, 0))}`}
        />
        <ErpStatCard
          label="Resultado bruto"
          value={formatCurrency(totals.grossResult)}
          tone={totals.grossResult >= 0 ? 'positive' : 'negative'}
          hint="Contratado − custos reais (lucro)"
        />
        <ErpStatCard
          label="Margem média"
          value={`${totals.margin.toFixed(1)}%`}
          tone={totals.margin >= LOW_MARGIN_THRESHOLD ? 'positive' : 'negative'}
          hint={`Abaixo de ${LOW_MARGIN_THRESHOLD}%: ${totals.lowMarginCount} projeto(s)`}
        />
        <ErpStatCard
          label="Recebido (caixa)"
          value={formatCurrency(totals.received)}
          hint="Somente baixas de contas a receber"
        />
      </div>

      {rows.length === 0 ? (
        <ErpEmptyState
          title="Nenhum projeto para analisar"
          description="Aprove um orçamento para gerar um projeto — a rentabilidade aparece aqui a partir das compras vinculadas e dos custos lançados."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-400">
                <th className="px-3 py-2">Projeto</th>
                <th className="px-3 py-2">Contratado</th>
                <th className="px-3 py-2">Custo real</th>
                <th className="px-3 py-2">Orçado (estimado)</th>
                <th className="px-3 py-2">Desvio</th>
                <th className="px-3 py-2">Recebido</th>
                <th className="px-3 py-2 text-right">Margem</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <ProfitRow
                  key={r.project.id}
                  row={r}
                  expanded={expanded === r.project.id}
                  onToggle={() => setExpanded(expanded === r.project.id ? null : r.project.id)}
                  onAddCost={() => setDialogFor(r.project)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CostItemDialog
        project={dialogFor}
        onClose={() => setDialogFor(null)}
        onSaved={() => {
          setDialogFor(null)
          void reload()
        }}
      />
    </div>
  )
}

function ProfitRow({
  row,
  expanded,
  onToggle,
  onAddCost,
}: {
  row: ProjectProfitRow
  expanded: boolean
  onToggle: () => void
  onAddCost: () => void
}) {
  const estimated = row.project.cost_value ?? 0
  const deviation = row.totalCost - estimated
  return (
    <>
      <tr
        className={cn(
          'cursor-pointer border-b border-white/5 hover:bg-white/[0.03]',
          row.lowMargin && 'bg-red-400/[0.04]',
        )}
        onClick={onToggle}
      >
        <td className="px-3 py-2 text-zinc-100">
          {row.project.title}
          <p className="text-[11px] text-zinc-500">
            {row.project.expand?.client?.name ?? '—'}
            {row.project.delivered_at ? ` · entregue ${formatDate(row.project.delivered_at)}` : ''}
          </p>
        </td>
        <td className="px-3 py-2 text-zinc-300">{formatCurrency(row.contracted)}</td>
        <td className="px-3 py-2 text-red-300">
          {formatCurrency(row.totalCost)}
          <p className="text-[11px] text-zinc-500">
            compras {formatCurrency(row.purchaseCosts)} · avulsos {formatCurrency(row.extraCosts)}
          </p>
        </td>
        <td className="px-3 py-2 text-zinc-500">{formatCurrency(estimated)}</td>
        <td
          className={cn(
            'px-3 py-2',
            deviation > 0 ? 'text-red-300' : deviation < 0 ? 'text-emerald-300' : 'text-zinc-500',
          )}
        >
          {deviation === 0 ? '—' : `${deviation > 0 ? '+' : ''}${formatCurrency(deviation)}`}
        </td>
        <td className="px-3 py-2 text-emerald-300">{formatCurrency(row.received)}</td>
        <td className="px-3 py-2 text-right">
          {row.contracted > 0 ? (
            <Badge
              variant="outline"
              className={cn(
                row.lowMargin
                  ? 'border-red-400/40 bg-red-400/10 text-red-300'
                  : 'border-emerald-400/30 bg-emerald-400/5 text-emerald-300',
              )}
            >
              {row.margin.toFixed(1)}%{row.lowMargin ? ' · baixa' : ''}
            </Badge>
          ) : (
            <span className="text-zinc-500">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" onClick={onAddCost}>
            Lançar custo
          </Button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-white/5 bg-black/20">
          <td colSpan={8} className="px-3 py-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {row.categories
                .filter((c) => c.total > 0)
                .map((c) => (
                  <div key={c.category} className="rounded-md border border-white/10 p-2">
                    <p className="text-[11px] uppercase tracking-wider text-zinc-400">{c.label}</p>
                    <p className="text-sm text-zinc-100">{formatCurrency(c.total)}</p>
                    <p className="text-[10px] text-zinc-500">
                      compras {formatCurrency(c.purchases)} · avulsos {formatCurrency(c.extra)}
                    </p>
                  </div>
                ))}
              {row.categories.every((c) => c.total === 0) && (
                <p className="text-xs text-zinc-500">
                  Sem custos lançados — vincule compras ao projeto ou lance custos avulsos.
                </p>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-zinc-400">
              <span>
                Resultado bruto:{' '}
                <span className={row.grossResult >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                  {formatCurrency(row.grossResult)}
                </span>
              </span>
              <span>
                Caixa (recebido − custos):{' '}
                <span className={row.cashResult >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                  {formatCurrency(row.cashResult)}
                </span>
              </span>
              <span>A receber em aberto: {formatCurrency(row.openReceivable)}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function CostItemDialog({
  project,
  onClose,
  onSaved,
}: {
  project: ProjectRecord | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState<CostItemFormValues>(emptyCostItemForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (project) {
      setForm({
        ...emptyCostItemForm,
        project: project.id,
        date: new Date().toISOString().slice(0, 10),
      })
    }
  }, [project])

  const set = (k: keyof CostItemFormValues, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!project) return
    if (!form.description.trim() || !form.amount) {
      toast({ title: 'Preencha descrição e valor', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await createCostItem(form)
      toast({ title: 'Custo lançado', description: form.description })
      onSaved()
    } catch (e) {
      toast({
        title: 'Erro ao salvar',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!project} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar custo — {project?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Descrição *</label>
            <Input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Ex.: Instalação terceirizada"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Categoria *</label>
              <Select
                value={form.category}
                onValueChange={(v) => set('category', v as CostCategory)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {COST_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {COST_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Valor (R$) *</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Data</label>
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Observações</label>
            <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : 'Lançar custo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
