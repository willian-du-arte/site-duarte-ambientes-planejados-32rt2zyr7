import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { isUserAuthenticated, getCurrentUser, logout } from '@/services/auth'
import { Compass, Lock, LogOut, Menu, X, PhoneCall } from 'lucide-react'

export function Navbar() {
  const [isAuth, setIsAuth] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setIsAuth(isUserAuthenticated())
  }, [])

  const handleLogout = () => {
    logout()
    setIsAuth(false)
    navigate('/')
  }

  const scrollTo = (id: string) => {
    setMobileOpen(false)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const user = getCurrentUser()

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/60 transition-all">
      <div className="container mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-warm transition-transform group-hover:scale-105">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <span className="font-serif font-bold text-xl sm:text-2xl text-foreground tracking-tight block leading-tight">
              Duarte
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block -mt-0.5">
              Ambientes Planejados • Santa Maria/RS
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          <button
            onClick={() => scrollTo('apresentacao')}
            className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors cursor-pointer"
          >
            Apresentação
          </button>
          <button
            onClick={() => scrollTo('servicos')}
            className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors cursor-pointer"
          >
            Serviços em Destaque
          </button>
          <button
            onClick={() => scrollTo('depoimentos')}
            className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors cursor-pointer"
          >
            Depoimentos & Prova Social
          </button>
          <button
            onClick={() => scrollTo('processo')}
            className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors cursor-pointer"
          >
            Nosso Processo
          </button>
        </nav>

        {/* CTA & Admin Link */}
        <div className="hidden sm:flex items-center gap-3">
          <Button
            onClick={() => scrollTo('contato')}
            className="rounded-xl bg-primary hover:bg-wood-600 text-primary-foreground shadow-warm px-5 h-10 gap-2 cursor-pointer font-medium"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Solicitar Orçamento</span>
          </Button>

          {isAuth ? (
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="rounded-xl border-wood-300 text-xs text-foreground hover:bg-wood-100"
              >
                <Link to="/painel">Painel de Contatos</Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title={`Sair (${user?.email || 'admin'})`}
                className="rounded-xl text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="rounded-xl text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <Link to="/login" title="Acesso do Dono">
                <Lock className="w-3.5 h-3.5" />
                <span>Painel</span>
              </Link>
            </Button>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-xl text-foreground hover:bg-muted"
          aria-label="Abrir menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-border bg-card px-6 py-5 space-y-4 animate-fade-in shadow-warm">
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => scrollTo('apresentacao')}
              className="text-left py-2 font-medium text-foreground hover:text-primary transition-colors"
            >
              Apresentação
            </button>
            <button
              onClick={() => scrollTo('servicos')}
              className="text-left py-2 font-medium text-foreground hover:text-primary transition-colors"
            >
              Serviços em Destaque
            </button>
            <button
              onClick={() => scrollTo('depoimentos')}
              className="text-left py-2 font-medium text-foreground hover:text-primary transition-colors"
            >
              Depoimentos & Prova Social
            </button>
            <button
              onClick={() => scrollTo('processo')}
              className="text-left py-2 font-medium text-foreground hover:text-primary transition-colors"
            >
              Nosso Processo Comercial
            </button>
            <button
              onClick={() => scrollTo('contato')}
              className="text-left py-2 font-medium text-primary hover:underline"
            >
              Formulário de Contato
            </button>
          </div>

          <div className="pt-4 border-t border-border flex flex-col gap-2">
            <Button
              onClick={() => scrollTo('contato')}
              className="w-full rounded-xl bg-primary text-primary-foreground shadow-warm"
            >
              Solicitar Atendimento
            </Button>

            {isAuth ? (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" asChild className="flex-1 rounded-xl">
                  <Link to="/painel" onClick={() => setMobileOpen(false)}>
                    Painel do Dono
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="rounded-xl text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-1" /> Sair
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                asChild
                className="w-full rounded-xl justify-center text-xs text-muted-foreground"
              >
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Lock className="w-3.5 h-3.5 mr-1" /> Acesso do Dono (Painel)
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
