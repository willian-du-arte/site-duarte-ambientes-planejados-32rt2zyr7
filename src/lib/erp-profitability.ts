// Cálculos do módulo RENTABILIDADE (Etapa 4).
// Por projeto compara:
//  - Contratado (faturamento): contracted_value do projeto
//  - Custos REAIS por categoria: compras vinculadas (não canceladas) + cost_items (custos
//    avulsos como mão de obra, transporte, instalação)
//  - Recebido real (caixa): paid_amount das contas a receber do projeto
// Margem = resultado bruto (contratado - custos) / contratado.
// Diferencia sempre faturamento × caixa × lucro, como pedido do usuário.
import type { FinancialAccountRecord, ProjectRecord } from '@/types/erp'
import type { PurchaseRecord } from '@/types/inventory'
import type { CostItemRecord } from '@/types/costs'
import { COST_CATEGORIES, COST_CATEGORY_LABELS, type CostCategory } from '@/types/costs'
import { remainingOf } from '@/services/finance'

export const LOW_MARGIN_THRESHOLD = 15

export interface CostByCategory {
  category: CostCategory
  label: string
  purchases: number // veio de compras vinculadas
  extra: number // veio de cost_items (lançamento manual)
  total: number
}

export interface ProjectProfitRow {
  project: ProjectRecord
  contracted: number // faturamento (competência)
  received: number // caixa recebido
  openReceivable: number
  purchaseCosts: number // compras vinculadas (não canceladas)
  extraCosts: number // cost_items
  totalCost: number
  grossResult: number // contratado - custos reais
  margin: number // % sobre o contratado
  lowMargin: boolean
  categories: CostByCategory[]
  cashResult: number // recebido - custos reais (visão de caixa)
}

function emptyCategories(): CostByCategory[] {
  return COST_CATEGORIES.map((c) => ({
    category: c,
    label: COST_CATEGORY_LABELS[c],
    purchases: 0,
    extra: 0,
    total: 0,
  }))
}

/** Categoria de custo de uma compra, inferida da descrição do lançamento. */
export function purchaseCategory(p: PurchaseRecord): CostCategory {
  const d = (p.description ?? '').toLowerCase()
  if (d.includes('mdf') || d.includes('painel') || d.includes('chapa')) return 'mdf'
  if (
    d.includes('ferragem') ||
    d.includes('corredi') ||
    d.includes('dobradi') ||
    d.includes('puxador') ||
    d.includes('charneira')
  ) {
    return 'ferragens'
  }
  if (d.includes('corte') || d.includes('usinagem') || d.includes('fita de borda')) {
    return 'corte_usinagem'
  }
  if (d.includes('frete') || d.includes('transporte')) return 'transporte'
  if (d.includes('instala')) return 'instalacao'
  return 'outros'
}

function categoryOfCost(c: CostItemRecord): CostCategory {
  const v = (c.category ?? '') as CostCategory
  return COST_CATEGORIES.includes(v) ? v : 'outros'
}

export function computeProjectProfit(
  projects: ProjectRecord[],
  accounts: FinancialAccountRecord[],
  purchases: PurchaseRecord[],
  costItems: CostItemRecord[],
): ProjectProfitRow[] {
  const active = projects.filter((p) => p.status !== 'cancelado')
  return active
    .map((p) => {
      const accs = accounts.filter((a) => a.project === p.id)
      const received = accs
        .filter((a) => a.kind === 'receber')
        .reduce((acc, a) => acc + (a.paid_amount ?? 0), 0)
      const openReceivable = accs
        .filter((a) => a.kind === 'receber' && !a.paid)
        .reduce((acc, a) => acc + remainingOf(a), 0)

      const cats = emptyCategories()
      for (const pc of purchases) {
        if (pc.project !== p.id || pc.status === 'cancelado') continue
        const c = purchaseCategory(pc)
        const val = pc.total ?? 0
        cats.find((x) => x.category === c)!.purchases += val
      }
      for (const ci of costItems) {
        if (ci.project !== p.id) continue
        const c = categoryOfCost(ci)
        cats.find((x) => x.category === c)!.extra += ci.amount ?? 0
      }
      for (const c of cats) c.total = c.purchases + c.extra

      const purchaseCosts = cats.reduce((acc, c) => acc + c.purchases, 0)
      const extraCosts = cats.reduce((acc, c) => acc + c.extra, 0)
      const totalCost = purchaseCosts + extraCosts
      const contracted = p.contracted_value ?? 0
      const grossResult = contracted - totalCost
      const margin = contracted > 0 ? (grossResult / contracted) * 100 : 0

      return {
        project: p,
        contracted,
        received,
        openReceivable,
        purchaseCosts,
        extraCosts,
        totalCost,
        grossResult,
        margin,
        lowMargin: contracted > 0 && margin < LOW_MARGIN_THRESHOLD,
        categories: cats,
        cashResult: received - totalCost,
      }
    })
    .sort((a, b) => b.contracted - a.contracted)
}

export interface ProfitTotals {
  contracted: number
  received: number
  totalCost: number
  grossResult: number
  margin: number
  lowMarginCount: number
}

export function profitTotals(rows: ProjectProfitRow[]): ProfitTotals {
  const contracted = rows.reduce((a, r) => a + r.contracted, 0)
  const totalCost = rows.reduce((a, r) => a + r.totalCost, 0)
  const received = rows.reduce((a, r) => a + r.received, 0)
  const grossResult = contracted - totalCost
  return {
    contracted,
    received,
    totalCost,
    grossResult,
    margin: contracted > 0 ? (grossResult / contracted) * 100 : 0,
    lowMarginCount: rows.filter((r) => r.lowMargin).length,
  }
}
