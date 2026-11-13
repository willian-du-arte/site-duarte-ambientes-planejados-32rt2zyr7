// Etapas de produção padrão de um projeto contratado (mesma lista da migração 0004).
export const DEFAULT_PRODUCTION_STAGES: { key: string; name: string }[] = [
  { key: 'projeto_aprovado', name: 'Projeto aprovado' },
  { key: 'conferencia_medidas', name: 'Conferência de medidas' },
  { key: 'planejamento_materiais', name: 'Planejamento de materiais' },
  { key: 'compra_materiais', name: 'Compra de materiais' },
  { key: 'aguardando_materiais', name: 'Aguardando materiais' },
  { key: 'fabricacao', name: 'Fabricação' },
  { key: 'acabamento', name: 'Acabamento' },
  { key: 'preparacao_entrega', name: 'Preparação para entrega' },
  { key: 'transporte', name: 'Transporte' },
  { key: 'instalacao', name: 'Instalação' },
  { key: 'finalizado', name: 'Finalizado' },
]

export interface PaymentTermsSpec {
  down_payment_percent?: number // entrada (%)
  installments?: number // nº de parcelas (além da entrada)
  first_due_in_days?: number // vencimento da 1ª parcela
  interval_days?: number // intervalo entre parcelas (padrão 30)
}

/** Interpreta as condições de pagamento em texto livre (ex.: "50% entrada + 2x") */
export function parsePaymentTerms(terms?: string | null): PaymentTermsSpec {
  if (!terms) return {}
  const t = terms.toLowerCase()
  const spec: PaymentTermsSpec = {}
  const dp = t.match(/(\d{1,3})\s*%\s*(?:de\s*)?entrada/)
  if (dp) spec.down_payment_percent = parseInt(dp[1], 10)
  const inst = t.match(/(\d{1,2})\s*x/)
  if (inst) spec.installments = parseInt(inst[1], 10)
  if (!spec.down_payment_percent && !spec.installments) {
    // "à vista" → uma parcela única
    spec.installments = 1
    spec.down_payment_percent = 0
  }
  return spec
}

/** Gera a lista de contas a receber: entrada + parcelas, com vencimentos. */
export function buildReceivables(
  total: number,
  terms: string | undefined,
  deadlineDays: number | undefined,
): {
  description: string
  amount: number
  due_date: string
  installment_number: number
  installment_total: number
}[] {
  const spec = parsePaymentTerms(terms)
  const rows: {
    description: string
    amount: number
    due_date: string
    installment_number: number
    installment_total: number
  }[] = []

  const addDays = (base: Date, days: number): string => {
    const d = new Date(base.getTime())
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }

  const totalInt = Math.round(total * 100)
  const dp = spec.down_payment_percent ?? 0
  const n = spec.installments ?? 0
  const interval = spec.interval_days ?? 30

  if (n <= 0 && dp <= 0) {
    // sem condições definidas: 1 parcela única no prazo de entrega (ou 30 dias)
    const due = addDays(new Date(), deadlineDays ?? 30)
    rows.push({
      description: 'Valor único',
      amount: total,
      due_date: due,
      installment_number: 1,
      installment_total: 1,
    })
    return rows
  }

  const downAmount = dp > 0 ? Math.round((totalInt * dp) / 100) / 100 : 0
  const rest = Math.round((totalInt - downAmount * 100) / 100)
  const perInst = n > 0 ? Math.round((rest * 100) / n) / 100 : 0
  const parts: { description: string; amount: number }[] = []
  if (downAmount > 0) parts.push({ description: 'Entrada', amount: downAmount })
  for (let i = 1; i <= n; i++) {
    let amount = perInst
    if (i === n && n > 0) {
      // ajusta centavos na última parcela
      const others = perInst * (n - 1)
      amount = Math.round((rest - others) * 100) / 100
    }
    parts.push({ description: `Parcela ${i}/${n}`, amount })
  }

  parts.forEach((p, idx) => {
    // entrada vence hoje; parcelas a partir do primeiro vencimento (15 dias) com intervalo
    const dueOffset =
      idx === 0 && downAmount > 0
        ? 0
        : (spec.first_due_in_days ?? 15) + (idx - (downAmount > 0 ? 1 : 0)) * interval
    rows.push({
      description: p.description,
      amount: p.amount,
      due_date: addDays(new Date(), dueOffset),
      installment_number: idx + 1,
      installment_total: parts.length,
    })
  })
  return rows
}
