// Cálculos do módulo Financeiro (Etapa 3).
// DIFERENCIA claramente (alerta do usuário):
//  - Faturamento     = valor CONTRATADO em projetos (competência, não é caixa)
//  - Caixa           = dinheiro que efetivamente ENTROU (recebido) e SAIU (pago)
//  - Lucro           = faturamento - custos estimados (competência)
//  - Resultado por projeto = recebido (caixa) - custos reais atribuídos (compras/estoque)
import type { FinancialAccountRecord, ProjectRecord } from '@/types/erp'
import type { PurchaseRecord } from '@/types/inventory'
import { remainingOf } from '@/services/finance'

export type CashFlowPeriod = 'dia' | 'semana' | 'mes'

export interface CashFlowBucket {
  key: string // AAAA-MM-DD (dia/semana) ou AAAA-MM (mês)
  label: string
  entradas: number
  saidas: number
}

const dayKey = (iso: string | null | undefined): string => (iso ? iso.slice(0, 10) : '')

function isoWeekKey(d: Date): string {
  // semana ISO: segunda-feira como início
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = (date.getDay() + 6) % 7 // 0 = segunda
  date.setDate(date.getDate() - day)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

export function weekLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return key
  const start = new Date(y, m - 1, d)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (x: Date) =>
    `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}`
  return `${fmt(start)} – ${fmt(end)}`
}

/**
 * Fluxo de caixa REAL: apenas valores efetivamente movimentados.
 *  - Entrada  = paid_amount de contas a receber (parciais contam pelo que entrou)
 *  - Saída    = paid_amount de contas a pagar (compras quitadas entram aqui)
 * A data do movimento é paid_at; contas sem paid_at entram pela data de baixa do dia atual.
 */
export function buildCashFlow(
  accounts: FinancialAccountRecord[],
  period: CashFlowPeriod,
  today = new Date(),
): CashFlowBucket[] {
  const buckets = new Map<string, CashFlowBucket>()
  const push = (key: string, label: string, field: 'entradas' | 'saidas', value: number) => {
    const b = buckets.get(key) ?? { key, label, entradas: 0, saidas: 0 }
    b[field] += value
    buckets.set(key, b)
  }

  for (const a of accounts) {
    const paid = a.paid_amount ?? 0
    if (paid <= 0) continue
    const when = a.paid_at ? dayKey(a.paid_at) : dayKey(new Date().toISOString())
    if (!when) continue
    if (period === 'dia') {
      const [y, m, d] = when.split('-')
      push(when, `${d}/${m}/${y}`, a.kind === 'receber' ? 'entradas' : 'saidas', paid)
    } else if (period === 'semana') {
      push(
        isoWeekKey(new Date(when + 'T12:00:00')),
        '',
        a.kind === 'receber' ? 'entradas' : 'saidas',
        paid,
      )
    } else {
      const ym = when.slice(0, 7)
      push(ym, ym, a.kind === 'receber' ? 'entradas' : 'saidas', paid)
    }
  }

  // preenche o eixo temporal (mesmo sem movimento) terminando no período atual
  const keys: string[] = []
  if (period === 'dia') {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
      keys.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      )
    }
  } else if (period === 'semana') {
    for (let i = 7; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i * 7)
      keys.push(isoWeekKey(d))
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
  }

  const labelFor = (key: string): string => {
    if (period === 'dia') {
      const [y, m, d] = key.split('-')
      return `${d}/${m}`
    }
    if (period === 'semana') return weekLabel(key)
    const [y, m] = key.split('-')
    const months = [
      'jan',
      'fev',
      'mar',
      'abr',
      'mai',
      'jun',
      'jul',
      'ago',
      'set',
      'out',
      'nov',
      'dez',
    ]
    return `${months[Number(m) - 1] ?? m}/${y.slice(2)}`
  }

  return keys.map(
    (k) =>
      buckets.get(k) ?? {
        key: k,
        label: labelFor(k),
        entradas: 0,
        saidas: 0,
      },
  )
}

// ---------- Indicadores ----------

