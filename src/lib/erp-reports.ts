// Cálculos dos RELATÓRIOS GERENCIAIS (Etapa 4).
// Todos os indicadores são filtros sobre os MESMOS dados já cadastrados
// (projetos, orçamentos, contas, compras, clientes) — nada fictício.
// Diferencia sempre faturamento (contratado) × caixa (recebido/pago) × lucro.
import type { ClientRecord, FinancialAccountRecord, ProjectRecord, QuoteRecord } from '@/types/erp'
import type { PurchaseRecord } from '@/types/inventory'
import { purchaseCategory } from '@/lib/erp-profitability'
import { COST_CATEGORY_LABELS, type CostCategory } from '@/types/costs'

export interface ReportFilters {
  from: string // AAAA-MM-DD (inclusive) — competência do projeto/conta
  to: string
  clientId: string // '' = todos
  projectId: string // '' = todos
  category: string // '' = todas (categoria de custo)
}

export interface ReportData {
  // faturamento (competência — projetos do período)
  contracted: number
  // caixa
  received: number
  paid: number
  cashFlow: number
  // custos e lucro
  realCosts: number
  estimatedCosts: number
  profit: number
  avgMargin: number
  avgTicket: number
  // conversão
  quotesTotal: number
  quotesApproved: number
  quoteConversion: number
  quotesValue: number
  // clientes
  newClients: number
  // listas detalhadas
  projectsInPeriod: ProjectRecord[]
  expensesByCategory: { label: string; total: number }[]
  profitByProject: {
    id: string
    title: string
    contracted: number
    costs: number
    profit: number
  }[]
  salesByEnvironment: { label: string; total: number; count: number }[]
  monthlySeries: { month: string; faturamento: number; despesas: number }[]
  projectsRunning: number
}

const ym = (iso?: string | null): string => (iso ? iso.slice(0, 10).slice(0, 7) : '')

/** Data de competência do projeto: entrega finalizada > criação. */
function projectDate(p: ProjectRecord): string {
  return (p.delivered_at ?? p.created ?? '').slice(0, 10)
}

/** Data de competência da conta: baixa (paid_at) quando quitada, senão vencimento. */
function accountDate(a: FinancialAccountRecord): string {
  return (a.paid ? a.paid_at : (a.due_date ?? a.created ?? '')).slice(0, 10)
}

function inRange(date: string, f: ReportFilters): boolean {
  if (!date) return false
  if (f.from && date < f.from) return false
  if (f.to && date > f.to) return false
  return true
}

