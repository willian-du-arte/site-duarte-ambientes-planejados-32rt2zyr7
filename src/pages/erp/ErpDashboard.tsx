// Dashboard geral do Duarte Gestão — indicadores calculados de dados reais + gráficos.
import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, CalendarClock, ClipboardList, TrendingUp } from 'lucide-react'
import { ErpPageHeader, ErpSectionTitle, ErpStatCard, ErpEmptyState } from './ErpShared'
import { computeDashboard } from '@/lib/erp-metrics'
import { formatCurrency, formatDate, formatMonthLabel, isOverdue } from '@/lib/format'
import {
  listAccounts,
  listOpportunities,
  listProjects,
  listQuotes,
  listTasks,
} from '@/services/erp'
import { FUNNEL_STAGE_LABELS, type OpportunityRecord } from '@/types/erp'
import { Link } from 'react-router-dom'

const CHART_COLORS = ['#d4af37', '#a16207', '#eab308', '#facc15', '#854d0e', '#fbbf24']

export default function ErpDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof listProjects>>>([])
  const [accounts, setAccounts] = useState<Awaited<ReturnType<typeof listAccounts>>>([])
  const [quotes, setQuotes] = useState<Awaited<ReturnType<typeof listQuotes>>>([])
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof listTasks>>>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [p, a, q, t, o] = await Promise.all([
          listProjects(),
          listAccounts(),
          listQuotes(),
          listTasks(),
          listOpportunities(),
        ])
        if (!alive) return
        setProjects(p)
        setAccounts(a)
        setQuotes(q)
        setTasks(t)
        setOpportunities(o)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Erro ao carregar os dados.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const stats = useMemo(
    () =>
      computeDashboard(projects, accounts, quotes, {
        total: tasks.length,
        done: tasks.filter((t) => t.done).length,
      }),
    [projects, accounts, quotes, tasks],
  )

  const monthlyData = useMemo(
    () =>
      stats.monthlySeries.map((r) => ({
        ...r,
        label: formatMonthLabel(r.month),
      })),
    [stats.monthlySeries],
  )
  const salesData = useMemo(
    () => stats.salesSeries.map((r) => ({ ...r, label: formatMonthLabel(r.month) })),
    [stats.salesSeries],
  )

  const funnelOpen = useMemo(() => {
    const open = opportunities.filter(
      (o) => o.stage !== 'venda_fechada' && o.stage !== 'venda_perdida',
    )
    return open.length
  }, [opportunities])

  const overdueActions = useMemo(
    () =>
      opportunities.filter(
        (o) =>
          o.next_action_date &&
          isOverdue(o.next_action_date) &&
          o.stage !== 'venda_fechada' &&
          o.stage !== 'venda_perdida',
      ),
    [opportunities],
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-300" />
      </div>
    )
  }
  if (error) {
    return (
      <p className="rounded-md border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-300">
        {error}
      </p>
    )
  }

  const money = (v: number) => formatCurrency(v)

  return (
    <div>
      <ErpPageHeader
        title="Dashboard"
        subtitle="Visão geral do negócio — números calculados dos seus dados reais."
      />

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <ErpStatCard
          label="Faturamento do mês"
          value={money(stats.revenueMonth)}
          hint="Projetos concluídos no mês (competência)"
          tone="wood"
        />
        <ErpStatCard
          label="Recebido no mês"
          value={money(stats.receivedMonth)}
          hint="Dinheiro que entrou no caixa"
        />
        <ErpStatCard
          label="Despesas do mês"
          value={money(stats.expensesMonth)}
          hint="Contas pagas no mês"
          tone={stats.expensesMonth > 0 ? 'warning' : 'default'}
        />
        <ErpStatCard
          label="Lucro estimado do mês"
          value={money(stats.estimatedProfit)}
          hint="Faturamento − custos − despesas"
          tone={stats.estimatedProfit >= 0 ? 'positive' : 'negative'}
        />
        <ErpStatCard
          label="Vendas fechadas"
          value={money(stats.salesClosedTotal)}
          hint={`${stats.salesClosedCount} projeto(s) contratado(s)`}
          tone="wood"
        />
        <ErpStatCard
          label="A receber (em aberto)"
          value={money(stats.receivableOpen)}
          hint="Contas a receber ainda não quitadas"
        />
        <ErpStatCard
          label="A pagar (em aberto)"
          value={money(stats.payableOpen)}
          hint="Contas a pagar ainda não quitadas"
        />
        <ErpStatCard
          label="Saldo financeiro"
          value={money(stats.balance)}
          hint="Total recebido − total pago"
          tone={stats.balance >= 0 ? 'positive' : 'negative'}
        />
        <ErpStatCard
          label="Orçamentos em aberto"
          value={String(stats.quotesOpen)}
          hint={`${money(stats.quotesOpenValue)} em propostas`}
        />
        <ErpStatCard
          label="Projetos em andamento"
          value={String(stats.projectsRunning)}
          hint={
            stats.projectsOverdue > 0 ? `${stats.projectsOverdue} atrasado(s)` : 'Nenhum atrasado'
          }
          tone={stats.projectsOverdue > 0 ? 'warning' : 'default'}
        />
        <ErpStatCard
          label="Oportunidades no funil"
          value={String(funnelOpen)}
          hint="Em aberto (exclui fechadas/perdidas)"
        />
        <ErpStatCard
          label="Pendências"
          value={String(stats.pendingTasks)}
          hint="Tarefas em aberto"
        />
      </div>

      {/* Gráficos */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <ErpSectionTitle>Faturamento × Despesas (últimos 6 meses)</ErpSectionTitle>
          <div className="h-72 rounded-lg border border-white/10 bg-white/[0.03] p-3">
            {monthlyData.every((d) => d.faturamento === 0 && d.despesas === 0) ? (
              <ErpEmptyState
                title="Sem dados ainda"
                description="Os gráficos aparecem quando houver projetos concluídos e contas pagas."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" stroke="#a1a1aa" fontSize={11} />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickFormatter={(v: number) =>
                      `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                    }
                  />
                  <Tooltip
                    formatter={(value: number | string) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: '#1d1f24',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#f4f4f5',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                  <Bar
                    dataKey="faturamento"
                    name="Faturamento"
                    fill="#d4af37"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="despesas" name="Despesas" fill="#a16207" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section>
          <ErpSectionTitle>Vendas fechadas por mês</ErpSectionTitle>
          <div className="h-72 rounded-lg border border-white/10 bg-white/[0.03] p-3">
            {salesData.every((d) => d.vendas === 0) ? (
              <ErpEmptyState
                title="Sem dados ainda"
                description="As vendas aparecem quando orçamentos aprovados virarem projetos."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" stroke="#a1a1aa" fontSize={11} />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickFormatter={(v: number) =>
                      `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                    }
                  />
                  <Tooltip
                    formatter={(value: number | string) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: '#1d1f24',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#f4f4f5',
                    }}
                  />
                  <Bar dataKey="vendas" name="Vendas" fill="#eab308" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      {/* Próximas entregas + pendências + alertas */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section>
          <ErpSectionTitle>
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Próximas entregas
            </span>
          </ErpSectionTitle>
          {stats.nextDeliveries.length === 0 ? (
            <ErpEmptyState
              title="Nenhuma entrega prevista"
              description="Projetos em andamento com prazo aparecerão aqui."
            />
          ) : (
            <ul className="space-y-2">
              {stats.nextDeliveries.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                >
                  <span className="truncate text-zinc-200">{p.title}</span>
                  <span
                    className={isOverdue(p.expected_delivery) ? 'text-red-300' : 'text-amber-200'}
                  >
                    {formatDate(p.expected_delivery)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <ErpSectionTitle>
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Clientes aguardando retorno
            </span>
          </ErpSectionTitle>
          {overdueActions.length === 0 ? (
            <ErpEmptyState
              title="Nada atrasado"
              description="Nenhuma próxima ação vencida no funil."
            />
          ) : (
            <ul className="space-y-2">
              {overdueActions.slice(0, 6).map((o) => (
                <li
                  key={o.id}
                  className="rounded-md border border-red-400/30 bg-red-400/5 px-3 py-2 text-sm"
                >
                  <p className="truncate text-zinc-200">{o.title}</p>
                  <p className="text-xs text-red-300">
                    {FUNNEL_STAGE_LABELS[o.stage]} · ação vencida {formatDate(o.next_action_date)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/erp/clientes"
            className="mt-3 inline-block text-xs text-amber-200 hover:underline"
          >
            Abrir CRM →
          </Link>
        </section>

        <section>
          <ErpSectionTitle>
            <span className="inline-flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Tarefas em aberto
            </span>
          </ErpSectionTitle>
          {tasks.filter((t) => !t.done).length === 0 ? (
            <ErpEmptyState title="Nenhuma tarefa pendente" />
          ) : (
            <ul className="space-y-2">
              {tasks
                .filter((t) => !t.done)
                .slice(0, 6)
                .map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span className="truncate text-zinc-200">{t.title}</span>
                    <span className="text-xs text-zinc-400">
                      {t.due_date ? formatDate(t.due_date) : 'sem prazo'}
                    </span>
                  </li>
                ))}
            </ul>
          )}
          <Link
            to="/erp/tarefas"
            className="mt-3 inline-block text-xs text-amber-200 hover:underline"
          >
            Ver todas →
          </Link>
        </section>
      </div>
    </div>
  )
}
