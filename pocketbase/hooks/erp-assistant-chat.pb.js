// ETAPA 5 — rota de chat em streaming do agente nativo "duarte-gestao-assistente".
// O frontend fala com esta rota (nunca com o modelo): POST /backend/v1/assistente/chat-stream
// Padrão do skip-agents: getOrCreateConversation + chat({stream:true}) + $response.stream.
routerAdd(
  'POST',
  '/backend/v1/assistente/chat-stream',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Faça login para usar o assistente.')
      const message = (body.message || '').trim()
      if (!message) return e.badRequestError('Mensagem vazia.')

      // A conversa persiste por usuário: o histórico fica no agente.
      const conv = $ai
        .agent('duarte-gestao-assistente')
        .getOrCreateConversation({ user_id: userId, id: body.conversation_id || null })

      const iter = $ai.agent('duarte-gestao-assistente').chat({
        user_id: userId,
        conversation_id: conv.id,
        message,
        stream: true,
      })

      e.response.header().set('Content-Type', 'text/event-stream')
      e.response.header().set('Cache-Control', 'no-cache')
      e.response.header().set('X-Conversation-Id', conv.id)
      return $response.stream(e, iter)
    } catch (err) {
      if (typeof SkipAiConfigError !== 'undefined' && err instanceof SkipAiConfigError) {
        return e.json(503, { message: 'Assistente de IA temporariamente indisponível.' })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