export function computeReport(
  filters: ReportFilters,
  projects: ProjectRecord[],
  accounts: FinancialAccountRecord[],
  quotes: QuoteRecord[],
  clients: ClientRecord[],
  purchases: PurchaseRecord[],
): ReportData {
  const matchProject = (p: ProjectRecord): boolean =>
    (!filters.clientId || p.client === filters.clientId) &&
    (!filters.projectId || p.id === filters.projectId)

  const inPeriodProjects = projects.filter(
    (p) => p.status !== 'cancelado' && matchProject(p) && inRange(projectDate(p), filters),
  )
  const contracted = inPeriodProjects.reduce((a, p) => a + (p.contracted_value ?? 0), 0)

  // Despesas (caixa): contas a pagar quitadas no período
  const paidAccounts = accounts.filter(
    (a) =>
      a.kind === 'pagar' &&
      a.paid &&
      matchProjectLoose(a, filters) &&
      inRange(accountDate(a), filters),
  )
  const paid = paidAccounts.reduce((a, x) => a + (x.paid_amount ?? x.amount ?? 0), 0)

  // Recebimentos (caixa): contas a receber com baixa no período
  const receivedAccounts = accounts.filter(
    (a) =>
      a.kind === 'receber' && matchProjectLoose(a, filters) && inRange(accountDate(a), filters),
  )
  const received = receivedAccounts.reduce((a, x) => a + (x.paid_amount ?? 0), 0)

  // Custos reais de compras vinculadas a projetos do período
  const projectIds = new Set(inPeriodProjects.map((p) => p.id))
  const realPurchases = purchases.filter(
    (pc) => pc.project && projectIds.has(pc.project) && pc.status !== 'cancelado',
  )
  const realCosts = realPurchases.reduce((a, pc) => a + (pc.total ?? 0), 0)
  const estimatedCosts = inPeriodProjects.reduce((a, p) => a + (p.cost_value ?? 0), 0)

  const profit = contracted - realCosts
  const avgMargin = contracted > 0 ? (profit / contracted) * 100 : 0
  const avgTicket = inPeriodProjects.length > 0 ? contracted / inPeriodProjects.length : 0

  // Despesas por categoria (contas a pagar quitadas + compras sem projeto)
  const catTotals = new Map<CostCategory, number>()
  for (const a of paidAccounts) {
    const pc = purchases.find((x) => x.id === a.purchase)
    const cat: CostCategory = pc ? purchaseCategory(pc) : 'outros'
    catTotals.set(cat, (catTotals.get(cat) ?? 0) + (a.paid_amount ?? a.amount ?? 0))
  }
  for (const pc of realPurchases) {
    const cat = purchaseCategory(pc)
    catTotals.set(cat, (catTotals.get(cat) ?? 0) + (pc.total ?? 0))
  }
  const expensesByCategory = [...catTotals.entries()]
    .map(([c, total]) => ({ label: COST_CATEGORY_LABELS[c], total }))
    .filter((e) => (filters.category ? e.label === filters.category : true))
    .sort((a, b) => b.total - a.total)

  // Lucro por projeto
  const profitByProject = inPeriodProjects
    .map((p) => {
      const costs = realPurchases
        .filter((pc) => pc.project === p.id)
        .reduce((a, pc) => a + (pc.total ?? 0), 0)
      return {
        id: p.id,
        title: p.title,
        contracted: p.contracted_value ?? 0,
        costs,
        profit: (p.contracted_value ?? 0) - costs,
      }
    })
    .sort((a, b) => b.profit - a.profit)

  // Vendas por tipo de ambiente: vem do campo environments do orçamento
  // vinculado ao projeto (o projeto em si não tem environments); se o
  // orçamento não tem o campo, cai em "Não informado".
  const envTotals = new Map<string, { total: number; count: number }>()
  for (const p of inPeriodProjects) {
    const raw = p.expand?.quote?.environments ?? ''
    const envs = raw
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
    const list = envs.length ? envs : ['Não informado']
    for (const e of list) {
      const cur = envTotals.get(e) ?? { total: 0, count: 0 }
      cur.total += (p.contracted_value ?? 0) / list.length
      cur.count += 1
      envTotals.set(e, cur)
    }
  }
  const salesByEnvironment = [...envTotals.entries()]
    .map(([label, v]) => ({ label, total: Math.round(v.total * 100) / 100, count: v.count }))
    .sort((a, b) => b.total - a.total)

  // Orçamentos do período (por data de criação, com filtro de cliente)
  const periodQuotes = quotes.filter(
    (q) =>
      (!filters.clientId || q.client === filters.clientId) &&
      inRange((q.created ?? '').slice(0, 10), filters),
  )
  const quotesTotal = periodQuotes.length
  const quotesApproved = periodQuotes.filter((q) => q.status === 'aprovado').length
  const quotesValue = periodQuotes.reduce((a, q) => a + (q.final_price ?? 0), 0)

  // Clientes novos no período
  const newClients = clients.filter((c) => inRange((c.created ?? '').slice(0, 10), filters)).length

  // Série mensal dentro do período (faturamento por competência × despesas pagas)
  const months: string[] = []
  if (filters.from || filters.to) {
    const start = (filters.from || filters.to).slice(0, 7)
    const end = (filters.to || filters.from).slice(0, 7)
    let [y, m] = start.split('-').map(Number)
    const [ey, em] = end.split('-').map(Number)
    let guard = 0
    while ((y < ey || (y === ey && m <= em)) && guard < 36) {
      months.push(`${y}-${String(m).padStart(2, '0')}`)
      m += 1
      if (m > 12) {
        m = 1
        y += 1
      }
      guard += 1
    }
  }
  const monthlySeries = months.map((mo) => ({
    month: mo,
    faturamento: projects
      .filter(
        (p) =>
          p.status !== 'cancelado' &&
          matchProject(p) &&
          ym(p.delivered_at ?? p.created) === mo &&
          inRange(projectDate(p), filters),
      )
      .reduce((a, p) => a + (p.contracted_value ?? 0), 0),
    despesas: paidAccounts
      .filter((a) => ym(a.paid_at ?? a.due_date) === mo)
      .reduce((a, x) => a + (x.paid_amount ?? x.amount ?? 0), 0),
  }))

  const projectsRunning = projects.filter(
    (p) => p.status === 'em_andamento' && matchProject(p),
  ).length

  return {
    contracted,
    received,
    paid,
    cashFlow: received - paid,
    realCosts,
    estimatedCosts,
    profit,
    avgMargin,
    avgTicket,
    quotesTotal,
    quotesApproved,
    quoteConversion: quotesTotal > 0 ? (quotesApproved / quotesTotal) * 100 : 0,
    quotesValue,
    newClients,
    projectsInPeriod: inPeriodProjects,
    expensesByCategory,
    profitByProject,
    salesByEnvironment,
    monthlySeries,
    projectsRunning,
  }
}

/** Filtro de conta "frouxo": por cliente (projeto pode não estar preenchido na conta). */
function matchProjectLoose(a: FinancialAccountRecord, f: ReportFilters): boolean {
  if (!f.clientId) return true
  if (a.client === f.clientId) return true
  return false
}
