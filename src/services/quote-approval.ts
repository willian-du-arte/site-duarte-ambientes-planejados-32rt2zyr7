// Aprovação de orçamento — integração automática de ponta a ponta:
// 1) marca o orçamento como aprovado; 2) move a oportunidade p/ "Venda fechada";
// 3) cria o projeto contratado; 4) gera as 11 etapas de produção; 5) gera as
// contas a receber conforme as condições de pagamento (entrada + parcelas).
import pb from '@/lib/pocketbase/client'
import { DEFAULT_PRODUCTION_STAGES, buildReceivables } from '@/lib/erp-terms'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { OpportunityRecord, ProjectRecord, QuoteRecord } from '@/types/erp'

export interface ApprovalResult {
  project: ProjectRecord
  stages: number
  receivables: number
}

export async function approveQuoteAndIntegrate(quote: QuoteRecord): Promise<ApprovalResult> {
  const clientId = quote.client
  if (!clientId) throw new Error('Orçamento sem cliente vinculado.')

  const now = new Date().toISOString()

  // 1) orçamento aprovado
  const approved = await pb.collection('quotes').update<QuoteRecord>(quote.id, {
    status: 'aprovado',
    approved_at: now,
  })

  // 2) oportunidade → venda fechada
  if (quote.opportunity) {
    try {
      await pb
        .collection('opportunities')
        .update<OpportunityRecord>(quote.opportunity, { stage: 'venda_fechada' })
    } catch (e) {
      console.warn('Não foi possível mover a oportunidade:', getErrorMessage(e))
    }
  }

  // 3) projeto contratado
  const project = await pb.collection('projects').create<ProjectRecord>({
    title: quote.title,
    description: quote.description,
    contracted_value: quote.final_price ?? 0,
    cost_value: quote.total_cost ?? 0,
    status: 'em_andamento',
    expected_delivery:
      quote.deadline_days && quote.deadline_days > 0
        ? new Date(Date.now() + quote.deadline_days * 86400000).toISOString().slice(0, 10)
        : undefined,
    client: clientId,
    quote: quote.id,
  })

  // 4) etapas de produção padrão
  const stageRows = DEFAULT_PRODUCTION_STAGES.map((s, i) => ({
    project: project.id,
    order: i + 1,
    name: s.name,
    key: s.key,
    status: i === 0 ? 'em_andamento' : 'pendente',
    started_at: i === 0 ? now : undefined,
  }))
  for (const row of stageRows) {
    await pb.collection('project_stages').create(row)
  }

  // 5) contas a receber conforme condições de pagamento
  const receivables = buildReceivables(
    quote.final_price ?? 0,
    quote.payment_terms,
    quote.deadline_days,
  )
  for (const r of receivables) {
    await pb.collection('financial_accounts').create({
      kind: 'receber',
      description: `${quote.title} — ${r.description}`,
      amount: r.amount,
      due_date: r.due_date,
      installment_number: r.installment_number,
      installment_total: r.installment_total,
      client: clientId,
      project: project.id,
    })
  }

  // log da integração
  try {
    await pb.collection('activity_log').create({
      entity: 'quotes',
      entity_id: quote.id,
      action: 'aprovado',
      description: `Orçamento "${quote.title}" aprovado — projeto e ${stageRows.length} etapas + ${receivables.length} contas a receber gerados`,
      user_email: pb.authStore.record?.email || '',
    })
    await pb.collection('activity_log').create({
      entity: 'projects',
      entity_id: project.id,
      action: 'criado',
      description: `Projeto gerado pela aprovação do orçamento "${quote.title}"`,
      user_email: pb.authStore.record?.email || '',
    })
  } catch {
    // best-effort
  }

  return { project, stages: stageRows.length, receivables: receivables.length }
}