export interface FinanceIndicators {
  // Caixa (dinheiro que entrou/saiu de fato)
  receivedTotal: number
  paidTotal: number
  cashBalance: number
  // Em aberto
  receivableOpen: number
  payableOpen: number
  overdueReceivable: number // inadimplência (a receber vencido)
  overduePayable: number
  // Competência (faturamento ≠ caixa)
  contractedTotal: number // faturamento contratado (projetos não cancelados)
  estimatedCostTotal: number // custo estimado dos projetos
  estimatedProfit: number // lucro estimado = faturamento - custo estimado
}

export function computeFinanceIndicators(
  accounts: FinancialAccountRecord[],
  projects: ProjectRecord[],
): FinanceIndicators {
  const receivable = accounts.filter((a) => a.kind === 'receber')
  const payable = accounts.filter((a) => a.kind === 'pagar')
  const today = new Date().toISOString().slice(0, 10)

  const paidOf = (a: FinancialAccountRecord) => a.paid_amount ?? 0

  const receivedTotal = receivable.reduce((acc, a) => acc + paidOf(a), 0)
  const paidTotal = payable.reduce((acc, a) => acc + paidOf(a), 0)

  const receivableOpen = receivable
    .filter((a) => !a.paid)
    .reduce((acc, a) => acc + remainingOf(a), 0)
  const payableOpen = payable.filter((a) => !a.paid).reduce((acc, a) => acc + remainingOf(a), 0)

  const overdueReceivable = receivable
    .filter((a) => !a.paid && a.due_date && a.due_date.slice(0, 10) < today)
    .reduce((acc, a) => acc + remainingOf(a), 0)
  const overduePayable = payable
    .filter((a) => !a.paid && a.due_date && a.due_date.slice(0, 10) < today)
    .reduce((acc, a) => acc + remainingOf(a), 0)

  const active = projects.filter((p) => p.status !== 'cancelado')
  const contractedTotal = active.reduce((acc, p) => acc + (p.contracted_value ?? 0), 0)
  const estimatedCostTotal = active.reduce((acc, p) => acc + (p.cost_value ?? 0), 0)

  return {
    receivedTotal,
    paidTotal,
    cashBalance: receivedTotal - paidTotal,
    receivableOpen,
    payableOpen,
    overdueReceivable,
    overduePayable,
    contractedTotal,
    estimatedCostTotal,
    estimatedProfit: contractedTotal - estimatedCostTotal,
  }
}

// ---------- Resultado por projeto (custos REAIS) ----------

export interface ProjectFinanceRow {
  project: ProjectRecord
  contracted: number // valor contratado (faturamento)
  received: number // caixa: soma de paid_amount das contas a receber do projeto
  openReceivable: number // saldo a receber
  costs: number // custos REAIS: compras atribuídas ao projeto (soma paid_amount; senão total)
  estimatedCost: number // custo estimado (campo cost_value do projeto)
  result: number // recebido - custos reais
  margin: number // resultado / contratado (%)
}

export function computeProjectResults(
  projects: ProjectRecord[],
  accounts: FinancialAccountRecord[],
  purchases: PurchaseRecord[],
): ProjectFinanceRow[] {
  return projects
    .filter((p) => p.status !== 'cancelado')
    .map((p) => {
      const accs = accounts.filter((a) => a.project === p.id)
      const received = accs
        .filter((a) => a.kind === 'receber')
        .reduce((acc, a) => acc + (a.paid_amount ?? 0), 0)
      const openReceivable = accs
        .filter((a) => a.kind === 'receber' && !a.paid)
        .reduce((acc, a) => acc + remainingOf(a), 0)

      // custo real atribuído = compras do projeto não canceladas (custo incorrido);
      // o custo estimado do orçamento (cost_value) fica separado, só para comparação.
      const costs = purchases
        .filter((pc) => pc.project === p.id && pc.status !== 'cancelado')
        .reduce((acc, pc) => acc + (pc.total ?? 0), 0)

      const contracted = p.contracted_value ?? 0
      const result = received - costs
      return {
        project: p,
        contracted,
        received,
        openReceivable,
        costs,
        estimatedCost: p.cost_value ?? 0,
        result,
        margin: contracted > 0 ? (result / contracted) * 100 : 0,
      }
    })
    .sort((a, b) => b.contracted - a.contracted)
}
