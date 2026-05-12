import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGoogleOAuth } from '../hooks/useGoogleOAuth'
import {
  User, Mail, Lock, ShieldCheck, Save, CheckCircle2, Eye, EyeOff, KeyRound,
  Plug, Link2, Unlink, XCircle, Palette, Upload, Image as ImageIcon, RotateCcw, Trash2
} from 'lucide-react'

const GOOGLE_CONNECTORS = [
  { id: 'google-drive', name: 'Google Drive', description: 'Sube y gestiona documentos automaticamente.', icon: '📁', scope: 'https://www.googleapis.com/auth/drive' },
  { id: 'google-gmail', name: 'Gmail', description: 'Envia y recibe correos electronicos.', icon: '✉️', scope: 'https://www.googleapis.com/auth/gmail.modify' },
  { id: 'google-calendar', name: 'Google Calendar', description: 'Gestiona eventos y sincroniza tu calendario.', icon: '📅', scope: 'https://www.googleapis.com/auth/calendar' },
  { id: 'google-maps', name: 'Google Maps', description: 'Geolocalizacion y mapas en tus flujos.', icon: '📍', scope: null },
]

const DEFAULT_BRANDING = {
  displayName: '',
  primaryColor: '#1a3a3a',
  secondaryColor: '#2d5555',
  accentColor: '#3b82f6',
  textOnPrimary: '#ffffff',
  sidebarBg: '#ffffff',
  navbarBg: '#ffffff',
  contentBg: '#f8fafc',
  logoUrl: null,
}

