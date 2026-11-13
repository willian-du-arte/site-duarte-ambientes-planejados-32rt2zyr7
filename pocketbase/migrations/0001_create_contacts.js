migrate(
  (app) => {
    const collection = new Collection({
      name: 'contacts',
      type: 'base',
      // Public create so any visitor can submit a contact form
      // List, view, update, delete only for authenticated users (owner)
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '',
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'contact_info', type: 'text', required: true },
        { name: 'need', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['novo', 'atendido', 'orcamento_enviado'],
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contacts_status ON contacts (status)',
        'CREATE INDEX idx_contacts_created ON contacts (created DESC)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('contacts')
      app.delete(collection)
    } catch (_) {}
  },
)
