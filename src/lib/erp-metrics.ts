// Cálculos do dashboard do Duarte Gestão.
// DIFERENCIA claramente:
//  - Faturamento do mês    = valor contratado em projetos COM entrega finalizada no mês
//                            (competência — venda realizada, independente de ter entrado no caixa)
//  - Recebido no mês       = contas a receber com pagamento quitado no mês (caixa)
//  - Lucro estimado        = faturamento - custos dos projetos - despesas do mês
import type { FinancialAccountRecord, ProjectRecord, QuoteRecord } from '@/types/erp'

const ym = (iso?: string | null): string => (iso ? iso.slice(0, 10).slice(0, 7) : '')
const ymNow = (): string => new Date().toISOString().slice(0, 7)

const inMonth = (iso: string | null | undefined, month: string): boolean => ym(iso) === month
const isDone = (p: ProjectRecord): boolean => p.status === 'concluido'
const isOverdueProject = (p: ProjectRecord): boolean =>
  p.status === 'em_andamento' &&
  !!p.expected_delivery &&
  p.expected_delivery.slice(0, 10) < new Date().toISOString().slice(0, 10)

export interface DashboardNumbers {
  month: string
  revenueMonth: number // faturamento do mês (competência — projetos finalizados no mês)
  receivedMonth: number // dinheiro efetivamente recebido no mês (caixa)
  paidMonth: number // dinheiro efetivamente pago no mês (caixa)
  salesClosedTotal: number // total de vendas fechadas (soma dos valores contratados)
  salesClosedCount: number
  receivableOpen: number // a receber em aberto
  payableOpen: number // a pagar em aberto
  balance: number // saldo financeiro = recebido total - pago total
  expensesMonth: number // despesas do mês (contas a pagar quitadas no mês)
  estimatedProfit: number // lucro estimado do mês
  quotesOpen: number // orçamentos em aberto (rascunho + enviado)
  quotesOpenValue: number
  projectsRunning: number
  projectsOverdue: number
  nextDeliveries: ProjectRecord[]
  pendingTasks: number
  awaitingReturn: number // oportunidades com próxima ação vencida
  monthlySeries: { month: string; faturamento: number; despesas: number }[]
  salesSeries: { month: string; vendas: number }[]
}

export function computeDashboard(
  projects: ProjectRecord[],
  accounts: FinancialAccountRecord[],
  quotes: QuoteRecord[],
  taskCount: { total: number; done: number },
): DashboardNumbers {
  const month = ymNow()
  const receivable = accounts.filter((a) => a.kind === 'receber')
  const payable = accounts.filter((a) => a.kind === 'pagar')

  const revenueMonth = projects
    .filter((p) => isDone(p) && inMonth(p.delivered_at, month))
    .reduce((acc, p) => acc + (p.contracted_value ?? 0), 0)

  const receivedMonth = receivable
    .filter((a) => a.paid && inMonth(a.paid_at, month))
    .reduce((acc, a) => acc + (a.paid_amount ?? a.amount ?? 0), 0)

  const paidMonth = payable
    .filter((a) => a.paid && inMonth(a.paid_at, month))
    .reduce((acc, a) => acc + (a.paid_amount ?? a.amount ?? 0), 0)

  const doneProjects = projects.filter((p) => p.status !== 'cancelado')
  const salesClosedTotal = doneProjects.reduce((acc, p) => acc + (p.contracted_value ?? 0), 0)
  const salesClosedCount = doneProjects.length

  const receivableOpen = receivable
    .filter((a) => !a.paid)
    .reduce((acc, a) => acc + Math.max((a.amount ?? 0) - (a.paid_amount ?? 0), 0), 0)
  const payableOpen = payable
    .filter((a) => !a.paid)
    .reduce((acc, a) => acc + Math.max((a.amount ?? 0) - (a.paid_amount ?? 0), 0), 0)

  const receivedTotal = receivable.reduce(
    (acc, a) => acc + (a.paid_amount ?? (a.paid ? (a.amount ?? 0) : 0)),
    0,
  )
  const paidTotal = payable.reduce(
    (acc, a) => acc + (a.paid_amount ?? (a.paid ? (a.amount ?? 0) : 0)),
    0,
  )
  const balance = receivedTotal - paidTotal

  const expensesMonth = payable
    .filter((a) => a.paid && inMonth(a.paid_at, month))
    .reduce((acc, a) => acc + (a.paid_amount ?? a.amount ?? 0), 0)

  const projectCosts = projects
    .filter((p) => isDone(p) && inMonth(p.delivered_at, month))
    .reduce((acc, p) => acc + (p.cost_value ?? 0), 0)
  const estimatedProfit = revenueMonth - projectCosts - expensesMonth

  const openQuotes = quotes.filter((q) => q.status === 'rascunho' || q.status === 'enviado')
  const quotesOpen = openQuotes.length
  const quotesOpenValue = openQuotes.reduce((acc, q) => acc + (q.final_price ?? 0), 0)

  const running = projects.filter((p) => p.status === 'em_andamento')
  const overdue = running.filter(isOverdueProject)

  const nextDeliveries = running
    .filter((p) => !!p.expected_delivery)
    .sort((a, b) => (a.expected_delivery! < b.expected_delivery! ? -1 : 1))
    .slice(0, 6)

  const awaitingReturn = taskCount.total - taskCount.done

  // Série dos últimos 6 meses (competência de projetos concluídos vs. contas pagas).
  const months: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const monthlySeries = months.map((m) => ({
    month: m,
    faturamento: projects
      .filter((p) => isDone(p) && inMonth(p.delivered_at, m))
      .reduce((acc, p) => acc + (p.contracted_value ?? 0), 0),
    despesas: payable
      .filter((a) => a.paid && inMonth(a.paid_at, m))
      .reduce((acc, a) => acc + (a.paid_amount ?? a.amount ?? 0), 0),
  }))

  const salesSeries = months.map((m) => ({
    month: m,
    vendas: projects
      .filter((p) => p.status !== 'cancelado' && inMonth(p.created, m))
      .reduce((acc, p) => acc + (p.contracted_value ?? 0), 0),
  }))

  return {
    month,
    revenueMonth,
    receivedMonth,
    paidMonth,
    salesClosedTotal,
    salesClosedCount,
    receivableOpen,
    payableOpen,
    balance,
    expensesMonth,
    estimatedProfit,
    quotesOpen,
    quotesOpenValue,
    projectsRunning: running.length,
    projectsOverdue: overdue.length,
    nextDeliveries,
    pendingTasks: awaitingReturn,
    awaitingReturn,
    monthlySeries,
    salesSeries,
  }
}
