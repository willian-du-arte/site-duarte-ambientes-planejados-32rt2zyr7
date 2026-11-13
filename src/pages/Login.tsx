import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginWithPassword } from '@/services/auth'
import { Compass, Lock, Mail, KeyRound, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('willian.duarte@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await loginWithPassword(email.trim(), password)
      navigate('/painel')
    } catch (err: unknown) {
      console.error('Falha no login:', err)
      setError('E-mail ou senha incorretos. Verifique suas credenciais de acesso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para o site</span>
          </Link>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-warm-lg">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-warm">
              <Compass className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              Acesso do Dono
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Duarte Ambientes Planejados • Gestão de Contatos
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="login-email"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                E-mail
              </Label>
              <Input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="rounded-xl h-11 bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="login-password"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-primary" />
                Senha
              </Label>
              <Input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl h-11 bg-background"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary hover:bg-wood-600 text-primary-foreground font-medium shadow-warm mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Entrando no painel...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  <span>Entrar no Painel</span>
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border/80 text-center text-xs text-muted-foreground">
            Acesso reservado exclusivamente para a administração da Duarte Ambientes Planejados.
          </div>
        </div>
      </div>
    </div>
  )
}
