// Resultado por projeto: recebido (caixa) − custos reais atribuídos, por projeto.
// Separa claramente contratado (faturamento), recebido (caixa) e custos reais de compras.
import { formatCurrency } from '@/lib/format'
import { ErpEmptyState } from '../ErpShared'
import type { ProjectFinanceRow } from '@/lib/erp-finance'

export default function ProjectResults({ rows }: { rows: ProjectFinanceRow[] }) {
  if (rows.length === 0) {
    return (
      <ErpEmptyState
        title="Nenhum projeto"
        description="Aprovar um orçamento cria o projeto; o resultado aparece aqui quando houver recebimentos ou compras vinculadas."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-400">
            <th className="px-3 py-2">Projeto</th>
            <th className="px-3 py-2">Contratado</th>
            <th className="px-3 py-2">Recebido (caixa)</th>
            <th className="px-3 py-2">A receber</th>
            <th className="px-3 py-2">Custos reais</th>
            <th className="px-3 py-2">Custo estimado</th>
            <th className="px-3 py-2 text-right">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.project.id}
              className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
            >
              <td className="px-3 py-2 text-zinc-100">
                {r.project.title}
                <p className="text-[11px] text-zinc-500">{r.project.expand?.client?.name ?? '—'}</p>
              </td>
              <td className="px-3 py-2 text-zinc-300">{formatCurrency(r.contracted)}</td>
              <td className="px-3 py-2 text-emerald-300">{formatCurrency(r.received)}</td>
              <td className="px-3 py-2 text-zinc-400">{formatCurrency(r.openReceivable)}</td>
              <td className="px-3 py-2 text-red-300">{formatCurrency(r.costs)}</td>
              <td className="px-3 py-2 text-zinc-500">{formatCurrency(r.estimatedCost)}</td>
              <td className="px-3 py-2 text-right">
                <span className={r.result >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                  {formatCurrency(r.result)}
                </span>
                {r.contracted > 0 && (
                  <p className="text-[11px] text-zinc-500">
                    margem {r.margin.toFixed(1)}% do contratado
                  </p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
