// ETAPA 4 — recria a coleção cost_items (custos de projeto que não vieram de compra:
// mão de obra, transporte, instalação etc.).
// A 0007 a criou com fields vazios (mistura de objetos puros com new RelationField()
// dentro de new Collection derruba o array de campos). Aqui usa SOMENTE objetos puros,
// como na 0008. A referência a "projects" está textual neste arquivo (exigência da
// validação estática de migrações do Skip Cloud).
migrate(
  (app) => {
    // remove a coleção quebrada (sem campos, sem regra de listagem) antes de recriar
    try {
      const broken = app.findCollectionByNameOrId('cost_items')
      app.delete(broken)
    } catch (_) {}

    const AUTH = "@request.auth.id != ''"
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
          { name: 'description', type: 'text', required: true, max: 200 },
          {
            name: 'category',
            type: 'select',
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
          { name: 'amount', type: 'number', min: 0 },
          { name: 'date', type: 'date' },
          { name: 'notes', type: 'text', max: 1000 },
          {
            name: 'project',
            type: 'relation',
            required: true,
            collectionId: app.findCollectionByNameOrId('projects').id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_cost_items_project ON cost_items (project)'],
      }),
    )
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('cost_items')
      app.delete(col)
    } catch (_) {}
  },
)
