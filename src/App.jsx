import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import AgenteModule from './components/AgenteModule'
import DocumentModule from './components/DocumentModule'
import AccountabilityModule from './components/AccountabilityModule'
import MarketplaceModule from './components/MarketplaceModule'
import UsersModule from './components/UsersModule'
import GastosModule from './components/GastosModule'
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
import HomeDashboard from './components/HomeDashboard'
import { AssistantProvider } from './context/AssistantContext'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-[#1a3a3a] rounded-xl mb-4">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div className="w-6 h-6 border-2 border-[#1a3a3a]/20 border-t-[#1a3a3a] rounded-full animate-spin mx-auto" />
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
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1a3a3a] border-t-transparent" />
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
          <Route path="/" element={<ProtectedRoute><AssistantProvider><Dashboard /></AssistantProvider></ProtectedRoute>}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<HomeDashboard />} />
            <Route path="coach-ai" element={<CoachAIPage />} />
            <Route path="operacion" element={<OperacionPage />} />
            <Route path="actividad" element={<PlaceholderPage title="Actividad" />} />
            {/* Renamed in sidebar but same routes */}
            <Route path="marketplace" element={<MarketplaceModule />} />
            <Route path="usuarios" element={<UsersModule />} />
            <Route path="gastos" element={<GastosModule />} />
            <Route path="ajustes" element={<SettingsModule />} />
            {/* Module routes (accessible via URL, not in sidebar) */}
            <Route path="agente" element={<AgenteModule />} />
            <Route path="documentos" element={<DocumentModule />} />
            <Route path="accountability" element={<AccountabilityModule />} />
            <Route path="conocimiento" element={<KnowledgeBaseModule />} />
            {/* Google Connector pages */}
            <Route path="google-drive" element={<ConnectorPage />} />
            <Route path="google-gmail" element={<GmailPage />} />
            <Route path="google-calendar" element={<GoogleCalendarPage />} />
            <Route path="google-maps" element={<ConnectorPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
