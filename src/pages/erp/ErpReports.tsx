// RELATÓRIOS GERENCIAIS (Etapa 4): filtros por período/cliente/projeto/categoria,
// indicadores e exportação CSV (Excel) + PDF (janela de impressão).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ErpEmptyState, ErpPageHeader, ErpSectionTitle, ErpStatCard } from './ErpShared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, formatMonthLabel } from '@/lib/format'
import { listClients, listProjects, listQuotes } from '@/services/erp'
import { listAccounts } from '@/services/finance'
import { listPurchases } from '@/services/inventory'
import type { ClientRecord, ProjectRecord, QuoteRecord } from '@/types/erp'
import type { PurchaseRecord } from '@/types/inventory'
import { computeReport, type ReportFilters } from '@/lib/erp-reports'
import { downloadCsv, printReport, type ReportTable } from '@/lib/report-export'

export default function ErpReports() {
  const { toast } = useToast()
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [quotes, setQuotes] = useState<QuoteRecord[]>([])
  const [accounts, setAccounts] = useState<Awaited<ReturnType<typeof listAccounts>>>([])
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([])
  const [loading, setLoading] = useState(true)

  const year = new Date().getFullYear()
  const [filters, setFilters] = useState<ReportFilters>({
    from: `${year}-01-01`,
    to: `${year}-12-31`,
    clientId: '',
    projectId: '',
    category: '',
  })

  const reload = useCallback(async () => {
    try {
      const [cl, pj, qt, ac, pc] = await Promise.all([
        listClients(),
        listProjects(),
        listQuotes(),
        listAccounts(),
        listPurchases(),
      ])
      setClients(cl)
      setProjects(pj)
      setQuotes(qt)
      setAccounts(ac)
      setPurchases(pc)
    } catch {
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os dados dos relatórios.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void reload()
  }, [reload])

  const report = useMemo(
    () => computeReport(filters, projects, accounts, quotes, clients, purchases),
    [filters, projects, accounts, quotes, clients, purchases],
  )

  const set = (k: keyof ReportFilters, v: string) => setFilters((f) => ({ ...f, [k]: v }))

  const hasData = report.projectsInPeriod.length > 0 || report.received > 0 || report.paid > 0

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '—'
  const periodLabel = `${formatDate(filters.from)} a ${formatDate(filters.to)}`
  const filterDesc = [
    periodLabel,
    filters.clientId ? `Cliente: ${clientName(filters.clientId)}` : 'Todos os clientes',
    filters.projectId
      ? `Projeto: ${projects.find((p) => p.id === filters.projectId)?.title ?? '—'}`
      : 'Todos os projetos',
  ].join(' · ')

  const buildTables = (): ReportTable[] => {
    const tables: ReportTable[] = [
      {
        title: 'Indicadores',
        columns: ['Indicador', 'Valor'],
        rows: [
          ['Faturamento (contratado)', formatCurrency(report.contracted)],
          ['Recebido (caixa)', formatCurrency(report.received)],
          ['Pago (caixa)', formatCurrency(report.paid)],
          ['Fluxo de caixa', formatCurrency(report.cashFlow)],
          ['Custos reais (compras)', formatCurrency(report.realCosts)],
          ['Custos estimados (orçamento)', formatCurrency(report.estimatedCosts)],
          ['Lucro (contratado − custos reais)', formatCurrency(report.profit)],
          ['Margem média', `${report.avgMargin.toFixed(1)}%`],
          ['Ticket médio', formatCurrency(report.avgTicket)],
          [
            'Orçamentos',
            `${report.quotesApproved}/${report.quotesTotal} aprovados (${report.quoteConversion.toFixed(0)}%)`,
          ],
          ['Valor cotado em orçamentos', formatCurrency(report.quotesValue)],
          ['Clientes novos', report.newClients],
          ['Projetos em andamento', report.projectsRunning],
        ],
      },
      {
        title: 'Lucro por projeto',
        columns: ['Projeto', 'Contratado', 'Custos', 'Lucro'],
        rows: report.profitByProject.map((p) => [
          p.title,
          formatCurrency(p.contracted),
          formatCurrency(p.costs),
          formatCurrency(p.profit),
        ]),
      },
      {
        title: 'Despesas por categoria',
        columns: ['Categoria', 'Total'],
        rows: report.expensesByCategory.map((e) => [e.label, formatCurrency(e.total)]),
      },
      {
        title: 'Vendas por ambiente',
        columns: ['Ambiente', 'Projetos', 'Total'],
        rows: report.salesByEnvironment.map((e) => [e.label, e.count, formatCurrency(e.total)]),
      },
    ]
    if (report.monthlySeries.length > 0) {
      tables.push({
        title: 'Série mensal (faturamento × despesas)',
        columns: ['Mês', 'Faturamento', 'Despesas', 'Resultado'],
        rows: report.monthlySeries.map((m) => [
          formatMonthLabel(m.month),
          formatCurrency(m.faturamento),
          formatCurrency(m.despesas),
          formatCurrency(m.faturamento - m.despesas),
        ]),
      })
    }
    return tables
  }

  const exportCsv = () => {
    downloadCsv(`relatorio-duarte-${filters.from}_${filters.to}.csv`, buildTables())
    toast({ title: 'CSV baixado', description: 'Abra direto no Excel.' })
  }

  const exportPdf = () => {
    void printReport('Relatório Gerencial — Duarte Ambientes Planejados', filterDesc, buildTables())
  }

  if (loading) {
    return <div className="p-6 text-sm text-zinc-400">Carregando relatórios…</div>
  }

  return (
    <div>
      <ErpPageHeader
        title="Relatórios"
        subtitle="Indicadores gerenciais a partir dos dados cadastrados — sem números fictícios."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!hasData}>
              Exportar Excel (CSV)
            </Button>
            <Button onClick={exportPdf} disabled={!hasData}>
              Exportar PDF (imprimir)
            </Button>
          </>
        }
      />

      {/* Filtros */}
      <div className="mb-6 grid gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">De</label>
          <Input type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Até</label>
          <Input type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Cliente</label>
          <Select
            value={filters.clientId || 'all'}
            onValueChange={(v) => set('clientId', v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Projeto</label>
          <Select
            value={filters.projectId || 'all'}
            onValueChange={(v) => set('projectId', v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {projects
                .filter((p) => !filters.clientId || p.client === filters.clientId)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Categoria de custo</label>
          <Select
            value={filters.category || 'all'}
            onValueChange={(v) => set('category', v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {report.expensesByCategory.map((e) => (
                <SelectItem key={e.label} value={e.label}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!hasData ? (
        <ErpEmptyState
          title="Nada no período selecionado"
          description="Cadastre clientes, aprove orçamentos e registre compras/contas — os relatórios são calculados só com dados reais."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ErpStatCard
              label="Faturamento (contratado)"
              value={formatCurrency(report.contracted)}
              tone="wood"
            />
            <ErpStatCard
              label="Recebido (caixa)"
              value={formatCurrency(report.received)}
              tone="positive"
            />
            <ErpStatCard label="Pago (caixa)" value={formatCurrency(report.paid)} tone="negative" />
            <ErpStatCard
              label="Fluxo de caixa"
              value={formatCurrency(report.cashFlow)}
              tone={report.cashFlow >= 0 ? 'positive' : 'negative'}
            />
            <ErpStatCard
              label="Lucro (contratado − custos)"
              value={formatCurrency(report.profit)}
            />
            <ErpStatCard label="Margem média" value={`${report.avgMargin.toFixed(1)}%`} />
            <ErpStatCard label="Ticket médio" value={formatCurrency(report.avgTicket)} />
            <ErpStatCard
              label="Conversão de orçamentos"
              value={`${report.quoteConversion.toFixed(0)}%`}
              hint={`${report.quotesApproved} de ${report.quotesTotal} aprovados`}
            />
            <ErpStatCard label="Clientes novos" value={String(report.newClients)} />
            <ErpStatCard label="Projetos em andamento" value={String(report.projectsRunning)} />
          </div>

          {report.expensesByCategory.length > 0 && (
            <section className="mb-6">
              <ErpSectionTitle>Despesas por categoria</ErpSectionTitle>
              <div className="space-y-1">
                {report.expensesByCategory.map((e) => {
                  const max = report.expensesByCategory[0].total || 1
                  return (
                    <div key={e.label} className="flex items-center gap-3 text-sm">
                      <span className="w-44 shrink-0 text-zinc-400">{e.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-amber-300/60"
                          style={{ width: `${Math.max((e.total / max) * 100, 2)}%` }}
                        />
                      </div>
                      <span className="w-28 text-right text-zinc-200">
                        {formatCurrency(e.total)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {report.profitByProject.length > 0 && (
            <section className="mb-6">
              <ErpSectionTitle>Lucro por projeto</ErpSectionTitle>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-400">
                      <th className="px-3 py-2">Projeto</th>
                      <th className="px-3 py-2">Contratado</th>
                      <th className="px-3 py-2">Custos reais</th>
                      <th className="px-3 py-2 text-right">Lucro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.profitByProject.map((p) => (
                      <tr key={p.id} className="border-b border-white/5 last:border-0">
                        <td className="px-3 py-2 text-zinc-100">{p.title}</td>
                        <td className="px-3 py-2 text-zinc-300">{formatCurrency(p.contracted)}</td>
                        <td className="px-3 py-2 text-red-300">{formatCurrency(p.costs)}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={p.profit >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                            {formatCurrency(p.profit)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {report.monthlySeries.length > 0 && (
            <section>
              <ErpSectionTitle>Faturamento × despesas por mês</ErpSectionTitle>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {report.monthlySeries.map((m) => (
                  <div key={m.month} className="rounded-md border border-white/10 p-2 text-center">
                    <p className="text-[11px] uppercase tracking-wider text-zinc-400">
                      {formatMonthLabel(m.month)}
                    </p>
                    <p className="text-sm text-emerald-300">{formatCurrency(m.faturamento)}</p>
                    <p className="text-xs text-red-300">{formatCurrency(m.despesas)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
