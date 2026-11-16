// BLOCO 2 DA ETAPA 2 — recria `contracts` e `agenda_events` com os campos completos.
// A migração 0007 criou as duas coleções sem nenhum campo no live (mistura de objeto puro
// com instância RelationField no new Collection). Aqui usamos SOMENTE objetos puros.
// Todos os nomes de coleções referenciadas estão textuais neste arquivo (validação estática).
migrate(
  (app) => {
    const AUTH = "@request.auth.id != ''"
    const id = (name) => app.findCollectionByNameOrId(name).id

    // Remove as coleções vazias/quebradas antes de recriar (idempotente).
    for (const n of ['contracts', 'agenda_events']) {
      try {
        app.delete(app.findCollectionByNameOrId(n))
      } catch (e) {}
    }

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
          {
            name: 'status',
            type: 'select',
            maxSelect: 1,
            values: ['ativo', 'encerrado', 'cancelado'],
          },
          { name: 'description', type: 'text', max: 4000 },
          { name: 'value', type: 'number', min: 0 },
          { name: 'contract_date', type: 'date' },
          { name: 'deadline', type: 'date' },
          { name: 'payment_terms', type: 'text', max: 1000 },
          { name: 'documents', type: 'text', max: 4000 },
          { name: 'notes', type: 'text', max: 4000 },
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
          'CREATE INDEX idx_contracts_project ON contracts (project)',
          'CREATE INDEX idx_contracts_status ON contracts (status)',
        ],
      }),
    )

    // ---- agenda_events (compromissos/tarefas centralizadas) ----
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
          { name: 'done', type: 'bool' },
          { name: 'done_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          { name: 'client', type: 'relation', collectionId: id('clients'), maxSelect: 1 },
          { name: 'project', type: 'relation', collectionId: id('projects'), maxSelect: 1 },
          { name: 'supplier', type: 'relation', collectionId: id('suppliers'), maxSelect: 1 },
        ],
        indexes: [
          'CREATE INDEX idx_agenda_events_date ON agenda_events (event_date)',
          'CREATE INDEX idx_agenda_events_done ON agenda_events (done)',
        ],
      }),
    )
  },
  (app) => {
    for (const n of ['contracts', 'agenda_events']) {
      try {
        app.delete(app.findCollectionByNameOrId(n))
      } catch (e) {}
    }
  },
)
