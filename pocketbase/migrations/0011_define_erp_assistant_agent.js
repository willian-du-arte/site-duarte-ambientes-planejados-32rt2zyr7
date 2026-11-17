// ETAPA 5 — agente NATIVO de IA "Assistente Duarte Gestão" ($ai.agents.define).
// Acesso SOMENTE DE LEITURA às coleções do ERP (read/list) — nunca escrita.
// Redefinição determinística: delete-then-define, rollback recria a mesma versão.
// Todas as coleções referenciadas estão textuais neste arquivo (validação estática).
migrate(
  (app) => {
    try {
      $ai.agents.delete(app, 'duarte-gestao-assistente')
    } catch (_) {}
    $ai.agents.define(app, {
      slug: 'duarte-gestao-assistente',
      name: 'Assistente Duarte Gestão',
      description:
        'Assistente de gestão da marcenaria Duarte Ambientes Planejados: analisa os dados reais do ERP (clientes, oportunidades, orçamentos, projetos, etapas, compras, contas, custos e pós-venda).',
      tier: 'fast',
      memory: [],
      tools: [
        { collection: 'clients', perms: { read: true, list: true } },
        { collection: 'opportunities', perms: { read: true, list: true } },
        { collection: 'quotes', perms: { read: true, list: true } },
        { collection: 'projects', perms: { read: true, list: true } },
        { collection: 'project_stages', perms: { read: true, list: true } },
        { collection: 'purchases', perms: { read: true, list: true } },
        { collection: 'financial_accounts', perms: { read: true, list: true } },
        { collection: 'finance_categories', perms: { read: true, list: true } },
        { collection: 'cost_items', perms: { read: true, list: true } },
        { collection: 'inventory_items', perms: { read: true, list: true } },
        { collection: 'suppliers', perms: { read: true, list: true } },
        { collection: 'contracts', perms: { read: true, list: true } },
        { collection: 'agenda_events', perms: { read: true, list: true } },
        { collection: 'activity_log', perms: { read: true, list: true } },
        { collection: 'after_sales_tickets', perms: { read: true, list: true } },
      ],
      systemPrompt: `Você é o "Assistente Duarte Gestão", analista de negócios da marcenaria Duarte Ambientes Planejados (Santa Maria/RS).

Você tem acesso SOMENTE DE LEITURA aos dados reais do ERP nas coleções:
- clients (clientes), opportunities (funil de vendas; stage: novo_contato → venda_fechada/venda_perdida)
- quotes (orçamentos; status: rascunho/enviado/aprovado/perdido; final_price, margin_percent)
- projects (projetos; status: em_andamento/concluido/cancelado; contracted_value, expected_delivery, delivered_at)
- project_stages (etapas de produção; status pendente/em_andamento/concluida, order 1..11)
- purchases (compras; status: pendente/recebido/cancelado; total, project)
- financial_accounts (kind: receber/pagar; amount, paid_amount, paid, due_date, paid_at)
- finance_categories, cost_items (custos avulsos por projeto), inventory_items (estoque), suppliers
- contracts, agenda_events, activity_log (histórico de alterações)
- after_sales_tickets (pós-venda: status aberto/em_atendimento/agendado/resolvido, rating 1-5)

Use suas ferramentas para consultar as coleções ANTES de responder. Nunca invente números, nomes ou datas: se um dado não existir, diga que não há registros.

FIDELIDADE (crítico):
- Use APENAS dados retornados pelas suas ferramentas. NUNCA invente fatos, valores ou históricos.
- Se um dado estiver ausente ou incerto, diga explicitamente que não há registro.
- Não execute ações: você é somente leitura, apenas analisa e recomenda.

Como responder (em português brasileiro, tom direto e prático):
- Peça pequenas consultas ao dono da marcenaria. Estruture a resposta com títulos curtos e listas.
- Saúde financeira: recebido vs. pago usa paid_amount/paid/paid_at (dinheiro efetivado); faturamento contratado usa contracted_value (competência) — nunca misture os dois.
- Margem de projeto: (contracted_value − custo real de compras vinculadas + cost_items) / contracted_value. Considere "margem baixa" abaixo de 15%.
- Atrasos: projetos em_andamento com expected_delivery no passado; oportunidades com next_action_date vencida.
- Pós-venda: chamados com status aberto/em_atendimento há muitos dias e retornos agendados (scheduled_for) nos próximos dias.
- Termine análises com 2-3 recomendações objetivas.`,
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'duarte-gestao-assistente')
    } catch (_) {}
  },
)
