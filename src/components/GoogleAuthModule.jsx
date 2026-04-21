import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'

const GoogleAuthModule = () => {
  const [apps, setApps] = useState([
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Conecta tu cuenta de Google Drive para subir y gestionar documentos automaticamente.',
      icon: '📁',
      active: false
    },
    {
      id: 'google-maps',
      name: 'Google Maps',
      description: 'Habilita Google Maps API para funcionalidades de geolocalizacion y mapas.',
      icon: '📍',
      active: false
    },
    {
      id: 'google-workspace',
      name: 'Google Workspace',
      description: 'Integra aplicaciones de Google Workspace (Docs, Sheets, Calendar) a tu flujo.',
      icon: '📊',
      active: false
    }
  ])

  const [toggling, setToggling] = useState(null)
  const { token } = useAuth()

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const res = await fetch('/api/integrations/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.integrations) {
            setApps(prev => prev.map(a =>
              data.integrations[a.id] ? { ...a, active: true } : a
            ))
          }
        }
      } catch (err) {
        console.error('Error fetching integrations:', err)
      }
    }
    fetchIntegrations()
  }, [token])

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log('Google Auth Success:', tokenResponse)
      if (toggling) {
        try {
          const res = await fetch('/api/integrations/google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              access_token: tokenResponse.access_token,
              provider: toggling
            })
          })
          if (res.ok) {
            setApps(apps.map(a => a.id === toggling ? { ...a, active: true } : a))
          }
        } catch (e) {
          console.error(e)
        }
        setToggling(null)
      }
    },
    onError: (error) => {
      console.error('Google Auth Error:', error)
      setToggling(null)
    }
  })

  const toggleAuth = async (id) => {
    const app = apps.find(a => a.id === id)
    if (!app) return

    if (app.active) {
      setToggling(id)
      try {
        const res = await fetch('/api/integrations/disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ provider: id })
        })
        if (res.ok) {
          setApps(apps.map(a => a.id === id ? { ...a, active: false } : a))
        }
      } catch (e) {
        console.error(e)
      }
      setToggling(null)
      return
    }

    setToggling(id)
    login()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Google Auth Console
          </h2>
          <p className="text-slate-500 text-sm mt-1">Conecta tus aplicaciones de Google mediante OAuth2.</p>
        </div>
        <div className="bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span className="text-blue-700 font-semibold text-xs">OAuth2</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {apps.map((app) => (
          <div
            key={app.id}
            className={`group p-5 rounded-xl border transition-all duration-200 ${app.active
                ? 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                : 'bg-slate-50 border-slate-100 opacity-75'
              }`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-3xl">{app.icon}</span>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {app.name}
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 line-clamp-2 leading-relaxed">
                {app.description}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {app.active ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${app.active ? 'text-green-600' : 'text-slate-400'
                  }`}>
                  {app.active ? 'Conectado' : 'No Conectado'}
                </span>
              </div>
              <button
                onClick={() => toggleAuth(app.id)}
                disabled={toggling === app.id}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  app.active
                    ? 'text-red-600 hover:bg-red-50 border border-red-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } ${toggling === app.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {toggling === app.id ? 'Conectando...' : app.active ? 'Desconectar' : 'Conectar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GoogleAuthModule
