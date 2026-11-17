// Baixa de conta (a receber ou a pagar): total ou PARCIAL, com valor e data.
// Parcial soma ao paid_amount existente; ao zerar o saldo, marca paid=true (paid_at=hoje).
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { registerPayment, remainingOf } from '@/services/finance'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { formatCurrency, formatDate, todayISO } from '@/lib/format'
import type { FinancialAccountRecord } from '@/types/erp'

export default function PaymentDialog({
  target,
  onClose,
  onPaid,
}: {
  target: FinancialAccountRecord | null
  onClose: () => void
  onPaid: () => Promise<void>
}) {
  const [mode, setMode] = useState<'total' | 'parcial'>('total')
  const [partial, setPartial] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target) {
      const rest = remainingOf(target)
      setMode(rest > 0 ? 'total' : 'total')
      setPartial(rest > 0 ? String(rest.toFixed(2)) : '')
      setDate(todayISO())
    }
  }, [target])

  if (!target) return null
  const restante = remainingOf(target)
  const kindLabel = target.kind === 'receber' ? 'recebimento' : 'pagamento'

  const confirm = async () => {
    const value = mode === 'total' ? restante : Number(partial)
    if (!value || value <= 0) {
      toast({ title: 'Informe um valor válido', variant: 'destructive' })
      return
    }
    if (value > restante + 0.005) {
      toast({
        title: 'Valor maior que o saldo',
        description: `O saldo em aberto é ${formatCurrency(restante)}.`,
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      await registerPayment(target.id, {
        amount: value,
        paid_at: date || todayISO(),
      })
      toast({
        title: mode === 'total' ? 'Conta quitada' : 'Pagamento parcial registrado',
        description:
          mode === 'total'
            ? `${formatCurrency(value)} em ${formatDate(date)}`
            : `Falta ${formatCurrency(restante - value)}`,
      })
      await onPaid()
    } catch (e) {
      toast({
        title: `Erro ao registrar ${kindLabel}`,
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Baixar conta</DialogTitle>
          <DialogDescription>
            {target.description} · saldo em aberto {formatCurrency(restante)}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as 'total' | 'parcial')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="total" id="pg-total" />
            <Label htmlFor="pg-total">Quitação total ({formatCurrency(restante)})</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="parcial" id="pg-parcial" />
            <Label htmlFor="pg-parcial">Parcial</Label>
          </div>
        </RadioGroup>

        {mode === 'parcial' && (
          <div>
            <Label>Valor desta baixa (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={restante}
              value={partial}
              onChange={(e) => setPartial(e.target.value)}
              className="bg-white/5"
            />
          </div>
        )}
        <div>
          <Label>Data {kindLabel === 'recebimento' ? 'do recebimento' : 'do pagamento'}</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-white/5"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            onClick={confirm}
            disabled={saving}
            className="bg-emerald-500 text-white hover:bg-emerald-400"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
