migrate(
  (app) => {
    const contacts = app.findCollectionByNameOrId('contacts')

    const seedContacts = [
      {
        name: 'Mariana Silveira',
        contact_info: '(55) 99123-4567',
        need: 'Cozinha planejada com ilha em MDF amadeirado e armários embutidos para apartamento no Centro de Santa Maria.',
        status: 'orcamento_enviado',
        notes: 'Visita técnica realizada dia 10. Aguardando aprovação do projeto 3D.',
      },
      {
        name: 'Dr. Roberto Vargas (Clínica São Lucas)',
        contact_info: 'contato@clinicasaolucas.com.br',
        need: 'Mobiliário sob medida para recepção e 3 consultórios médicos em MDF acetinado.',
        status: 'atendido',
        notes: 'Medidas coletadas no local. Projeto 3D em desenvolvimento.',
      },
      {
        name: 'Camila & Fernando Rodrigues',
        contact_info: '(55) 98455-1234',
        need: 'Dormitório de casal com closet planejado e painel ripado de TV em MDF.',
        status: 'novo',
        notes: '',
      },
    ]

    for (const item of seedContacts) {
      const existing = app.findRecordsByFilter('contacts', `name = '${item.name}'`, '', 1, 0)
      if (existing.length === 0) {
        const record = new Record(contacts)
        record.set('name', item.name)
        record.set('contact_info', item.contact_info)
        record.set('need', item.need)
        record.set('status', item.status)
        record.set('notes', item.notes)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const contacts = app.findCollectionByNameOrId('contacts')
      app.truncateCollection(contacts)
    } catch (_) {}
  },
)
