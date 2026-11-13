import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createContact } from '@/services/contacts'
import { CheckCircle2, Send, Loader2, Sparkles, Phone, User, MessageSquare } from 'lucide-react'

interface ContactFormProps {
  onSuccess?: () => void
}

export function ContactForm({ onSuccess }: ContactFormProps) {
  const [name, setName] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [need, setNeed] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !contactInfo.trim() || !need.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await createContact({
        name: name.trim(),
        contact_info: contactInfo.trim(),
        need: need.trim(),
      })
      setSubmitted(true)
      setName('')
      setContactInfo('')
      setNeed('')
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: unknown) {
      console.error('Erro ao enviar contato:', err)
      setError(
        'Não foi possível enviar sua mensagem no momento. Por favor, tente novamente ou fale conosco diretamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-wood-50 border border-wood-200 rounded-2xl p-8 text-center animate-fade-in shadow-warm">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-serif font-bold text-foreground mb-2">
          Contato enviado com sucesso!
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm leading-relaxed">
          Obrigado pelo interesse na Duarte Ambientes Planejados. Nossa equipe analisará seu pedido
          e entrará em contato em breve para conversar sobre seu projeto.
        </p>
        <Button
          variant="outline"
          onClick={() => setSubmitted(false)}
          className="rounded-xl border-wood-300 text-foreground hover:bg-wood-100"
        >
          Enviar outro contato
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-warm"
    >
      <div className="space-y-1 mb-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/60 text-accent-foreground text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Primeiro Contato sem Compromisso</span>
        </div>
        <h3 className="text-2xl font-serif font-bold text-foreground pt-1">
          Solicite seu atendimento
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Conte-nos o que você planeja transformar. Responderemos com atenção e agilidade.
        </p>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label
          htmlFor="contact-name"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
        >
          <User className="w-3.5 h-3.5 text-primary" />
          Seu Nome Completo *
        </Label>
        <Input
          id="contact-name"
          placeholder="Ex.: Mariana Silveira"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-xl bg-background border-border focus-visible:ring-primary h-11"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="contact-info"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
        >
          <Phone className="w-3.5 h-3.5 text-primary" />
          Telefone / WhatsApp ou E-mail *
        </Label>
        <Input
          id="contact-info"
          placeholder="Ex.: (55) 99123-4567 ou seu@email.com"
          value={contactInfo}
          onChange={(e) => setContactInfo(e.target.value)}
          required
          className="rounded-xl bg-background border-border focus-visible:ring-primary h-11"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="contact-need"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          O que você precisa? *
        </Label>
        <Textarea
          id="contact-need"
          placeholder="Ex.: Gostaria de planejar os armários da cozinha e um painel para a sala. Imóvel novo no Bairro Dores em Santa Maria..."
          value={need}
          onChange={(e) => setNeed(e.target.value)}
          required
          rows={4}
          className="rounded-xl bg-background border-border focus-visible:ring-primary resize-none"
        />
        <p className="text-[11px] text-muted-foreground">
          Pode citar o tipo de cômodo, medidas aproximadas ou se já possui planta/projeto.
        </p>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl bg-primary hover:bg-wood-600 text-primary-foreground font-medium shadow-warm text-base flex items-center justify-center gap-2 transition-all hover:translate-y-[-1px]"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Enviando mensagem...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Enviar Solicitação de Contato</span>
          </>
        )}
      </Button>

      <div className="pt-2 text-center text-[12px] text-muted-foreground">
        Atendimento em Santa Maria/RS e região central • Móveis sob medida em MDF
      </div>
    </form>
  )
}
