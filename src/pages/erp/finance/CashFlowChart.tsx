// Gráfico de fluxo de caixa — barras em CSS puro (sem dependências extras), alternando dia/semana/mês.
import { formatCurrency } from '@/lib/format'
import { weekLabel, type CashFlowBucket, type CashFlowPeriod } from '@/lib/erp-finance'
import { ErpEmptyState } from '../ErpShared'

export default function CashFlowChart({
  buckets,
  period,
}: {
  buckets: CashFlowBucket[]
  period: CashFlowPeriod
}) {
  const max = Math.max(...buckets.map((b) => Math.max(b.entradas, b.saidas)), 1)
  const totalIn = buckets.reduce((a, b) => a + b.entradas, 0)
  const totalOut = buckets.reduce((a, b) => a + b.saidas, 0)
  const labelOf = (b: CashFlowBucket) => (period === 'semana' ? weekLabel(b.key) : b.label)

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-2 text-zinc-300">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Entradas:{' '}
          {formatCurrency(totalIn)}
        </span>
        <span className="flex items-center gap-2 text-zinc-300">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-400" /> Saídas: {formatCurrency(totalOut)}
        </span>
        <span className="text-zinc-400">
          Resultado do período:{' '}
          <strong className={totalIn - totalOut >= 0 ? 'text-emerald-300' : 'text-red-300'}>
            {formatCurrency(totalIn - totalOut)}
          </strong>
        </span>
      </div>

      {buckets.every((b) => b.entradas === 0 && b.saidas === 0) ? (
        <ErpEmptyState
          title="Sem movimentações no período"
          description="O fluxo de caixa mostra apenas dinheiro que efetivamente entrou ou saiu (baixas de contas). Contas em aberto não aparecem aqui."
        />
      ) : (
        <div className="rounded-lg border border-white/10 p-4">
          <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ height: 220 }}>
            {buckets.map((b) => (
              <div
                key={b.key}
                className="flex min-w-[36px] flex-1 flex-col items-center justify-end gap-1"
              >
                <div className="flex h-[160px] w-full items-end justify-center gap-[3px]">
                  {b.entradas > 0 && (
                    <div
                      className="w-1/2 rounded-t bg-emerald-400/80"
                      style={{ height: `${(b.entradas / max) * 100}%` }}
                      title={`Entradas: ${formatCurrency(b.entradas)}`}
                    />
                  )}
                  {b.saidas > 0 && (
                    <div
                      className="w-1/2 rounded-t bg-red-400/80"
                      style={{ height: `${(b.saidas / max) * 100}%` }}
                      title={`Saídas: ${formatCurrency(b.saidas)}`}
                    />
                  )}
                </div>
                <span className="whitespace-nowrap text-[10px] text-zinc-400">{labelOf(b)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
