import { useState } from 'react'
import {
  SERVICES,
  TESTIMONIALS,
  HIGHLIGHT_NUMBERS,
  STEPS_PROCESS,
  type ServiceItem,
} from '@/data/content'
import { ContactForm } from '@/components/ContactForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Compass,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Ruler,
  Box,
  Wrench,
  Clock,
  Star,
  Quote,
  Layers,
  PhoneCall,
  MapPin,
  UtensilsCrossed,
  BedDouble,
  Shirt,
  Tv,
  Briefcase,
  Stethoscope,
  Building2,
  Check,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ElementType> = {
  UtensilsCrossed,
  BedDouble,
  Shirt,
  Tv,
  Sparkles,
  Briefcase,
  Stethoscope,
  Building2,
  Layers,
}

export default function Index() {
  const [activeCategory, setActiveCategory] = useState<
    'todos' | 'residencial' | 'corporativo' | 'especial'
  >('todos')

  const filteredServices = SERVICES.filter((s) => {
    if (activeCategory === 'todos') return true
    return s.category === activeCategory
  })

  const scrollToContact = () => {
    const el = document.getElementById('contato')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* =========================================================
          HERO / APRESENTAÇÃO
         ========================================================= */}
      <section
        id="apresentacao"
        className="relative overflow-hidden pt-12 pb-20 md:py-24 bg-gradient-to-b from-wood-50 via-background to-background"
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/70 border border-wood-300/60 text-accent-foreground text-xs sm:text-sm font-medium">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Santa Maria / RS • Móveis Sob Medida em MDF</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-foreground leading-[1.15] tracking-tight">
                Ambientes sob medida projetados para valorizar a sua rotina.
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl font-normal">
                Na <strong>Duarte Ambientes Planejados</strong>, transformamos residências,
                escritórios e clínicas com marcenaria sob medida em MDF de alto padrão, modelagem 3D
                e acabamento impecável. Não competimos por menor preço: entregamos durabilidade,
                elegância e precisão milimétrica.
              </p>

              {/* Badges / Key highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/80 shadow-subtle">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    100% MDF Nobre & Ferragens Amortecidas
                  </span>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/80 shadow-subtle">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Box className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    Projeto 3D Realista Antes de Produzir
                  </span>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/80 shadow-subtle">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    Instalação Própria com Garantia
                  </span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                <Button
                  onClick={scrollToContact}
                  className="h-13 px-8 rounded-xl bg-primary hover:bg-wood-600 text-primary-foreground text-base font-semibold shadow-warm transition-all hover:translate-y-[-1px] gap-2.5"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span>Solicitar Atendimento Inicial</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const el = document.getElementById('servicos')
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="h-13 px-6 rounded-xl border-wood-300 text-foreground hover:bg-wood-100 text-base"
                >
                  <span>Conhecer Nossos Serviços</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Atendimento residencial, comercial, consultórios e corporativo em Santa Maria/RS
                </span>
              </div>
            </div>

            {/* Right hero image card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="absolute -inset-2 bg-gradient-to-tr from-primary/20 to-accent/30 rounded-3xl blur-xl" />
                <div className="relative bg-card rounded-2xl overflow-hidden border border-border shadow-warm-lg">
                  <div className="aspect-[4/3] overflow-hidden bg-wood-100 relative">
                    <img
                      src="https://img.usecurling.com/p/900/675?q=custom%20kitchen%20interior%20wood&color=orange"
                      alt="Cozinha planejada sob medida Duarte Ambientes Planejados"
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-background/90 backdrop-blur-md border border-border text-xs flex items-center justify-between">
                      <div className="font-semibold text-foreground">
                        Cozinha em MDF Amadeirado & Ilha Gourmet
                      </div>
                      <span className="text-[11px] text-primary font-medium">Santa Maria / RS</span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-500">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-500" />
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        +450 Projetos Entregues
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      "O padrão de acabamento dos armários e o alinhamento das portas surpreendeu.
                      Tudo feito milimetricamente sob medida para o nosso espaço."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          NÚMEROS DE DESTAQUE / PROVA SOCIAL RÁPIDA
         ========================================================= */}
      <section className="py-12 bg-wood-900 text-wood-50 border-y border-wood-800">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {HIGHLIGHT_NUMBERS.map((num, idx) => (
              <div key={idx} className="text-center space-y-1">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-wood-200">
                  {num.value}
                </div>
                <div className="text-sm font-semibold text-white tracking-wide">{num.label}</div>
                <div className="text-xs text-wood-300/80">{num.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          SERVIÇOS EM DESTAQUE
         ========================================================= */}
      <section id="servicos" className="py-20 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/60 text-accent-foreground text-xs font-semibold uppercase tracking-wider">
              <span>Soluções Sob Medida</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground">
              Móveis Planejados para Cada Espaço
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Desenvolvemos projetos personalizados para residências, clínicas e empresas que
              valorizam a beleza duradoura do MDF de alta qualidade.
            </p>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              <Button
                variant={activeCategory === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory('todos')}
                className="rounded-full text-xs"
              >
                Todos os Ambientes
              </Button>
              <Button
                variant={activeCategory === 'residencial' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory('residencial')}
                className="rounded-full text-xs"
              >
                Residenciais
              </Button>
              <Button
                variant={activeCategory === 'corporativo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory('corporativo')}
                className="rounded-full text-xs"
              >
                Corporativos & Clínicas
              </Button>
              <Button
                variant={activeCategory === 'especial' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory('especial')}
                className="rounded-full text-xs"
              >
                Modelagem 3D
              </Button>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredServices.map((service) => {
              const IconComp = ICON_MAP[service.iconName] || Sparkles
              return (
                <div
                  key={service.id}
                  className="group bg-card border border-border/80 hover:border-wood-400 rounded-2xl overflow-hidden shadow-subtle hover:shadow-warm transition-all duration-300 flex flex-col"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-muted relative">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-background/90 backdrop-blur-sm text-foreground border border-border">
                        {service.category === 'residencial'
                          ? 'Residencial'
                          : service.category === 'corporativo'
                            ? 'Comercial'
                            : 'Projeto Especial'}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <h3 className="font-serif font-bold text-xl text-foreground">
                          {service.title}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border/60">
                      <div className="flex items-center gap-2 text-xs font-medium text-primary">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>{service.highlight}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Banner bottom services */}
          <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-wood-50 border border-wood-200 text-center max-w-3xl mx-auto space-y-4">
            <h3 className="font-serif font-bold text-xl sm:text-2xl text-foreground">
              Tem um projeto diferente ou uma planta em mãos?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
              Nossa equipe atende projetos arquitetônicos autorais e clientes finais, traduzindo
              cada desenho técnico em marcenaria sob medida de precisão.
            </p>
            <Button
              onClick={scrollToContact}
              className="rounded-xl bg-primary hover:bg-wood-600 text-primary-foreground shadow-warm"
            >
              Falar sobre meu ambiente
            </Button>
          </div>
        </div>
      </section>

      {/* =========================================================
          PROCESSO COMERCIAL (DO CONTATO À INSTALAÇÃO)
         ========================================================= */}
      <section id="processo" className="py-20 bg-wood-50/70 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/60 text-accent-foreground text-xs font-semibold uppercase tracking-wider">
              <span>Como Trabalhamos</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground">
              Do Primeiro Contato à Entrega Perfeita
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Processo claro, transparente e sem surpresas. Cuidamos de cada etapa para que a
              realização do seu ambiente seja uma experiência tranquila.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {STEPS_PROCESS.map((item, index) => (
              <div
                key={item.step}
                className="bg-card border border-border/80 rounded-2xl p-5 shadow-subtle flex flex-col justify-between relative"
              >
                <div>
                  <div className="text-2xl font-serif font-bold text-primary mb-2">{item.step}</div>
                  <h4 className="font-serif font-bold text-base text-foreground mb-2">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 text-[11px] font-semibold text-primary/80">
                  Etapa {index + 1} de 5
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          PROVA SOCIAL / DEPOIMENTOS
         ========================================================= */}
      <section id="depoimentos" className="py-20 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/60 text-accent-foreground text-xs font-semibold uppercase tracking-wider">
              <span>Depoimentos & Experiências</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground">
              A Confiança de Quem Vive o Resultado
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Veja o que clientes e parceiros de Santa Maria e região dizem sobre o padrão Duarte
              Ambientes Planejados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {TESTIMONIALS.map((item) => (
              <div
                key={item.id}
                className="bg-card border border-border/80 rounded-2xl p-6 sm:p-7 shadow-subtle flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(item.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-500" />
                      ))}
                    </div>
                    <Quote className="w-6 h-6 text-wood-300" />
                  </div>

                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed italic">
                    "{item.text}"
                  </p>
                </div>

                <div className="pt-4 border-t border-border/60">
                  <div className="font-serif font-bold text-base text-foreground">{item.name}</div>
                  <div className="text-xs text-primary font-medium">{item.environment}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {item.role} • {item.location}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Callout diferencial */}
          <div className="mt-12 bg-wood-100 border border-wood-200 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-serif font-bold text-lg sm:text-xl text-foreground">
                Por que escolher a Duarte em Santa Maria?
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                MDF com fitamento com cola PUR resistente à água, dobradiças com amortecedor slow,
                corrediças invisíveis e montagem limpa.
              </p>
            </div>
            <Button
              onClick={scrollToContact}
              className="rounded-xl bg-primary hover:bg-wood-600 text-primary-foreground shrink-0 shadow-warm"
            >
              Fazer Orçamento
            </Button>
          </div>
        </div>
      </section>

      {/* =========================================================
          SEÇÃO DO FORMULÁRIO DE CONTATO (PÁGINA ÚNICA)
         ========================================================= */}
      <section
        id="contato"
        className="py-20 md:py-24 bg-gradient-to-b from-wood-50 via-wood-50 to-background border-t border-border"
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Informações de contato do lado esquerdo */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/60 text-accent-foreground text-xs font-semibold uppercase tracking-wider">
                  <span>Inicie Seu Projeto</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground leading-tight">
                  Vamos planejar o seu próximo ambiente?
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Preencha o formulário ao lado. Entraremos em contato para entender as dimensões do
                  seu ambiente, seus gostos e agendar a visita técnica.
                </p>
              </div>

              {/* Box de contato rápido */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border shadow-subtle">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Área de Atendimento
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Santa Maria/RS e cidades vizinhas da região central do RS.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border shadow-subtle">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Atendimento Direto
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (55) 99123-4567 • WhatsApp e ligações
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border shadow-subtle">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Horário Comercial
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Segunda a Sexta, das 08h às 18h | Sábados sob agendamento prévio.
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Privacidade Garantida
                </div>
                <p>
                  Seus dados são recebidos diretamente no painel restrito da Duarte Ambientes
                  Planejados e usados unicamente para responder ao seu contato.
                </p>
              </div>
            </div>

            {/* Formulário do lado direito */}
            <div className="lg:col-span-7">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
