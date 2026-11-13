// ETAPA 1 — Duarte Gestão: conversão de contato do site em cliente do CRM.
// Adiciona a `contacts`:
//  - converted (bool): marca o contato já convertido em cliente
//  - converted_client (relation → clients): cliente criado na conversão
//  - converted_opportunity (relation → opportunities): oportunidade criada
// Tudo opcional: os fluxos antigos do site continuam funcionando sem enviar nada disso.
// NOTA: `contacts` (0001) é anterior ao ERP; `clients`/`opportunities` nascem em 0004.
// Se o deploy reexecutar 0001 DEPOIS de 0004 (ordem por timestamp na instância),
// a coleção nasce sem estes campos — por isso este patch é aqui e não na 0001.
migrate(
  (app) => {
    const contacts = app.findCollectionByNameOrId('contacts')
    if (!contacts.fields.getByName('converted')) {
      contacts.fields.add(new BoolField({ name: 'converted' }))
    }
    if (!contacts.fields.getByName('converted_client')) {
      contacts.fields.add(
        new RelationField({
          name: 'converted_client',
          collectionId: app.findCollectionByNameOrId('clients').id,
          maxSelect: 1,
        }),
      )
    }
    if (!contacts.fields.getByName('converted_opportunity')) {
      contacts.fields.add(
        new RelationField({
          name: 'converted_opportunity',
          collectionId: app.findCollectionByNameOrId('opportunities').id,
          maxSelect: 1,
        }),
      )
    }
    app.save(contacts)
  },
  (app) => {
    const contacts = app.findCollectionByNameOrId('contacts')
    for (const n of ['converted_opportunity', 'converted_client', 'converted']) {
      const f = contacts.fields.getByName(n)
      if (f) contacts.fields.removeByName(n)
    }
    app.save(contacts)
  },
)
