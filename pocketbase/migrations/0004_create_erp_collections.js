// ETAPA 1 — Duarte Gestão: coleções do ERP (parte 1, sem campos relation).
// Todas restritas a usuários autenticados; criação pública permanece apenas em `contacts`.
// As relações entre as coleções novas, os índices dependentes delas e as seeds
// das etapas (funil e produção) ficam em 0005_add_erp_relations.js.
migrate(
  (app) => {
    const AUTH = "@request.auth.id != ''"
    const created = [
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]

    const save = (name, fields, indexes) => {
      app.save(
        new Collection({
          name,
          type: 'base',
          listRule: AUTH,
          viewRule: AUTH,
          createRule: AUTH,
          updateRule: AUTH,
          deleteRule: AUTH,
          fields: fields.concat(created),
          indexes: indexes || [],
        }),
      )
    }

    // ---- clients ----
    save(
      'clients',
      [
        { name: 'name', type: 'text', required: true, max: 200 },
        { name: 'document', type: 'text', max: 32 },
        { name: 'phone', type: 'text', max: 32 },
        { name: 'whatsapp', type: 'text', max: 32 },
        { name: 'email', type: 'email' },
        { name: 'address', type: 'text', max: 500 },
        {
          name: 'client_type',
          type: 'select',
          values: ['pessoa_fisica', 'pessoa_juridica'],
          maxSelect: 1,
        },
        {
          name: 'origin',
          type: 'select',
          values: [
            'site',
            'indicacao',
            'instagram',
            'facebook',
            'google',
            'telefone',
            'loja',
            'outro',
          ],
          maxSelect: 1,
        },
        { name: 'history', type: 'text', max: 8000 },
        { name: 'notes', type: 'text', max: 8000 },
      ],
      [
        'CREATE INDEX idx_clients_name ON clients (name)',
        'CREATE INDEX idx_clients_created ON clients (created DESC)',
      ],
    )

    // ---- suppliers ----
    save('suppliers', [
      { name: 'name', type: 'text', required: true, max: 200 },
      { name: 'document', type: 'text', max: 32 },
      { name: 'phone', type: 'text', max: 32 },
      { name: 'email', type: 'email' },
      { name: 'address', type: 'text', max: 500 },
      { name: 'categories', type: 'text', max: 500 },
      { name: 'notes', type: 'text', max: 8000 },
    ])

    // ---- funnel_stages (9 etapas do funil de vendas) ----
    save('funnel_stages', [
      { name: 'name', type: 'text', required: true, max: 120 },
      { name: 'key', type: 'text', required: true, max: 60 },
      { name: 'order', type: 'number', onlyInt: true },
      { name: 'active', type: 'bool' },
    ])

    // ---- production_stages (11 etapas de produção) ----
    save('production_stages', [
      { name: 'name', type: 'text', required: true, max: 120 },
      { name: 'key', type: 'text', required: true, max: 60 },
      { name: 'order', type: 'number', onlyInt: true },
      { name: 'active', type: 'bool' },
    ])

    // ---- seeds das etapas (configuração do sistema, não dados fictícios) ----
    const seedStages = (collectionName, pairs) => {
      const col = app.findCollectionByNameOrId(collectionName)
      for (let i = 0; i < pairs.length; i++) {
        const rec = new Record(col)
        rec.set('key', pairs[i][0])
        rec.set('name', pairs[i][1])
        rec.set('order', i + 1)
        rec.set('active', true)
        app.save(rec)
      }
    }
    seedStages('funnel_stages', [
      ['novo_contato', 'Novo contato'],
      ['atendimento', 'Atendimento'],
      ['levantamento_medidas', 'Levantamento de medidas'],
      ['desenvolvimento_projeto', 'Desenvolvimento do projeto'],
      ['elaboracao_orcamento', 'Elaboração de orçamento'],
      ['orcamento_enviado', 'Orçamento enviado'],
      ['negociacao', 'Negociação'],
      ['venda_fechada', 'Venda fechada'],
      ['venda_perdida', 'Venda perdida'],
    ])
    seedStages('production_stages', [
      ['projeto_aprovado', 'Projeto aprovado'],
      ['conferencia_medidas', 'Conferência de medidas'],
      ['planejamento_materiais', 'Planejamento de materiais'],
      ['compra_materiais', 'Compra de materiais'],
      ['aguardando_materiais', 'Aguardando materiais'],
      ['fabricacao', 'Fabricação'],
      ['acabamento', 'Acabamento'],
      ['preparacao_entrega', 'Preparação para entrega'],
      ['transporte', 'Transporte'],
      ['instalacao', 'Instalação'],
      ['finalizado', 'Finalizado'],
    ])

    // ---- opportunities (funil de vendas) ----
    save(
      'opportunities',
      [
        { name: 'title', type: 'text', required: true, max: 200 },
        { name: 'description', type: 'text', max: 4000 },
        { name: 'value', type: 'number', min: 0 },
        {
          name: 'stage',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: [
            'novo_contato',
            'atendimento',
            'levantamento_medidas',
            'desenvolvimento_projeto',
            'elaboracao_orcamento',
            'orcamento_enviado',
            'negociacao',
            'venda_fechada',
            'venda_perdida',
          ],
        },
        { name: 'next_action', type: 'text', max: 500 },
        { name: 'next_action_date', type: 'date' },
        { name: 'lost_reason', type: 'text', max: 1000 },
        { name: 'notes', type: 'text', max: 8000 },
      ],
      [
        'CREATE INDEX idx_opportunities_stage ON opportunities (stage)',
        'CREATE INDEX idx_opportunities_created ON opportunities (created DESC)',
      ],
    )

    // ---- quotes (orçamentos) ----
    save(
      'quotes',
      [
        { name: 'title', type: 'text', required: true, max: 200 },
        { name: 'description', type: 'text', max: 4000 },
        { name: 'environments', type: 'text', max: 2000 },
        { name: 'dimensions', type: 'text', max: 2000 },
        { name: 'materials', type: 'text', max: 4000 },
        { name: 'items', type: 'json', maxSize: 2000000 },
        { name: 'labor_cost', type: 'number', min: 0 },
        { name: 'third_party_cost', type: 'number', min: 0 },
        { name: 'transport_cost', type: 'number', min: 0 },
        { name: 'assembly_cost', type: 'number', min: 0 },
        { name: 'additional_costs', type: 'number', min: 0 },
        { name: 'margin_percent', type: 'number', min: 0, max: 100 },
        { name: 'total_cost', type: 'number', min: 0 },
        { name: 'final_price', type: 'number', min: 0 },
        { name: 'manual_price', type: 'bool' },
        { name: 'warranty', type: 'text', max: 500 },
        { name: 'payment_terms', type: 'text', max: 1000 },
        { name: 'deadline_days', type: 'number', onlyInt: true, min: 0 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['rascunho', 'enviado', 'aprovado', 'perdido'],
        },
        { name: 'approved_at', type: 'date' },
        { name: 'version', type: 'number', onlyInt: true },
      ],
      [
        'CREATE INDEX idx_quotes_status ON quotes (status)',
        'CREATE INDEX idx_quotes_created ON quotes (created DESC)',
      ],
    )

    // ---- quote_versions (histórico de versões) ----
    save('quote_versions', [
      { name: 'version', type: 'number', onlyInt: true },
      { name: 'snapshot', type: 'json', maxSize: 2000000 },
      { name: 'note', type: 'text', max: 1000 },
    ])

    // ---- projects ----
    save(
      'projects',
      [
        { name: 'title', type: 'text', required: true, max: 200 },
        { name: 'description', type: 'text', max: 4000 },
        { name: 'contracted_value', type: 'number', min: 0 },
        { name: 'cost_value', type: 'number', min: 0 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['em_andamento', 'concluido', 'cancelado'],
        },
        { name: 'expected_delivery', type: 'date' },
        { name: 'delivered_at', type: 'date' },
        { name: 'notes', type: 'text', max: 8000 },
      ],
      ['CREATE INDEX idx_projects_status ON projects (status)'],
    )

    // ---- project_stages (etapas de produção de cada projeto) ----
    save('project_stages', [
      { name: 'order', type: 'number', onlyInt: true },
      { name: 'name', type: 'text', required: true, max: 120 },
      { name: 'key', type: 'text', max: 60 },
      {
        name: 'status',
        type: 'select',
        required: true,
        maxSelect: 1,
        values: ['pendente', 'em_andamento', 'concluida'],
      },
      { name: 'started_at', type: 'date' },
      { name: 'completed_at', type: 'date' },
      { name: 'notes', type: 'text', max: 2000 },
    ])

    // ---- tasks ----
    save(
      'tasks',
      [
        { name: 'title', type: 'text', required: true, max: 200 },
        { name: 'description', type: 'text', max: 4000 },
        { name: 'due_date', type: 'date' },
        {
          name: 'priority',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['baixa', 'media', 'alta'],
        },
        { name: 'done', type: 'bool' },
        { name: 'completed_at', type: 'date' },
      ],
      [
        'CREATE INDEX idx_tasks_done ON tasks (done)',
        'CREATE INDEX idx_tasks_due_date ON tasks (due_date)',
      ],
    )

    // ---- financial_accounts (contas a receber / a pagar) ----
    save(
      'financial_accounts',
      [
        {
          name: 'kind',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['receber', 'pagar'],
        },
        { name: 'description', type: 'text', required: true, max: 200 },
        { name: 'amount', type: 'number', required: false, min: 0 },
        { name: 'due_date', type: 'date', required: true },
        { name: 'paid', type: 'bool' },
        { name: 'paid_at', type: 'date' },
        { name: 'paid_amount', type: 'number', min: 0 },
        { name: 'installment_number', type: 'number', onlyInt: true, min: 0 },
        { name: 'installment_total', type: 'number', onlyInt: true, min: 0 },
        { name: 'notes', type: 'text', max: 2000 },
      ],
      [
        'CREATE INDEX idx_financial_accounts_kind ON financial_accounts (kind)',
        'CREATE INDEX idx_financial_accounts_due ON financial_accounts (due_date)',
      ],
    )

    // ---- purchases (compras a fornecedores) ----
    save(
      'purchases',
      [
        { name: 'description', type: 'text', required: true, max: 300 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['orcamento', 'pedido', 'recebido', 'cancelado'],
        },
        { name: 'total', type: 'number', min: 0 },
        { name: 'order_date', type: 'date' },
        { name: 'expected_date', type: 'date' },
        { name: 'received_at', type: 'date' },
        { name: 'notes', type: 'text', max: 2000 },
      ],
      ['CREATE INDEX idx_purchases_status ON purchases (status)'],
    )

    // ---- inventory_items (estoque) ----
    save(
      'inventory_items',
      [
        { name: 'name', type: 'text', required: true, max: 200 },
        { name: 'category', type: 'text', max: 120 },
        { name: 'unit', type: 'text', max: 20 },
        { name: 'quantity', type: 'number', min: 0 },
        { name: 'min_quantity', type: 'number', min: 0 },
        { name: 'unit_cost', type: 'number', min: 0 },
        { name: 'notes', type: 'text', max: 2000 },
      ],
      ['CREATE INDEX idx_inventory_items_name ON inventory_items (name)'],
    )

    // ---- inventory_movements ----
    save('inventory_movements', [
      {
        name: 'kind',
        type: 'select',
        required: true,
        maxSelect: 1,
        values: ['entrada', 'saida', 'ajuste'],
      },
      { name: 'quantity', type: 'number', min: 0 },
      { name: 'reason', type: 'text', max: 300 },
    ])

    // ---- activity_log (histórico de alterações: quem, o que, quando, de/para) ----
    save(
      'activity_log',
      [
        { name: 'entity', type: 'text', required: true, max: 40 },
        { name: 'entity_id', type: 'text', max: 32 },
        { name: 'action', type: 'text', required: true, max: 40 },
        { name: 'description', type: 'text', max: 2000 },
        { name: 'field', type: 'text', max: 60 },
        { name: 'old_value', type: 'text', max: 2000 },
        { name: 'new_value', type: 'text', max: 2000 },
        { name: 'user_email', type: 'text', max: 200 },
      ],
      [
        'CREATE INDEX idx_activity_log_entity ON activity_log (entity, entity_id)',
        'CREATE INDEX idx_activity_log_created ON activity_log (created DESC)',
      ],
    )
  },
  (app) => {
    const names = [
      'activity_log',
      'inventory_movements',
      'inventory_items',
      'purchases',
      'financial_accounts',
      'tasks',
      'project_stages',
      'projects',
      'quote_versions',
      'quotes',
      'opportunities',
      'production_stages',
      'funnel_stages',
      'suppliers',
      'clients',
    ]
    for (const n of names) {
      try {
        app.delete(app.findCollectionByNameOrId(n))
      } catch (e) {}
    }
  },
)
