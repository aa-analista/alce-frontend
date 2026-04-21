import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLocation, useOutletContext, useNavigate } from 'react-router-dom'
import { useGoogleOAuth } from '../hooks/useGoogleOAuth'
import { Link2, Unlink, CheckCircle2, XCircle, Shield, ShoppingBag } from 'lucide-react'

// Connector metadata (matches MODULE_CATALOG in backend)
const CONNECTOR_META = {
  'google-drive': {
    name: 'Google Drive',
    description: 'Gestiona documentos, sube archivos y organiza carpetas directamente desde la plataforma.',
    icon: '📁',
    scope: 'https://www.googleapis.com/auth/drive',
    features: ['Subir archivos automaticamente', 'Crear carpetas por proyecto', 'Compartir documentos generados'],
  },
  'google-gmail': {
    name: 'Gmail',
    description: 'Envia correos automaticos, recibe notificaciones y gestiona tu bandeja de entrada.',
    icon: '✉️',
    scope: 'https://www.googleapis.com/auth/gmail.modify',
    features: ['Enviar correos desde flujos', 'Recibir alertas por email', 'Templates de correo automaticos'],
  },
  'google-calendar': {
    name: 'Google Calendar',
    description: 'Crea eventos, sincroniza citas y gestiona tu agenda desde ALCE.',
    icon: '📅',
    scope: 'https://www.googleapis.com/auth/calendar',
    features: ['Crear eventos automaticamente', 'Sincronizar citas de Calendly', 'Recordatorios inteligentes'],
  },
  'google-maps': {
    name: 'Google Maps',
    description: 'Geolocalizacion, mapas y direcciones integradas en tus flujos.',
    icon: '📍',
    scope: null,
    features: ['Buscar direcciones', 'Calcular rutas', 'Geolocalizacion de clientes'],
  },
}

const ConnectorPage = () => {
  const location = useLocation()
  const connectorId = location.pathname.substring(1) // e.g. "/google-drive" -> "google-drive"
  const { token } = useAuth()
  const { connect, disconnect, connecting } = useGoogleOAuth()
  const { flows } = useOutletContext()
  const navigate = useNavigate()
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  const meta = CONNECTOR_META[connectorId]
  const isModuleActive = flows.some(f => f.id === connectorId && f.active)

  // Fetch integration status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/integrations/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setIsConnected(!!data.integrations?.[connectorId])
        }
      } catch (err) {
        console.error('Error fetching connector status:', err)
      }
      setLoading(false)
    }
    fetchStatus()
  }, [connectorId, token])

  const handleConnect = async () => {
    if (!meta?.scope) return
    try {
      await connect(connectorId, meta.scope)
      setIsConnected(true)
    } catch (err) {
      console.error('Connect error:', err)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect(connectorId)
      setIsConnected(false)
    } catch (err) {
      console.error('Disconnect error:', err)
    }
  }

  if (!meta) {
    return (
      <div className="text-center py-12 text-slate-400">
        Conector no encontrado.
      </div>
    )
  }

  if (!isModuleActive) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">{meta.icon}</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{meta.name} no esta activo</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Activa este conector desde el Marketplace para poder usarlo.
          </p>
          <button
            onClick={() => navigate('/marketplace')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            Ir al Marketplace
          </button>
        </div>
      </div>
    )
  }

  const isBusy = connecting === connectorId
  const isOAuth = !!meta.scope

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{meta.icon}</span>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900">{meta.name}</h2>
            <p className="text-sm text-slate-500 mt-1">{meta.description}</p>
          </div>
          <div>
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 className="w-4 h-4" />
                Conectado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-50 text-slate-500 border border-slate-200">
                <XCircle className="w-4 h-4" />
                No conectado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Connection Card */}
      {isOAuth && (
        <div className={`p-6 rounded-xl border ${isConnected ? 'bg-green-50/30 border-green-200' : 'bg-blue-50/30 border-blue-200'}`}>
          <div className="flex items-start gap-3">
            <Shield className={`w-5 h-5 mt-0.5 ${isConnected ? 'text-green-600' : 'text-blue-600'}`} />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-sm">
                {isConnected ? 'Cuenta de Google conectada' : 'Conecta tu cuenta de Google'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {isConnected
                  ? 'Tu cuenta esta vinculada. Puedes desconectar en cualquier momento.'
                  : `Necesitas autorizar acceso a ${meta.name} para usar este conector.`
                }
              </p>
              <div className="mt-4">
                {isConnected ? (
                  <button
                    onClick={handleDisconnect}
                    disabled={isBusy}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-all disabled:opacity-50"
                  >
                    <Unlink className="w-4 h-4" />
                    {isBusy ? 'Desconectando...' : 'Desconectar cuenta'}
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={isBusy}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm"
                  >
                    <Link2 className="w-4 h-4" />
                    {isBusy ? 'Conectando...' : `Conectar ${meta.name}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h3 className="font-semibold text-slate-900 text-sm mb-4">Funcionalidades disponibles</h3>
        <div className="space-y-3">
          {meta.features.map((feature, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-300'}`} />
              <span className={`text-sm ${isConnected ? 'text-slate-700' : 'text-slate-400'}`}>{feature}</span>
            </div>
          ))}
        </div>
        {!isConnected && isOAuth && (
          <p className="text-xs text-slate-400 mt-4">Conecta tu cuenta para desbloquear estas funcionalidades.</p>
        )}
      </div>
    </div>
  )
}

export default ConnectorPage
