import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import AgenteModule from './components/AgenteModule'
import DocumentModule from './components/DocumentModule'
import AccountabilityModule from './components/AccountabilityModule'
import MarketplaceModule from './components/MarketplaceModule'
import UsersModule from './components/UsersModule'
import GastosModule from './components/GastosModule'
import OpenUIModule from './components/OpenUIModule'
import OpenDesignModule from './components/OpenDesignModule'
import ClientesModule from './components/ClientesModule'
import SettingsModule from './components/SettingsModule'
import KnowledgeBaseModule from './components/KnowledgeBaseModule'
import ConnectorPage from './components/ConnectorPage'
import GoogleCalendarPage from './components/GoogleCalendarPage'
import GmailPage from './components/GmailPage'
import CoachAIPage from './components/CoachAIPage'
import OperacionPage from './components/OperacionPage'
import AssistantWidget from './components/AssistantWidget'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import ActivatePage from './components/ActivatePage'
import HomeDashboard from './components/HomeDashboard'
// ── Módulos integrados (Efra): Gestión equipo, Contratos, Empleados, ruta pública ──
import GestionEquipoModule from './components/GestionEquipoModule'
import AlceEmpleadoView from './components/AlceEmpleadoView'
import ContratosModule from './components/ContratosModule'
import PublicContratoView from './components/PublicContratoView'
import PropuestasModule from './components/PropuestasModule'
import AgentesAdminModule from './components/AgentesAdminModule'
import { AssistantProvider } from './context/AssistantContext'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-[var(--brand-primary)] rounded-xl mb-4">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div className="w-6 h-6 border-2 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}

// Renders a custom iframe agent by looking up its config from the API
function DynamicAgentModule() {
  const { anyModule } = useParams()
  const { token } = useAuth()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch('/api/modules/agent-configs', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.agents) setConfig(data.agents.find(a => a.module_id === anyModule) || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [anyModule, token])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--brand-primary)] border-t-transparent" />
      </div>
    )
  }
  if (!config) return <Navigate to="/home" replace />

  if (config.url) {
    return (
      <div className="h-[calc(100vh-56px)] -mx-4 -my-4">
        <iframe
          src={config.url}
          className="w-full h-full border-0"
          title={config.name}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-modals"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-4xl mb-3">{config.icon || '🤖'}</p>
        <p className="text-lg font-semibold text-slate-900">{config.name}</p>
        <p className="text-sm text-slate-400 mt-1">Módulo en construcción</p>
      </div>
    </div>
  )
}

// Placeholder for future pages
function PlaceholderPage({ title }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-400 mt-1">Proximamente</p>
      </div>
    </div>
  )
}

function Dashboard() {
  const { token } = useAuth()
  const [flows, setFlows] = useState([])
  const [loadingFlows, setLoadingFlows] = useState(true)

  useEffect(() => {
    const fetchMyModules = async () => {
      try {
        const res = await fetch('/api/modules/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setFlows(data.modules)
        }
      } catch (err) {
        console.error('Error loading modules:', err)
      }
      setLoadingFlows(false)
    }
    fetchMyModules()
  }, [token])

  if (loadingFlows) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--brand-primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <Layout userModules={flows}>
      <Outlet context={{ flows, setFlows }} />
      <AssistantWidget />
    </Layout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/activar" element={<ActivatePage />} />
          {/* Ruta pública para clientes que reciben contratos — sin auth */}
          <Route path="/p/:token" element={<PublicContratoView />} />
          <Route path="/" element={<ProtectedRoute><AssistantProvider><Dashboard /></AssistantProvider></ProtectedRoute>}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<HomeDashboard />} />
            <Route path="coach-ai" element={<CoachAIPage />} />
            <Route path="operacion" element={<OperacionPage />} />
            <Route path="operacion/equipo/:id" element={<AlceEmpleadoView />} />
            <Route path="actividad" element={<PlaceholderPage title="Actividad" />} />
            {/* Renamed in sidebar but same routes */}
            <Route path="marketplace" element={<MarketplaceModule />} />
            <Route path="usuarios" element={<UsersModule />} />
            <Route path="gastos" element={<GastosModule />} />
            <Route path="openui" element={<OpenUIModule />} />
            <Route path="design" element={<OpenDesignModule />} />
            <Route path="clientes" element={<ClientesModule />} />
            <Route path="ajustes" element={<SettingsModule />} />
            {/* Module routes (accessible via URL, not in sidebar) */}
            <Route path="agente" element={<AgenteModule />} />
            <Route path="documentos" element={<DocumentModule />} />
            <Route path="accountability" element={<AccountabilityModule />} />
            <Route path="conocimiento" element={<KnowledgeBaseModule />} />
            {/* Módulos integrados (Efra) */}
            <Route path="gestion-equipo" element={<GestionEquipoModule />} />
            <Route path="gestion-equipo/equipo/:id" element={<AlceEmpleadoView />} />
            <Route path="contratos" element={<ContratosModule />} />
            <Route path="propuestas" element={<PropuestasModule />} />
            {/* Google Connector pages */}
            <Route path="google-drive" element={<ConnectorPage />} />
            <Route path="google-gmail" element={<GmailPage />} />
            <Route path="google-calendar" element={<GoogleCalendarPage />} />
            <Route path="google-maps" element={<ConnectorPage />} />
            {/* Super-admin agent management */}
            <Route path="agentes" element={<AgentesAdminModule />} />
            {/* Catch-all for custom dynamic agents added via AgentesAdminModule */}
            <Route path=":anyModule" element={<DynamicAgentModule />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