const SettingsModule = () => {
  const { user, token, updateUser, updateBranding } = useAuth()
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

  // ── Branding (tab "Diseño") ─────────────────────────────────────────────
  const [branding, setBranding] = useState(() => ({ ...DEFAULT_BRANDING, ...(user?.branding || {}) }))
  const [brandingDraft, setBrandingDraft] = useState(branding)
  const [savingBranding, setSavingBranding] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Re-sincronizar si el user cambia (login / refresh)
  useEffect(() => {
    if (user?.branding) {
      const merged = { ...DEFAULT_BRANDING, ...user.branding }
      setBranding(merged)
      setBrandingDraft(merged)
    }
  }, [user?.branding?.primaryColor, user?.branding?.secondaryColor, user?.branding?.accentColor, user?.branding?.logoUrl, user?.branding?.displayName])

  const brandingDirty =
    brandingDraft.displayName !== (branding.displayName || '') ||
    brandingDraft.primaryColor !== branding.primaryColor ||
    brandingDraft.secondaryColor !== branding.secondaryColor ||
    brandingDraft.accentColor !== branding.accentColor ||
    brandingDraft.textOnPrimary !== branding.textOnPrimary ||
    brandingDraft.sidebarBg !== branding.sidebarBg ||
    brandingDraft.navbarBg !== branding.navbarBg ||
    brandingDraft.contentBg !== branding.contentBg

  const handleBrandingChange = (key, value) => {
    setBrandingDraft(prev => ({ ...prev, [key]: value }))
  }

  const handleResetBranding = () => {
    setBrandingDraft({ ...DEFAULT_BRANDING, logoUrl: brandingDraft.logoUrl })
  }

  const handleSaveBranding = async () => {
    setSavingBranding(true)
    setError(''); setSuccess('')
    try {
      const res = await fetch('/api/organizations/me/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          displayName: brandingDraft.displayName || null,
          primaryColor: brandingDraft.primaryColor,
          secondaryColor: brandingDraft.secondaryColor,
          accentColor: brandingDraft.accentColor,
          textOnPrimary: brandingDraft.textOnPrimary,
          sidebarBg: brandingDraft.sidebarBg,
          navbarBg: brandingDraft.navbarBg,
          contentBg: brandingDraft.contentBg,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      const next = { ...DEFAULT_BRANDING, ...data.branding }
      setBranding(next)
      setBrandingDraft(next)
      updateBranding(next) // aplica CSS vars en vivo
      setSuccess('Diseño actualizado correctamente')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingBranding(false)
    }
  }

  const handleLogoUpload = async (file) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('El logo no puede pesar más de 2 MB')
      return
    }
    setUploadingLogo(true)
    setError(''); setSuccess('')
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch('/api/organizations/me/logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir logo')
      const next = { ...brandingDraft, logoUrl: data.logoUrl }
      setBranding(next)
      setBrandingDraft(next)
      updateBranding({ logoUrl: data.logoUrl })
      setSuccess('Logo actualizado')
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoDelete = async () => {
    setUploadingLogo(true)
    setError(''); setSuccess('')
    try {
      const res = await fetch('/api/organizations/me/logo', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Error al eliminar logo')
      const next = { ...brandingDraft, logoUrl: null }
      setBranding(next)
      setBrandingDraft(next)
      updateBranding({ logoUrl: null })
      setSuccess('Logo eliminado')
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingLogo(false)
    }
  }

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
  const inputCls = "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]/40 transition-all"

  const isSuperAdmin = user?.role === 'super_admin'
  const isAdmin = user?.role === 'admin' || isSuperAdmin
  const tabs = [
    { id: 'profile', label: 'Datos Personales', icon: User },
    { id: 'password', label: 'Contrasena', icon: KeyRound },
    ...(isSuperAdmin ? [] : [{ id: 'connectors', label: 'Conectores', icon: Plug }]),
    ...(isAdmin ? [{ id: 'design', label: 'Diseño', icon: Palette }] : []),
  ]

  // Diseño tab es más amplio por el preview en vivo
  const wrapperCls = activeSection === 'design' ? 'max-w-6xl mx-auto space-y-5' : 'max-w-2xl mx-auto space-y-5'

  return (
    <div className={wrapperCls}>
      {/* Profile Header */}
      <div className="bg-[var(--brand-primary)] p-6 rounded-xl text-white">
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
                  ? 'border-[var(--brand-primary)] text-slate-900'
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
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--brand-primary)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--brand-secondary)] transition-all active:scale-[0.98] shadow-sm disabled:opacity-50">
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
              <button type="submit" disabled={saving || (confirmPassword && newPassword !== confirmPassword)} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--brand-primary)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--brand-secondary)] transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm">
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <><KeyRound className="w-4 h-4" /><span>Cambiar Contrasena</span></>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Connectors Tab */}
      {activeSection === 'connectors' && !isSuperAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <Plug className="w-4 h-4 text-[var(--brand-primary)]" /> Conectores de Google
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
                <div key={connector.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-all ${isConnected ? 'border-[var(--brand-primary)]/20' : 'border-slate-200'}`}>
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
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-secondary)] rounded-lg transition-all disabled:opacity-50">
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

      {/* Design Tab (solo admin / super_admin) */}
      {activeSection === 'design' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* ── Form column (3/5) ─────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Logo */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-1">
                <ImageIcon className="w-4 h-4 text-slate-500" /> Logo de la organización
              </h3>
              <p className="text-xs text-slate-500 mb-4">PNG, JPG, WebP o SVG. Máx 2 MB. Cuadrado de preferencia.</p>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {brandingDraft.logoUrl ? (
                    <img src={brandingDraft.logoUrl} alt="logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-7 h-7 text-slate-300" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--brand-primary)] text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-[var(--brand-secondary)] transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingLogo ? 'Subiendo…' : (brandingDraft.logoUrl ? 'Reemplazar logo' : 'Subir logo')}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      disabled={uploadingLogo}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = '' }}
                    />
                  </label>
                  {brandingDraft.logoUrl && (
                    <button
                      type="button"
                      onClick={handleLogoDelete}
                      disabled={uploadingLogo}
                      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Quitar logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Display name */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-1">Nombre a mostrar</h3>
              <p className="text-xs text-slate-500 mb-4">El que aparece en el sidebar y headers. Si lo dejas vacío, se usa "{user?.orgName}".</p>
              <input
                type="text"
                value={brandingDraft.displayName || ''}
                onChange={(e) => handleBrandingChange('displayName', e.target.value)}
                placeholder={user?.orgName || 'Mi Empresa'}
                className={inputCls}
                maxLength={255}
              />
            </div>

            {/* Colors */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <Palette className="w-4 h-4 text-slate-500" /> Paleta de colores
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Define los colores principales de la plataforma para tu organización.</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetBranding}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"
                >
                  <RotateCcw className="w-3 h-3" /> Restaurar
                </button>
              </div>

              <div className="space-y-3">
                <ColorRow label="Primario" hint="Botones principales, items activos, acentos"
                  value={brandingDraft.primaryColor} onChange={(v) => handleBrandingChange('primaryColor', v)} />
                <ColorRow label="Secundario" hint="Variante más clara para hovers"
                  value={brandingDraft.secondaryColor} onChange={(v) => handleBrandingChange('secondaryColor', v)} />
                <ColorRow label="Acento" hint="Botones secundarios, links, badges"
                  value={brandingDraft.accentColor} onChange={(v) => handleBrandingChange('accentColor', v)} />
                <ColorRow label="Texto sobre primario" hint="Contraste del texto encima del color primario"
                  value={brandingDraft.textOnPrimary} onChange={(v) => handleBrandingChange('textOnPrimary', v)} />

                <div className="border-t border-slate-100 pt-3 mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Fondos</p>
                </div>

                <ColorRow label="Fondo del sidebar" hint="Color del menú lateral izquierdo"
                  value={brandingDraft.sidebarBg} onChange={(v) => handleBrandingChange('sidebarBg', v)} />
                <ColorRow label="Fondo del navbar" hint="Color de la barra superior con buscador"
                  value={brandingDraft.navbarBg} onChange={(v) => handleBrandingChange('navbarBg', v)} />
                <ColorRow label="Fondo del contenido" hint="Fondo del área principal donde se ven las páginas"
                  value={brandingDraft.contentBg} onChange={(v) => handleBrandingChange('contentBg', v)} />
              </div>
            </div>

            {/* Save button */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {brandingDirty ? 'Tienes cambios sin guardar.' : 'Todo guardado.'}
              </p>
              <button
                type="button"
                onClick={handleSaveBranding}
                disabled={!brandingDirty || savingBranding}
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--brand-primary)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--brand-secondary)] transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
              >
                {savingBranding ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <><Save className="w-4 h-4" /><span>Guardar diseño</span></>}
              </button>
            </div>
          </div>

          {/* ── Live Preview column (2/5) ─────────────────────────────── */}
          <div className="lg:col-span-2">
            <BrandingPreview branding={brandingDraft} orgFallback={user?.orgName} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────
function ColorRow({ label, hint, value, onChange }) {
  const handleHexChange = (v) => {
    const cleaned = v.startsWith('#') ? v : `#${v}`
    onChange(cleaned.slice(0, 7))
  }
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-11 h-11 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0" style={{ background: value }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
          aria-label={`Color ${label}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{label}</span>
          <input
            type="text"
            value={value}
            onChange={(e) => handleHexChange(e.target.value)}
            className="ml-auto w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
            spellCheck={false}
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{hint}</p>
      </div>
    </div>
  )
}

function BrandingPreview({ branding, orgFallback }) {
  const name = branding.displayName?.trim() || orgFallback || 'Mi Empresa'
  return (
    <div className="sticky top-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Vista previa</p>
      <div
        className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex"
        style={{ height: 360, background: branding.contentBg }}
      >
        {/* ── Mock SIDEBAR ─────────────────────────────────── */}
        <div
          className="w-32 flex flex-col border-r border-slate-200/50"
          style={{ background: branding.sidebarBg }}
        >
          {/* Logo + nombre */}
          <div className="flex items-center gap-2 px-2.5 py-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: branding.primaryColor }}
            >
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="logo" className="w-full h-full object-contain" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: branding.textOnPrimary }} />
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-900 truncate">{name}</span>
          </div>
          {/* Nav items */}
          <div className="px-2 space-y-1 mt-1">
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium"
              style={{ background: branding.primaryColor, color: branding.textOnPrimary }}
            >
              <Save className="w-2.5 h-2.5" /> Inicio
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] text-slate-600">
              <UserIcon /> Clientes
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] text-slate-600">
              <UserIcon /> Equipo
            </div>
          </div>
        </div>

        {/* ── Mock right area: navbar + content ─────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Navbar */}
          <div
            className="h-10 flex items-center px-3 gap-2 border-b border-slate-200/50 flex-shrink-0"
            style={{ background: branding.navbarBg }}
          >
            <div className="flex-1 h-5 rounded-md bg-slate-100/80" />
            <div className="w-5 h-5 rounded-full bg-slate-200" />
          </div>

          {/* Content */}
          <div className="flex-1 p-3 overflow-hidden" style={{ background: branding.contentBg }}>
            <div className="bg-white rounded-md p-2 mb-2 border border-slate-200">
              <div className="h-2 w-12 rounded bg-slate-200 mb-1.5" />
              <div className="h-1.5 w-full rounded bg-slate-100" />
              <div className="h-1.5 w-3/4 rounded bg-slate-100 mt-1" />
            </div>
            <button
              type="button"
              className="text-[10px] font-semibold px-2.5 py-1 rounded-md mr-1.5"
              style={{ background: branding.primaryColor, color: branding.textOnPrimary }}
            >
              Acción primaria
            </button>
            <button
              type="button"
              className="text-[10px] font-semibold px-2.5 py-1 rounded-md border"
              style={{ borderColor: branding.accentColor, color: branding.accentColor }}
            >
              Acento
            </button>
            <div className="mt-2 inline-block rounded px-2 py-0.5 text-[9px]"
                 style={{ background: `${branding.accentColor}1a`, color: branding.accentColor }}>
              Badge
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Los cambios se previsualizan aquí en tiempo real. Al pulsar <b>Guardar diseño</b> se aplican a toda la plataforma de tu organización.
      </p>
    </div>
  )
}

// Mini icono inline para mock del preview
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5">
      <circle cx="12" cy="7" r="4" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
    </svg>
  )
}

export default SettingsModule
