import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGoogleOAuth } from '../hooks/useGoogleOAuth'
import {
  User, Mail, Lock, ShieldCheck, Save, CheckCircle2, Eye, EyeOff, KeyRound,
  Plug, Link2, Unlink, XCircle
} from 'lucide-react'

const GOOGLE_CONNECTORS = [
  { id: 'google-drive', name: 'Google Drive', description: 'Sube y gestiona documentos automaticamente.', icon: '📁', scope: 'https://www.googleapis.com/auth/drive' },
  { id: 'google-gmail', name: 'Gmail', description: 'Envia y recibe correos electronicos.', icon: '✉️', scope: 'https://www.googleapis.com/auth/gmail.modify' },
  { id: 'google-calendar', name: 'Google Calendar', description: 'Gestiona eventos y sincroniza tu calendario.', icon: '📅', scope: 'https://www.googleapis.com/auth/calendar' },
  { id: 'google-maps', name: 'Google Maps', description: 'Geolocalizacion y mapas en tus flujos.', icon: '📍', scope: null },
]

const SettingsModule = () => {
  const { user, token, updateUser } = useAuth()
  const { connect, disconnect, connecting } = useGoogleOAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeSection, setActiveSection] = useState('profile')
  const [integrations, setIntegrations] = useState({})
  const [loadingIntegrations, setLoadingIntegrations] = useState(false)

  // Fetch integrations when connectors tab is active
  useEffect(() => {
    if (activeSection === 'connectors') fetchIntegrations()
  }, [activeSection])

  const fetchIntegrations = async () => {
    setLoadingIntegrations(true)
    try {
      const res = await fetch('/api/integrations/me', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setIntegrations(data.integrations || {}) }
    } catch (err) { console.error(err) }
    setLoadingIntegrations(false)
  }

  const handleConnectOAuth = async (connector) => {
    if (!connector.scope) return
    try {
      await connect(connector.id, connector.scope)
      setIntegrations(prev => ({ ...prev, [connector.id]: true }))
    } catch (err) { console.error('Connect error:', err) }
  }

  const handleDisconnectOAuth = async (connector) => {
    try {
      await disconnect(connector.id)
      setIntegrations(prev => { const next = { ...prev }; delete next[connector.id]; return next })
    } catch (err) { console.error('Disconnect error:', err) }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setSaving(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Update user in context so navbar reflects changes immediately
      updateUser({ name, email })
      setSuccess(data.message)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) { setError(err.message) }
    setSaving(false)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault(); setError(''); setSuccess('')
    if (newPassword !== confirmPassword) { setError('Las contrasenas nuevas no coinciden'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess('Contrasena actualizada exitosamente')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) { setError(err.message) }
    setSaving(false)
  }

  const roleLabel = { super_admin: 'Super Admin', admin: 'Administrador', user: 'Usuario' }
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'
  const inputCls = "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 transition-all"

  const tabs = [
    { id: 'profile', label: 'Datos Personales', icon: User },
    { id: 'password', label: 'Contrasena', icon: KeyRound },
    { id: 'connectors', label: 'Conectores', icon: Plug },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Profile Header */}
      <div className="bg-[#1a3a3a] p-6 rounded-xl text-white">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-xl font-bold">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.name}</h2>
            <p className="text-white/60 text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="bg-white/15 text-white text-xs font-medium px-2 py-0.5 rounded-md">
                {roleLabel[user?.role] || user?.role}
              </span>
              <span className="text-white/40 text-xs">{user?.orgName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveSection(tab.id); setError(''); setSuccess('') }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                activeSection === tab.id
                  ? 'border-[#1a3a3a] text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Messages */}
      {error && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm text-center flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" />{success}</div>}

      {/* Profile Form */}
      {activeSection === 'profile' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-900 text-sm mb-5 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" /> Datos Personales
          </h3>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Correo Electronico</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[#1a3a3a] text-white rounded-lg font-semibold text-sm hover:bg-[#224a4a] transition-all active:scale-[0.98] shadow-sm disabled:opacity-50">
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <><Save className="w-4 h-4" /><span>Guardar Cambios</span></>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Form */}
      {activeSection === 'password' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-900 text-sm mb-5 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-slate-500" /> Cambiar Contrasena
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrasena Actual</label>
              <div className="relative">
                <input type={showPasswords ? 'text' : 'password'} required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={`${inputCls} pr-12`} placeholder="Tu contrasena actual" />
                <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Nueva Contrasena</label>
              <input type={showPasswords ? 'text' : 'password'} required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} placeholder="Min. 6 caracteres" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirmar Nueva Contrasena</label>
              <input type={showPasswords ? 'text' : 'password'} required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${inputCls} ${confirmPassword && newPassword !== confirmPassword ? '!border-red-300 !ring-red-500/20' : confirmPassword && newPassword === confirmPassword ? '!border-green-300 !ring-green-500/20' : ''}`}
                placeholder="Repite la nueva contrasena" />
              {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-500">Las contrasenas no coinciden</p>}
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={saving || (confirmPassword && newPassword !== confirmPassword)} className="flex items-center gap-2 px-5 py-2.5 bg-[#1a3a3a] text-white rounded-lg font-semibold text-sm hover:bg-[#224a4a] transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm">
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <><KeyRound className="w-4 h-4" /><span>Cambiar Contrasena</span></>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Connectors Tab */}
      {activeSection === 'connectors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <Plug className="w-4 h-4 text-[#1a3a3a]" /> Conectores de Google
              </h3>
              <p className="text-xs text-slate-500 mt-1">Conecta y administra tus servicios de Google individualmente.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {GOOGLE_CONNECTORS.map((connector) => {
              const isConnected = !!integrations[connector.id]
              const isBusy = connecting === connector.id
              const isOAuth = !!connector.scope

              return (
                <div key={connector.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-all ${isConnected ? 'border-[#1a3a3a]/20' : 'border-slate-200'}`}>
                  <span className="text-2xl flex-shrink-0">{connector.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{connector.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{connector.description}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isConnected ? (
                      <>
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                        </span>
                        {isOAuth && (
                          <button onClick={() => handleDisconnectOAuth(connector)} disabled={isBusy}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all disabled:opacity-50">
                            <Unlink className="w-3 h-3" /> {isBusy ? '...' : 'Desconectar'}
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <XCircle className="w-3.5 h-3.5" /> No conectado
                        </span>
                        {isOAuth && (
                          <button onClick={() => handleConnectOAuth(connector)} disabled={isBusy}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#1a3a3a] text-white hover:bg-[#224a4a] rounded-lg transition-all disabled:opacity-50">
                            <Link2 className="w-3 h-3" /> {isBusy ? 'Conectando...' : 'Conectar'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsModule
