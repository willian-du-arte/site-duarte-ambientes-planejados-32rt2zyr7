import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import LoginPage from './pages/Login'
import ContactsDashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import InstagramPostPage from './pages/InstagramPost'
import Layout from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import ErpLayout from './pages/erp/ErpLayout'
import ErpDashboard from './pages/erp/ErpDashboard'
import ErpCrm from './pages/erp/ErpCrm'
import ErpQuotes from './pages/erp/ErpQuotes'
import { ErpProjects, ErpTasks } from './pages/erp/ErpModules'
import ErpFinance from './pages/erp/ErpFinance'
import { ErpSuppliers } from './pages/erp/ErpSuppliers'
import { ErpPurchases } from './pages/erp/ErpPurchases'
import { ErpInventory } from './pages/erp/ErpInventory'
import ErpContracts from './pages/erp/ErpContracts'
import ErpAgenda from './pages/erp/ErpAgenda'
import ErpProduction from './pages/erp/ErpProduction'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/instagram" element={<InstagramPostPage />} />
          <Route
            path="/painel"
            element={
              <ProtectedRoute>
                <ContactsDashboard />
              </ProtectedRoute>
            }
          />
        </Route>
        {/* Duarte Gestão (ERP interno) */}
        <Route
          element={
            <ProtectedRoute>
              <ErpLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/erp" element={<ErpDashboard />} />
          <Route path="/erp/clientes" element={<ErpCrm />} />
          <Route path="/erp/orcamentos" element={<ErpQuotes />} />
          <Route path="/erp/projetos" element={<ErpProjects />} />
          <Route path="/erp/financeiro" element={<ErpFinance />} />
          <Route path="/erp/tarefas" element={<ErpTasks />} />
          <Route path="/erp/fornecedores" element={<ErpSuppliers />} />
          <Route path="/erp/compras" element={<ErpPurchases />} />
          <Route path="/erp/estoque" element={<ErpInventory />} />
          <Route path="/erp/contratos" element={<ErpContracts />} />
          <Route path="/erp/agenda" element={<ErpAgenda />} />
          <Route path="/erp/producao" element={<ErpProduction />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
