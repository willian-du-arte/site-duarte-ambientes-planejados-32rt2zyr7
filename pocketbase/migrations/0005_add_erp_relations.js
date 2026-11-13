// ETAPA 1 — Duarte Gestão: relações entre as coleções do ERP (todas criadas em 0004).
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

    const patch = (name, fields, indexes) => {
      const c = app.findCollectionByNameOrId(name)
      for (const f of fields) {
        if (c.fields.getByName(f.name)) continue // já existe — nada a fazer
        c.fields.add(f)
      }
      if (indexes) {
        for (const ix of indexes) {
          // assinatura: addIndex(nome, unique, colunas, where)
          c.addIndex(ix.name, ix.unique || false, ix.columns, '')
        }
      }
      c.listRule = AUTH
      c.viewRule = AUTH
      c.createRule = AUTH
      c.updateRule = AUTH
      c.deleteRule = AUTH
      app.save(c)
    }

    const clientsId = id('clients')

    patch(
      'opportunities',
      [rel('client', clientsId, { required: true })],
      [{ name: 'idx_opportunities_client', columns: 'client' }],
    )
    patch(
      'quotes',
      [rel('client', clientsId, { required: true }), rel('opportunity', id('opportunities'))],
      [{ name: 'idx_quotes_client', columns: 'client' }],
    )
    patch('quote_versions', [rel('quote', id('quotes'), { required: true, cascadeDelete: true })])
    patch('projects', [rel('client', clientsId, { required: true }), rel('quote', id('quotes'))])
    patch('project_stages', [
      rel('project', id('projects'), { required: true, cascadeDelete: true }),
    ])
    patch('tasks', [
      rel('project', id('projects')),
      rel('opportunity', id('opportunities')),
      rel('client', clientsId),
    ])
    patch('financial_accounts', [
      rel('client', clientsId),
      rel('supplier', id('suppliers')),
      rel('project', id('projects')),
      rel('purchase', id('purchases')),
    ])
    patch('purchases', [rel('supplier', id('suppliers')), rel('project', id('projects'))])
    patch('inventory_items', [rel('supplier', id('suppliers'))])
    patch('inventory_movements', [
      rel('item', id('inventory_items'), { required: true, cascadeDelete: true }),
      rel('purchase', id('purchases')),
    ])
  },
  (app) => {},
)
