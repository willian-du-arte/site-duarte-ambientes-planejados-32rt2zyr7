// MÓDULO FINANCEIRO COMPLETO (Etapa 3) — substitui a lista simples de ErpModules.
// Abas: A receber · A pagar · Fluxo de caixa (dia/semana/mês) · Categorias · Resultado por projeto.
// Indicadores separam FATURAMENTO (contratado), CAIXA (recebido/pago) e LUCRO ESTIMADO.
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  Loader2,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Scale,
  AlertTriangle,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { ErpPageHeader, ErpEmptyState, ErpStatCard, ErpSectionTitle } from './ErpShared'
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
import {
  createAccount,
  deleteAccount,
  listAccounts,
  markAccountPaid,
  remainingOf,
  updateAccount,
} from '@/services/erp'
import {
  createCategory,
  deleteCategory,
  listAccounts as listFinanceAccounts,
  listCategories,
} from '@/services/finance'
import {
  buildCashFlow,
  computeFinanceIndicators,
  computeProjectResults,
  type CashFlowPeriod,
} from '@/lib/erp-finance'
import { formatCurrency, formatDate, isOverdue, todayISO } from '@/lib/format'
import type {
  AccountFormValues,
  AccountKind,
  FinancialAccountRecord,
  ProjectRecord,
} from '@/types/erp'
import type { PurchaseRecord } from '@/types/inventory'
import type { FinanceCategoryRecord } from '@/types/finance'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AccountDialog from './finance/AccountDialog'
import AccountsTable from './finance/AccountsTable'
import PaymentDialog from './finance/PaymentDialog'
import CashFlowChart from './finance/CashFlowChart'
import CategoriesTab from './finance/CategoriesTab'
import ProjectResults from './finance/ProjectResults'
import { useClientNames } from './QuoteClientSelect'

type TabKey = 'receber' | 'pagar' | 'fluxo' | 'categorias' | 'projetos'

