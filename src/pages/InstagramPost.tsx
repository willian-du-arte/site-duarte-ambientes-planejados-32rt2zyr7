import { useState } from 'react'
import { InstagramPostIllustration } from '@/components/instagram/InstagramPostIllustration'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Copy, Instagram, MapPin, Sparkles, ArrowUpRight } from 'lucide-react'

const SITE_URL = 'https://site-duarte-ambientes-planejados-c8494.goskip.app'

const CAPTION = `Aquele sonho de cozinha planejada que cabe PERFEITAMENTE no seu apê 🤎

Aqui, cada centímetro foi pensado: armários que vão até o teto, despensa embutida e ilha com banquetas — tudo sob medida, do jeito que a sua família vive.

✨ Você acompanha tudo antes de produzir: projetamos com modelagem 3D para você visualizar cada detalhe do seu ambiente.
🔨 Fabricação própria em MDF nobre, com instalação feita pela nossa equipe — do primeiro parafuso ao acabamento final.

Quer uma cozinha assim na sua casa? 🙌
👉 Link na bio para solicitar seu orçamento — a Duarte Ambientes Planejados atende Santa Maria/RS e região.

#marcenaria #cozinhaplanejada #moveisplanejados #santamariars #mdf #sobmedida #arquitetura #reforma`

function CopyCaptionButton() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(CAPTION)
      } else {
        // Fallback para contextos sem Clipboard API (ex.: http)
        const ta = document.createElement('textarea')
        ta.value = CAPTION
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Button
      onClick={copy}
      className="rounded-xl bg-primary hover:bg-wood-600 text-primary-foreground shadow-warm gap-2"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          <span>Copiado!</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          <span>Copiar legenda</span>
        </>
      )}
    </Button>
  )
}

export default function InstagramPostPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-wood-50 via-background to-wood-100/60">
      <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
        {/* Cabeçalho da página (fora do post) */}
        <div className="max-w-2xl mx-auto text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/60 text-accent-foreground text-xs font-semibold uppercase tracking-wider">
            <Instagram className="w-3.5 h-3.5" />
            <span>Material para Instagram</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground">
            Post pronto para publicar
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Arte em 1080×1080 e legenda prontas para a Duarte Ambientes Planejados. Copie a legenda
            e salve a imagem para publicar direto no feed.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* ===== POST 1080x1080 ===== */}
          <div className="lg:col-span-7">
            <div className="mx-auto w-full max-w-[560px] lg:max-w-[620px]">
              <div
                className="relative w-full rounded-2xl overflow-hidden border border-wood-200 shadow-warm-lg"
                style={{ aspectRatio: '1 / 1' }}
              >
                <InstagramPostIllustration />

                {/* ===== Identidade + CTA sobre a ilustração ===== */}
                <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-6 md:p-8 pointer-events-none">
                  {/* Topo: marca + selo */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-white/80 backdrop-blur-sm border border-wood-200/70 shadow-warm px-4 py-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="font-serif font-bold text-foreground text-sm sm:text-base leading-tight">
                        Duarte Ambientes Planejados
                      </span>
                    </div>
                    <span className="pointer-events-auto rounded-full bg-wood-900/85 backdrop-blur-sm text-wood-50 text-[11px] sm:text-xs font-medium px-3 py-1.5 whitespace-nowrap">
                      Sob medida em MDF · Santa Maria/RS
                    </span>
                  </div>

                  {/* Base: CTA em destaque */}
                  <div className="flex justify-center">
                    <a
                      href={`${SITE_URL}/#orcamento`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pointer-events-auto inline-flex items-center gap-2.5 rounded-2xl bg-primary hover:bg-wood-700 text-primary-foreground font-semibold text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 shadow-warm-lg transition-all hover:translate-y-[-2px]"
                    >
                      Solicite seu Orçamento
                      <ArrowUpRight className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-3">
                Formato final: 1080×1080 px (feed do Instagram) — use "salvar imagem" ou uma captura
                em escala real.
              </p>
            </div>
          </div>

          {/* ===== LEGENDA PRONTA ===== */}
          <div className="lg:col-span-5">
            <div className="bg-card border border-border/80 rounded-2xl shadow-warm overflow-hidden">
              <div className="p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/60 text-accent-foreground text-xs font-semibold uppercase tracking-wider">
                    <span>Legenda pronta</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-full border-wood-300 text-wood-700 text-[11px]"
                  >
                    Português (BR)
                  </Badge>
                </div>

                <div className="rounded-xl bg-wood-50 border border-wood-200 p-5 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap max-h-[460px] overflow-y-auto">
                  {CAPTION}
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{CAPTION.length} caracteres</span>
                  </div>
                  <CopyCaptionButton />
                </div>
              </div>

              <div className="px-6 sm:px-7 py-4 bg-wood-900/5 border-t border-border/70 text-xs text-muted-foreground">
                O link do botão "Solicite seu Orçamento" abre {SITE_URL}/#orcamento — a seção de
                orçamento da home.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
