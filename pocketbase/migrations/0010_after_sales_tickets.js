// ETAPA 5 — coleção after_sales_tickets (pós-venda e garantia).
// Chamados de clientes sobre projetos entregues: problema reportado, status,
// retorno agendado, manutenção realizada e nota de satisfação (1–5).
// Usa SOMENTE objetos puros (mixar objetos com new RelationField() quebra a
// migração — bug das 0007/0009). Todas as coleções referenciadas estão
// textuais neste arquivo (exigência da validação estática).
migrate(
  (app) => {
    const AUTH = "@request.auth.id != ''"
    const id = (name) => app.findCollectionByNameOrId(name).id

    // idempotente: remove restos de tentativas anteriores antes de recriar
    try {
      app.delete(app.findCollectionByNameOrId('after_sales_tickets'))
    } catch (_) {}

    app.save(
      new Collection({
        name: 'after_sales_tickets',
        type: 'base',
        listRule: AUTH,
        viewRule: AUTH,
        createRule: AUTH,
        updateRule: AUTH,
        deleteRule: AUTH,
        fields: [
          { name: 'description', type: 'text', required: true, max: 4000 },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['aberto', 'em_atendimento', 'agendado', 'resolvido'],
          },
          { name: 'opened_at', type: 'date', required: true },
          { name: 'scheduled_for', type: 'date' },
          { name: 'scheduled_time', type: 'text', max: 10 },
          { name: 'maintenance_date', type: 'date' },
          { name: 'maintenance_notes', type: 'text', max: 4000 },
          { name: 'maintenance_cost', type: 'number', min: 0 },
          { name: 'rating', type: 'number', min: 1, max: 5 },
          { name: 'resolution_notes', type: 'text', max: 4000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          { name: 'client', type: 'relation', collectionId: id('clients'), maxSelect: 1 },
          {
            name: 'project',
            type: 'relation',
            collectionId: id('projects'),
            maxSelect: 1,
            required: true,
            cascadeDelete: true,
          },
        ],
        indexes: [
          'CREATE INDEX idx_ast_status ON after_sales_tickets (status)',
          'CREATE INDEX idx_ast_project ON after_sales_tickets (project)',
          'CREATE INDEX idx_ast_client ON after_sales_tickets (client)',
        ],
      }),
    )
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('after_sales_tickets'))
    } catch (_) {}
  },
)