export default function ErpFinance() {
  const [accounts, setAccounts] = useState<FinancialAccountRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([])
  const [categories, setCategories] = useState<FinanceCategoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('receber')
  const [period, setPeriod] = useState<CashFlowPeriod>('mes')

  // dialogs
  const [dialogKind, setDialogKind] = useState<AccountKind>('receber')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FinancialAccountRecord | null>(null)
  const [payTarget, setPayTarget] = useState<FinancialAccountRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FinancialAccountRecord | null>(null)

  const load = useCallback(async () => {
    const [accs, prjs, purchs, cats] = await Promise.all([
      listFinanceAccounts(),
      import('@/services/erp').then((m) => m.listProjects()),
      import('@/services/inventory').then((m) => m.listPurchases()),
      listCategories(),
    ])
    setAccounts(accs)
    setProjects(prjs)
    setPurchases(purchs)
    setCategories(cats)
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        await load()
      } catch (e) {
        toast({
          title: 'Erro ao carregar dados financeiros',
          description: getErrorMessage(e),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [load])

  const indicators = useMemo(
    () => computeFinanceIndicators(accounts, projects),
    [accounts, projects],
  )
  const cashFlow = useMemo(() => buildCashFlow(accounts, period), [accounts, period])
  const projectRows = useMemo(
    () => computeProjectResults(projects, accounts, purchases),
    [projects, accounts, purchases],
  )
  const clientName = useClientNames()

  const receber = accounts.filter((a) => a.kind === 'receber')
  const pagar = accounts.filter((a) => a.kind === 'pagar')
  const openOf = (rows: FinancialAccountRecord[]) =>
    rows.filter((a) => !a.paid).reduce((acc, a) => acc + remainingOf(a), 0)

  const openNew = (kind: AccountKind) => {
    setEditing(null)
    setDialogKind(kind)
    setDialogOpen(true)
  }
  const openEdit = (a: FinancialAccountRecord) => {
    setEditing(a)
    setDialogKind(a.kind as AccountKind)
    setDialogOpen(true)
  }

  const handleSaved = async () => {
    setDialogOpen(false)
    setEditing(null)
    await load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteAccount(deleteTarget.id)
      toast({ title: 'Conta excluída' })
      setDeleteTarget(null)
      await load()
    } catch (e) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(e), variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-300" />
      </div>
    )
  }

  return (
    <div>
      <ErpPageHeader
        title="Financeiro"
        subtitle="Faturamento ≠ caixa ≠ lucro: cada indicador mostra uma coisa diferente."
        actions={
          <>
            <ButtonNew kind="receber" onClick={() => openNew('receber')} />
            <ButtonNew kind="pagar" onClick={() => openNew('pagar')} />
          </>
        }
      />

      {/* Indicadores — cada um mede uma coisa diferente */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ErpStatCard
          label="Faturamento contratado"
          value={formatCurrency(indicators.contractedTotal)}
          hint="Valor contratado em projetos (competência — não é dinheiro no caixa)"
          tone="wood"
        />
        <ErpStatCard
          label="Recebido (caixa)"
          value={formatCurrency(indicators.receivedTotal)}
          hint={`Pago a fornecedores: ${formatCurrency(indicators.paidTotal)} · Saldo de caixa: ${formatCurrency(indicators.cashBalance)}`}
          tone="positive"
        />
        <ErpStatCard
          label="Em aberto"
          value={`${formatCurrency(indicators.receivableOpen)} / ${formatCurrency(indicators.payableOpen)}`}
          hint={`A receber / A pagar · Inadimplência (vencido): ${formatCurrency(indicators.overdueReceivable)}`}
          tone="warning"
        />
        <ErpStatCard
          label="Lucro estimado"
          value={formatCurrency(indicators.estimatedProfit)}
          hint="Faturamento − custo estimado dos projetos (competência — não é caixa)"
          tone={indicators.estimatedProfit >= 0 ? 'default' : 'negative'}
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="mb-4 bg-white/5">
          <TabsTrigger value="receber">A receber</TabsTrigger>
          <TabsTrigger value="pagar">A pagar</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de caixa</TabsTrigger>
          <TabsTrigger value="projetos">Resultado por projeto</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'receber' && (
        <section>
          <ErpSectionTitle>
            Contas a receber — {receber.length} conta(s), {formatCurrency(openOf(receber))} em
            aberto
          </ErpSectionTitle>
          <AccountsTable
            rows={receber}
            clientName={clientName}
            onEdit={openEdit}
            onPay={setPayTarget}
            onDelete={setDeleteTarget}
          />
        </section>
      )}

      {tab === 'pagar' && (
        <section>
          <ErpSectionTitle>
            Contas a pagar — {pagar.length} conta(s), {formatCurrency(openOf(pagar))} em aberto
          </ErpSectionTitle>
          <AccountsTable
            rows={pagar}
            clientName={clientName}
            onEdit={openEdit}
            onPay={setPayTarget}
            onDelete={setDeleteTarget}
          />
        </section>
      )}

      {tab === 'fluxo' && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <ErpSectionTitle>Fluxo de caixa — dinheiro que entrou e saiu de fato</ErpSectionTitle>
            <PeriodToggle period={period} setPeriod={setPeriod} />
          </div>
          <CashFlowChart buckets={cashFlow} period={period} />
        </section>
      )}

      {tab === 'projetos' && (
        <section>
          <ErpSectionTitle>Resultado por projeto — recebido (caixa) − custos reais</ErpSectionTitle>
          <ProjectResults rows={projectRows} />
        </section>
      )}

      {tab === 'categorias' && <CategoriesTab categories={categories} onChanged={load} />}

      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        kind={dialogKind}
        projects={projects}
        onSaved={handleSaved}
      />
      <PaymentDialog
        target={payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={async () => {
          setPayTarget(null)
          await load()
        }}
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir "{deleteTarget?.description}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

function ButtonNew({ kind, onClick }: { kind: AccountKind; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        kind === 'receber'
          ? 'inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400'
          : 'inline-flex items-center gap-2 rounded-md bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-amber-200'
      }
    >
      <Plus className="h-4 w-4" /> Nova conta a {kind === 'receber' ? 'receber' : 'pagar'}
    </button>
  )
}

function PeriodToggle({
  period,
  setPeriod,
}: {
  period: CashFlowPeriod
  setPeriod: (p: CashFlowPeriod) => void
}) {
  const opts: { key: CashFlowPeriod; label: string }[] = [
    { key: 'dia', label: 'Diário' },
    { key: 'semana', label: 'Semanal' },
    { key: 'mes', label: 'Mensal' },
  ]
  return (
    <div className="flex overflow-hidden rounded-md border border-white/15">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => setPeriod(o.key)}
          className={
            period === o.key
              ? 'bg-amber-300 px-3 py-1.5 text-xs font-medium text-zinc-900'
              : 'px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10'
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
