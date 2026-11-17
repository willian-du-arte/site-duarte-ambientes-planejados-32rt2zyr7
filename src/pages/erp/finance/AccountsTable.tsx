// Tabela de contas (a receber ou a pagar) com ações de baixa total/parcial, editar e excluir.
import { Loader2, Pencil, Trash2, Banknote, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { formatCurrency, formatDate, isOverdue } from '@/lib/format'
import { remainingOf } from '@/services/finance'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ErpEmptyState } from '../ErpShared'
import type { FinancialAccountRecord } from '@/types/erp'

export default function AccountsTable({
  rows,
  clientName,
  onEdit,
  onPay,
  onDelete,
}: {
  rows: FinancialAccountRecord[]
  clientName: (id: string) => string
  onEdit: (a: FinancialAccountRecord) => void
  onPay: (a: FinancialAccountRecord) => void
  onDelete: (a: FinancialAccountRecord) => void
}) {
  const [payingId, setPayingId] = useState<string | null>(null)

  if (rows.length === 0) {
    return (
      <ErpEmptyState
        title="Nenhuma conta nesta visão"
        description="Contas a receber são geradas pela aprovação de orçamentos; contas a pagar surgem de compras pendentes ou cadastro manual."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-400">
            <th className="px-3 py-2">Descrição</th>
            <th className="px-3 py-2">Cliente / Fornecedor</th>
            <th className="px-3 py-2">Vencimento</th>
            <th className="px-3 py-2">Valor</th>
            <th className="px-3 py-2">Pago</th>
            <th className="px-3 py-2">Situação</th>
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const overdue = !a.paid && !!a.due_date && isOverdue(a.due_date)
            const restante = remainingOf(a)
            return (
              <tr
                key={a.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
              >
                <td className="px-3 py-2 text-zinc-100">
                  {a.description}
                  {a.installment_total && a.installment_total > 1 && (
                    <p className="text-[11px] text-zinc-500">
                      parcela {a.installment_number ?? '—'}/{a.installment_total}
                    </p>
                  )}
                  {a.project?.title && (
                    <p className="text-[11px] text-zinc-500">Projeto: {a.project.title}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-300">
                  {a.expand?.client?.name ?? a.expand?.supplier?.name ?? '—'}
                </td>
                <td className={`px-3 py-2 ${overdue ? 'text-red-300' : 'text-zinc-300'}`}>
                  {formatDate(a.due_date)}
                </td>
                <td className="px-3 py-2 text-zinc-100">{formatCurrency(a.amount ?? 0)}</td>
                <td className="px-3 py-2">
                  {(a.paid_amount ?? 0) > 0 ? (
                    <span className="text-emerald-300">
                      {formatCurrency(a.paid_amount ?? 0)}
                      {!a.paid && (
                        <p className="text-[11px] text-zinc-500">
                          falta {formatCurrency(restante)}
                        </p>
                      )}
                    </span>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    className={
                      a.paid
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                        : overdue
                          ? 'border-red-400/30 bg-red-400/10 text-red-300'
                          : 'border-white/15 bg-white/5 text-zinc-300'
                    }
                  >
                    {a.paid
                      ? a.paid_at
                        ? `recebido ${formatDate(a.paid_at)}`
                        : 'quitado'
                      : overdue
                        ? 'vencido'
                        : 'em aberto'}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {!a.paid && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-emerald-300 hover:bg-emerald-400/10"
                          disabled={payingId === a.id}
                          onClick={() => onPay(a)}
                        >
                          {payingId === a.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Banknote className="mr-1 h-3.5 w-3.5" /> Baixar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-amber-200 hover:bg-amber-300/10"
                          onClick={() => onPay(a)}
                        >
                          <MoreHorizontal className="mr-1 h-3.5 w-3.5" /> Parcial
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] text-zinc-300 hover:bg-white/10"
                      onClick={() => onEdit(a)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] text-red-300 hover:bg-red-400/10"
                      onClick={() => onDelete(a)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
