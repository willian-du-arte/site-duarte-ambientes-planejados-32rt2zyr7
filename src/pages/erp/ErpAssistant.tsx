// Tela ASSISTENTE IA (Etapa 5): chat com o agente nativo "duarte-gestao-assistente".
// O agente roda no backend (hook /backend/v1/assistente/chat-stream) e responde
// a partir dos dados reais do ERP via ferramentas de leitura — nunca inventa.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ErpPageHeader } from './ErpShared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Square, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { streamAgentChat } from '@/lib/skipAi'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Como está a saúde financeira do mês?',
  'Quais projetos estão com margem baixa?',
  'Há oportunidades comerciais esquecidas no funil?',
  'Quais projetos estão atrasados?',
  'Quais chamados de pós-venda estão em aberto há mais tempo?',
]

const ROUTE = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/assistente/chat-stream`

export default function ErpAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const send = useCallback(
    async (text: string) => {
      const message = text.trim()
      if (!message || busy) return

      setInput('')
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
      }
      const assistantId = crypto.randomUUID()
      setMessages((m) => [...m, userMsg, { id: assistantId, role: 'assistant', content: '' }])
      setBusy(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch(ROUTE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: pb.authStore.token,
          },
          body: JSON.stringify({ message, conversation_id: conversationId }),
          signal: controller.signal,
        })
        if (!res.ok) {
          let detail = 'Falha na chamada do assistente.'
          try {
            const err = await res.json()
            if (err?.message) detail = err.message
          } catch {
            // resposta não-JSON (ex.: proxy)
          }
          throw new Error(detail)
        }

        const result = await streamAgentChat(res, {
          onChunk: (_delta, full) =>
            setMessages((m) =>
              m.map((msg) => (msg.id === assistantId ? { ...msg, content: full } : msg)),
            ),
          onError: (msg) => {
            throw new Error(msg)
          },
          signal: controller.signal,
        })

        setConversationId(result.conversation_id || res.headers.get('X-Conversation-Id') || null)
      } catch (e) {
        const aborted = e instanceof DOMException && e.name === 'AbortError'
        const detail =
          e instanceof Error && e.message ? e.message : 'Não foi possível falar com o assistente.'
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content:
                    msg.content ||
                    (aborted ? '_(cancelado)_' : `⚠ ${detail} Tente novamente em instantes.`),
                }
              : msg,
          ),
        )
      } finally {
        setBusy(false)
        abortRef.current = null
      }
    },
    [busy, conversationId],
  )

  const stop = () => abortRef.current?.abort()

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[480px] flex-col lg:h-[calc(100vh-9rem)]">
      <ErpPageHeader
        title="Assistente"
        subtitle="Converse com o assistente de gestão — ele analisa os dados reais do ERP (leitura) e nunca escreve no sistema."
      />

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] p-3 sm:p-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="h-8 w-8 text-amber-300" />
            <p className="max-w-md text-sm text-zinc-400">
              Pergunte sobre finanças, projetos, margens, prazos, clientes ou pós-venda — as
              respostas saem dos dados reais do sistema.
            </p>
            <div className="flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-amber-300/50 hover:text-amber-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap sm:max-w-[70%]',
              m.role === 'user'
                ? 'ml-auto bg-amber-300/15 text-amber-50'
                : 'bg-white/5 text-zinc-100',
            )}
          >
            {m.content ||
              (m.role === 'assistant' && busy ? (
                <span className="animate-pulse text-zinc-400">pensando…</span>
              ) : null)}
          </div>
        ))}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex.: quais projetos estão com margem abaixo de 15%?"
          disabled={busy}
        />
        {busy ? (
          <Button type="button" variant="outline" onClick={stop} aria-label="Parar">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={!input.trim()} aria-label="Enviar">
            <Send className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  )
}
