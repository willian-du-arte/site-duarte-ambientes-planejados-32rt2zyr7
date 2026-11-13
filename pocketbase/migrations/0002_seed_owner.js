migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Seed owner user if not exists
    const ownerEmail = 'willian.duarte@gmail.com'
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', ownerEmail)
      // User already exists
    } catch (_) {
      const record = new Record(users)
      record.setEmail(ownerEmail)
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Duarte Ambientes Planejados')
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'willian.duarte@gmail.com')
      app.delete(record)
    } catch (_) {}
  },
)
