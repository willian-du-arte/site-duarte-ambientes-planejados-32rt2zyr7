// Shell do Duarte Gestão (ERP) — layout com menu lateral, visual grafite + dourado.
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  FileText,
  FolderKanban,
  Wallet,
  CheckSquare,
  LogOut,
  Hammer,
  Truck,
  ShoppingCart,
  Boxes,
  ScrollText,
  CalendarClock,
  HardHat,
  TrendingUp,
  BarChart3,
  LifeBuoy,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getCurrentUser, logout } from '@/services/auth'

const NAV_ITEMS = [
  { to: '/erp', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/erp/clientes', label: 'Clientes / CRM', icon: Users, end: false },
  { to: '/erp/orcamentos', label: 'Orçamentos', icon: FileText, end: false },
  { to: '/erp/projetos', label: 'Projetos', icon: FolderKanban, end: false },
  { to: '/erp/producao', label: 'Produção', icon: HardHat, end: false },
  { to: '/erp/financeiro', label: 'Financeiro', icon: Wallet, end: false },
  { to: '/erp/tarefas', label: 'Tarefas', icon: CheckSquare, end: false },
  { to: '/erp/fornecedores', label: 'Fornecedores', icon: Truck, end: false },
  { to: '/erp/compras', label: 'Compras', icon: ShoppingCart, end: false },
  { to: '/erp/estoque', label: 'Estoque', icon: Boxes, end: false },
  { to: '/erp/contratos', label: 'Contratos', icon: ScrollText, end: false },
  { to: '/erp/agenda', label: 'Agenda', icon: CalendarClock, end: false },
  { to: '/erp/rentabilidade', label: 'Rentabilidade', icon: TrendingUp, end: false },
  { to: '/erp/relatorios', label: 'Relatórios', icon: BarChart3, end: false },
  { to: '/erp/posvenda', label: 'Pós-venda', icon: LifeBuoy, end: false },
  { to: '/erp/assistente', label: 'Assistente', icon: Sparkles, end: false },
]

export default function ErpLayout() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const user = getCurrentUser()

  useEffect(() => {
    // fecha o menu ao navegar (mobile)
    setOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#17181c] text-zinc-100">
      {/* topo mobile */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#1d1f24] px-4 py-3">
        <div className="flex items-center gap-2">
          <Hammer className="h-5 w-5 text-amber-300" />
          <span className="font-serif text-lg tracking-wide">Duarte Gestão</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      <div className="flex">
        {/* menu lateral */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-white/10 bg-[#1d1f24] transition-transform lg:static lg:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="hidden lg:flex items-center gap-2 border-b border-white/10 px-5 py-5">
            <Hammer className="h-6 w-6 text-amber-300" />
            <div>
              <p className="font-serif text-lg leading-tight tracking-wide">Duarte Gestão</p>
              <p className="text-[11px] uppercase tracking-widest text-amber-200/70">
                Duarte Ambientes
              </p>
            </div>
          </div>

          <nav className="space-y-1 px-3 py-4">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-amber-300/10 text-amber-200 border-l-2 border-amber-300'
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-white/10 px-4 py-4">
            <p className="truncate text-xs text-zinc-400">{user?.email}</p>
            <button
              onClick={handleLogout}
              className="mt-2 flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </aside>

        {open && (
          <div
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* conteúdo */}
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
