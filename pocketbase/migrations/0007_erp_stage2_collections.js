// ETAPAS 2–4 — Duarte Gestão: campos novos e coleções novas (contratos, agenda, custos, categorias).
// Referencia apenas coleções já existentes (0004/0005) — os nomes estão textuais neste arquivo.
migrate(
  (app) => {
    const AUTH = "@request.auth.id != ''"
    const id = (name) => app.findCollectionByNameOrId(name).id
    const rel = (name, collectionId, opts) => {
      const f = {
        name,
        type: 'relation',
        collectionId,
        maxSelect: 1,
        cascadeDelete: false,
      }
      if (opts) {
        for (const k in opts) f[k] = opts[k]
      }
      return new RelationField(f)
    }

    // ---- campos novos em coleções da Etapa 1 ----
    // Em coleção EXISTENTE o fields.add() exige instância de core.Field (não objeto puro).
    const txt = (name, max) => new TextField({ name, max })
    const num = (name, opts) => new NumberField({ name, min: opts?.min, onlyInt: opts?.onlyInt })
    const sel = (name, values) => new SelectField({ name, values, maxSelect: 1 })

    const addFields = (name, fields, relations) => {
      const c = app.findCollectionByNameOrId(name)
      for (const f of fields) {
        if (c.fields.getByName(f.name)) continue
        c.fields.add(f)
      }
      if (relations) {
        for (const f of relations) {
          if (c.fields.getByName(f.name)) continue
          c.fields.add(f)
        }
      }
      app.save(c)
    }

    addFields(
      'projects',
      [
        txt('responsible', 120),
        txt('materials_needed', 4000),
        txt('suppliers_involved', 1000),
        num('current_stage', { onlyInt: true, min: 0 }),
      ],
      [],
    )

    addFields('suppliers', [txt('payment_terms', 500), txt('delivery_time', 200)])

    addFields('purchases', [
      num('quantity', { min: 0 }),
      num('unit_price', { min: 0 }),
      sel('payment_status', ['pendente', 'parcial', 'pago']),
    ])

    addFields('financial_accounts', [txt('category', 60)])

    addFields(
      'inventory_movements',
      [num('unit_cost', { min: 0 })],
      [rel('project', id('projects'))],
    )

    // ---- contracts (contratos por projeto) ----
    app.save(
      new Collection({
        name: 'contracts',
        type: 'base',
        listRule: AUTH,
        viewRule: AUTH,
        createRule: AUTH,
        updateRule: AUTH,
        deleteRule: AUTH,
        fields: [
          { name: 'title', type: 'text', required: true, max: 200 },
          { name: 'value', type: 'number', min: 0 },
          { name: 'contract_date', type: 'date' },
          { name: 'deadline', type: 'date' },
          { name: 'payment_terms', type: 'text', max: 1000 },
          {
            name: 'status',
            type: 'select',
            maxSelect: 1,
            values: ['rascunho', 'aprovado', 'assinado', 'cancelado'],
          },
          { name: 'documents', type: 'text', max: 4000 },
          { name: 'attachments', type: 'file', maxSelect: 10, maxSize: 5242880 },
          { name: 'notes', type: 'text', max: 4000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          rel('project', id('projects'), { required: true, cascadeDelete: true }),
        ],
        indexes: [],
      }),
    )

    // ---- agenda_events (agenda centralizada) ----
    app.save(
      new Collection({
        name: 'agenda_events',
        type: 'base',
        listRule: AUTH,
        viewRule: AUTH,
        createRule: AUTH,
        updateRule: AUTH,
        deleteRule: AUTH,
        fields: [
          { name: 'title', type: 'text', required: true, max: 200 },
          {
            name: 'kind',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: [
              'reuniao',
              'visita_tecnica',
              'medicao',
              'entrega',
              'instalacao',
              'pagamento',
              'compra',
              'prazo',
            ],
          },
          { name: 'event_date', type: 'date', required: true },
          { name: 'time', type: 'text', max: 10 },
          { name: 'notes', type: 'text', max: 2000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          rel('client', id('clients')),
          rel('project', id('projects')),
          rel('supplier', id('suppliers')),
        ],
        indexes: ['CREATE INDEX idx_agenda_date ON agenda_events (event_date)'],
      }),
    )

    // ---- cost_items (custos realizados por projeto — rentabilidade) ----
    app.save(
      new Collection({
        name: 'cost_items',
        type: 'base',
        listRule: AUTH,
        viewRule: AUTH,
        createRule: AUTH,
        updateRule: AUTH,
        deleteRule: AUTH,
        fields: [
          {
            name: 'category',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: [
              'mdf',
              'ferragens',
              'corte_usinagem',
              'terceirizados',
              'mao_de_obra',
              'transporte',
              'instalacao',
              'outros',
            ],
          },
          { name: 'description', type: 'text', max: 300 },
          { name: 'amount', type: 'number', min: 0 },
          { name: 'cost_date', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          rel('project', id('projects'), { required: true, cascadeDelete: true }),
        ],
        indexes: [],
      }),
    )

    // ---- finance_categories (categorias de receitas/despesas) ----
    app.save(
      new Collection({
        name: 'finance_categories',
        type: 'base',
        listRule: AUTH,
        viewRule: AUTH,
        createRule: AUTH,
        updateRule: AUTH,
        deleteRule: AUTH,
        fields: [
          { name: 'name', type: 'text', required: true, max: 80 },
          {
            name: 'kind',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['receita', 'despesa'],
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_finance_categories_kind ON finance_categories (kind)'],
      }),
    )
  },
  (app) => {
    const names = ['finance_categories', 'cost_items', 'agenda_events', 'contracts']
    for (const n of names) {
      try {
        app.delete(app.findCollectionByNameOrId(n))
      } catch (e) {}
    }
  },
)
