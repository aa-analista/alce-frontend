import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGoogleOAuth } from '../hooks/useGoogleOAuth'
import LogoCropper from './LogoCropper'
import ThemeToggle from './ThemeToggle'
import {
  User, Mail, Lock, ShieldCheck, Save, CheckCircle2, Eye, EyeOff, KeyRound,
  Plug, Link2, Unlink, XCircle, Palette, Upload, Image as ImageIcon, RotateCcw, Trash2,
  Sparkles, Wand2, Loader2
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
  const [cropperFile, setCropperFile] = useState(null) // archivo seleccionado pendiente de recortar

  // IA: paleta sugerida desde el logo
  const [analyzingLogo, setAnalyzingLogo] = useState(false)
  const [aiPalette, setAiPalette] = useState(null)       // { primaryColor, secondaryColor, accentColor, ... }
  const [aiReasoning, setAiReasoning] = useState('')
  const [aiVibe, setAiVibe] = useState('')
  const [aiLogoQuality, setAiLogoQuality] = useState('')
  const [aiLogoFeedback, setAiLogoFeedback] = useState('')
  const [aiAccentReplaced, setAiAccentReplaced] = useState(false)
  const [aiAccentOptions, setAiAccentOptions] = useState([])
  const [aiError, setAiError] = useState('')

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

  // Restaurar colores predeterminados (mantiene el logo).
  // También aplica en vivo al DOM para que el usuario vea el cambio inmediato.
  const handleResetBranding = () => {
    const defaults = { ...DEFAULT_BRANDING, logoUrl: brandingDraft.logoUrl, displayName: brandingDraft.displayName }
    setBrandingDraft(defaults)
    updateBranding(defaults)
    // También limpiar sugerencia de IA si había
    setAiPalette(null); setAiReasoning(''); setAiVibe('')
    setAiLogoQuality(''); setAiLogoFeedback(''); setAiError('')
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
      setSuccess('Marca actualizada correctamente')
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
      setSuccess('Logo actualizado · analizando colores con IA…')
      // Dispara análisis IA automáticamente — el usuario verá la paleta sugerida en segundos
      handleAnalyzeLogo()
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

  // ── IA: analizar logo y proponer paleta ──
  const handleAnalyzeLogo = async () => {
    setAnalyzingLogo(true)
    setAiError(''); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/organizations/me/analyze-logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al analizar logo')
      setAiPalette(data.palette)
      setAiVibe(data.vibe || '')
      setAiReasoning(data.reasoning || '')
      setAiLogoQuality(data.logoQuality || 'good')
      setAiLogoFeedback(data.logoFeedback || '')
      setAiAccentReplaced(!!data.accentReplaced)
      setAiAccentOptions(Array.isArray(data.accentOptions) ? data.accentOptions : [])
    } catch (err) {
      setAiError(err.message)
    } finally {
      setAnalyzingLogo(false)
    }
  }

  const applyAiPalette = (scope) => {
    if (!aiPalette) return
    let next
    if (scope === 'principales') {
      // Solo primary + secondary + textOnPrimary
      next = {
        ...brandingDraft,
        primaryColor: aiPalette.primaryColor,
        secondaryColor: aiPalette.secondaryColor,
        textOnPrimary: aiPalette.textOnPrimary,
      }
    } else {
      // Todo
      next = { ...brandingDraft, ...aiPalette }
    }
    setBrandingDraft(next)
    // Aplica al DOM en vivo para que la previsualización se sienta inmediata
    updateBranding(next)
  }

  // Cambia solo el accent (desde los swatches de alternativas)
  const swapAccent = (newAccentHex) => {
    if (!aiPalette) return
    const nextPalette = { ...aiPalette, accentColor: newAccentHex }
    setAiPalette(nextPalette)
    // Si el usuario ya había aplicado la paleta, actualiza también el draft
    if (brandingDraft.accentColor === aiPalette.accentColor) {
      const nextDraft = { ...brandingDraft, accentColor: newAccentHex }
      setBrandingDraft(nextDraft)
      updateBranding(nextDraft)
    }
  }

  const dismissAiPalette = () => {
    setAiPalette(null); setAiReasoning(''); setAiVibe('')
    setAiLogoQuality(''); setAiLogoFeedback(''); setAiAccentReplaced(false); setAiAccentOptions([]); setAiError('')
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
    ...(isAdmin ? [{ id: 'design', label: 'Marca', icon: Palette }] : []),
  ]

  // Diseño tab es más amplio por el preview en vivo
  const wrapperCls = activeSection === 'design' ? 'max-w-6xl mx-auto space-y-5' : 'max-w-2xl mx-auto space-y-5'

  return (
    <div className={wrapperCls}>
      {/* Profile Header — adapta a modo claro/oscuro:
          - Light: fondo de color de marca (primary) — identidad visual fuerte
          - Dark: fondo neutro oscuro con avatar/badge en color de marca (sutil) */}
      <div
        className="p-6 rounded-xl bg-[var(--brand-primary)] dark:bg-slate-800 border dark:border-slate-700"
        style={{ color: 'var(--brand-text-on-primary)' }}
      >
        <div className="flex items-center space-x-4">
          {/* Avatar — usa primary en dark, transparencia en light */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold dark:text-white"
            style={{ background: 'color-mix(in srgb, var(--brand-text-on-primary) 15%, transparent)' }}
          >
            <span className="dark:hidden">{initials}</span>
            <span className="hidden dark:flex w-full h-full rounded-xl items-center justify-center"
              style={{ background: 'var(--brand-primary)', color: 'var(--brand-text-on-primary)' }}>
              {initials}
            </span>
          </div>
          <div className="dark:text-white">
            <h2 className="text-xl font-semibold">{user?.name}</h2>
            <p className="text-sm dark:text-slate-300" style={{ opacity: 0.7 }}>{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-md dark:text-white"
                style={{ background: 'color-mix(in srgb, var(--brand-text-on-primary) 15%, transparent)' }}
              >
                <span className="dark:hidden">{roleLabel[user?.role] || user?.role}</span>
                <span className="hidden dark:inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--brand-primary)' }} />
                  {roleLabel[user?.role] || user?.role}
                </span>
              </span>
              <span className="text-xs dark:text-slate-400" style={{ opacity: 0.5 }}>{user?.branding?.displayName || user?.orgName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveSection(tab.id); setError(''); setSuccess('') }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                activeSection === tab.id
                  ? 'border-[var(--brand-primary)] text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
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
        <>
        {/* Header del tab Marca — botón restaurar siempre visible y destacado */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-slate-500" /> Personalización de marca
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sube tu logo, ajusta colores y previsualiza cómo se verá tu plataforma.</p>
          </div>
          <button
            type="button"
            onClick={handleResetBranding}
            title="Vuelve a los colores predeterminados de la plataforma (Alce navy + sky)"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-lg transition-all shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reiniciar colores
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* ── Form column (3/5) ─────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Modo de tema (claro/oscuro/auto) */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Modo de la plataforma</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Elige cómo se verá tu plataforma — la preferencia se guarda en este dispositivo.</p>
                </div>
                <ThemeToggle variant="full" />
              </div>
            </div>

            {/* Logo */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-1">
                <ImageIcon className="w-4 h-4 text-slate-500" /> Logo de la organización
              </h3>
              <p className="text-xs text-slate-500 mb-4">PNG, JPG, WebP o SVG. Máx 2 MB. Al subir, abriremos un recortador para que ajustes el encuadre como foto de perfil.</p>
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
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        // SVG → subir directo (es vectorial, no se recorta).
                        // Resto → abrir el cropper.
                        if (f.type === 'image/svg+xml') {
                          handleLogoUpload(f)
                        } else {
                          setCropperFile(f)
                        }
                        e.target.value = ''
                      }}
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
                  {brandingDraft.logoUrl && !analyzingLogo && !aiPalette && (
                    <button
                      type="button"
                      onClick={handleAnalyzeLogo}
                      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all"
                      style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Analizar colores con IA
                    </button>
                  )}
                </div>
              </div>

              {/* ── Panel IA: análisis del logo ── */}
              {analyzingLogo && (
                <div className="mt-4 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Analizando tu logo con IA…</p>
                    <p className="text-xs text-slate-600">gpt-4o-mini está identificando colores y proponiendo una paleta para tu plataforma. Tarda 2-4 segundos.</p>
                  </div>
                </div>
              )}

              {aiError && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{aiError}</span>
                </div>
              )}

              {aiPalette && !analyzingLogo && (
                <div className="mt-4 bg-gradient-to-br from-violet-50 via-indigo-50 to-blue-50 border-2 border-violet-200 rounded-xl p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900">Paleta propuesta por IA</h4>
                      {aiVibe && (
                        <p className="text-[11px] font-medium text-violet-700 mt-0.5 uppercase tracking-wide">{aiVibe}</p>
                      )}
                      {aiReasoning && (
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{aiReasoning}</p>
                      )}
                      {aiLogoFeedback && (
                        <div className={`mt-2.5 rounded-md px-2.5 py-2 text-xs leading-relaxed flex items-start gap-1.5 ${
                          aiLogoQuality === 'good'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          <span className="mt-0.5 flex-shrink-0">
                            {aiLogoQuality === 'good' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                          </span>
                          <span><b>Sobre tu logo:</b> {aiLogoFeedback}
                            {aiLogoQuality !== 'good' && (
                              <button
                                type="button"
                                onClick={() => brandingDraft.logoUrl && document.querySelector('input[type=file]')?.click()}
                                className="ml-1 underline font-semibold hover:no-underline"
                              >
                                Re-subir y recortar
                              </button>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={dismissAiPalette}
                      className="text-slate-400 hover:text-slate-700"
                      title="Descartar sugerencia"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Accents alternativos — el usuario elige con un click */}
                  {aiAccentOptions.length > 0 && (
                    <div className="bg-white/60 dark:bg-slate-900/40 border border-violet-100 dark:border-slate-700 rounded-md px-2.5 py-2">
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Acentos profesionales sugeridos para tu marca
                        <span className="font-normal text-slate-500">(elige el que más te guste)</span>
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {aiAccentOptions.map((hex, idx) => {
                          const isActive = aiPalette.accentColor.toLowerCase() === hex.toLowerCase()
                          return (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => swapAccent(hex)}
                              title={`${hex} ${idx === 0 ? '(recomendado)' : ''}`}
                              className={`relative w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${
                                isActive ? 'border-slate-900 dark:border-white ring-2 ring-violet-300' : 'border-white dark:border-slate-700 shadow-sm'
                              }`}
                              style={{ background: hex }}
                            >
                              {idx === 0 && !isActive && (
                                <span className="absolute -top-1 -right-1 text-[8px] bg-violet-600 text-white px-1 rounded-full font-bold">★</span>
                              )}
                            </button>
                          )
                        })}
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                          Click para aplicar en vivo
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Swatches */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {[
                      ['primaryColor', 'Primario'],
                      ['secondaryColor', 'Secundario'],
                      ['accentColor', 'Acento'],
                      ['textOnPrimary', 'Texto'],
                      ['sidebarBg', 'Sidebar'],
                      ['navbarBg', 'Navbar'],
                      ['contentBg', 'Contenido'],
                    ].map(([key, label]) => (
                      <div key={key} className="flex flex-col items-center">
                        <div className="w-full aspect-square rounded-lg border-2 border-white shadow-sm" style={{ background: aiPalette[key] }} />
                        <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wide">{label}</p>
                        <p className="text-[9px] font-mono text-slate-700">{aiPalette[key]}</p>
                      </div>
                    ))}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => applyAiPalette('completo')}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-lg shadow-sm hover:opacity-90 transition-all"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                    >
                      <Wand2 className="w-3.5 h-3.5" /> Aplicar paleta completa
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAiPalette('principales')}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-violet-700 bg-white border border-violet-200 rounded-lg hover:bg-violet-50 transition-all"
                    >
                      Solo principales
                    </button>
                    <button
                      type="button"
                      onClick={handleAnalyzeLogo}
                      disabled={analyzingLogo}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" /> Re-analizar
                    </button>
                    <button
                      type="button"
                      onClick={handleResetBranding}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all"
                      title="Volver a los colores predeterminados de Alce"
                    >
                      Reiniciar a default
                    </button>
                    <p className="text-[10px] text-slate-500 self-center ml-auto">
                      Acuérdate de pulsar <b>Guardar marca</b> para persistir.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Display name */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
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
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
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

                <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Fondos</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2 italic">
                    Solo aplican en <b>modo claro</b>. En oscuro la plataforma usa tonos oscuros automáticos para garantizar contraste.
                  </p>
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
                {savingBranding ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <><Save className="w-4 h-4" /><span>Guardar marca</span></>}
              </button>
            </div>
          </div>

          {/* ── Live Preview column (2/5) ─────────────────────────────── */}
          <div className="lg:col-span-2">
            <BrandingPreview branding={brandingDraft} orgFallback={user?.orgName} />
          </div>
        </div>
        </>
      )}

      {/* ── Logo cropper modal ── */}
      {cropperFile && (
        <LogoCropper
          file={cropperFile}
          onCancel={() => setCropperFile(null)}
          onConfirm={(croppedFile) => {
            setCropperFile(null)
            handleLogoUpload(croppedFile)
          }}
        />
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
  const [tab, setTab] = useState('app') // app | propuesta
  const [previewMode, setPreviewMode] = useState('auto') // auto | light | dark

  // Determinar el modo efectivo: si auto, leer el modo real del documento
  const effectiveMode = previewMode === 'auto'
    ? (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    : previewMode
  const isDarkPreview = effectiveMode === 'dark'

  // En oscuro, sobrescribimos los fondos por neutros oscuros (los fondos
  // personalizados solo aplican en modo claro)
  const previewBranding = isDarkPreview
    ? {
        ...branding,
        sidebarBg: '#0a0f1e',
        navbarBg: '#0a0f1e',
        contentBg: '#050912',
      }
    : branding

  return (
    <div className="sticky top-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Vista previa</p>
        <div className="flex items-center gap-1.5">
          {/* Toggle modo de la PREVIEW (independiente del modo de la app) */}
          {tab === 'app' && (
            <div className="inline-flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 gap-0.5">
              <button type="button" onClick={() => setPreviewMode('light')}
                className={`px-2 py-1 text-[9px] font-semibold rounded-md transition-colors ${effectiveMode === 'light' && previewMode !== 'auto' ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'}`}>
                ☀
              </button>
              <button type="button" onClick={() => setPreviewMode('dark')}
                className={`px-2 py-1 text-[9px] font-semibold rounded-md transition-colors ${effectiveMode === 'dark' && previewMode !== 'auto' ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'}`}>
                ☾
              </button>
            </div>
          )}
          <div className="inline-flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setTab('app')}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                tab === 'app' ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              App
            </button>
            <button
              type="button"
              onClick={() => setTab('propuesta')}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                tab === 'propuesta' ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Propuesta
            </button>
          </div>
        </div>
      </div>

      {tab === 'propuesta' ? (
        <PropuestaPreviewMock branding={branding} orgName={name} />
      ) : (
      <div
        className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm flex"
        style={{ height: 360, background: previewBranding.contentBg }}
      >
        {/* ── Mock SIDEBAR ─────────────────────────────────── */}
        <div
          className={`w-32 flex flex-col ${isDarkPreview ? 'border-r border-slate-700/50' : 'border-r border-slate-200/50'}`}
          style={{ background: previewBranding.sidebarBg }}
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
            <span className={`text-[10px] font-bold truncate ${isDarkPreview ? 'text-white' : 'text-slate-900'}`}>{name}</span>
          </div>
          {/* Nav items */}
          <div className="px-2 space-y-0.5 mt-1">
            {/* Item activo */}
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-semibold"
              style={{ background: branding.primaryColor, color: branding.textOnPrimary }}
            >
              <Save className="w-2.5 h-2.5" /> Inicio
            </div>
            {/* Item inactivo */}
            <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] ${isDarkPreview ? 'text-slate-300' : 'text-slate-600'}`}>
              <UserIcon /> Clientes
              <span className="ml-auto text-[8px] font-bold px-1 py-0.5 rounded"
                style={{ background: `${branding.accentColor}1a`, color: branding.accentColor }}>3</span>
            </div>
            {/* Item con hover state simulado */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium ${isDarkPreview ? 'text-slate-200' : 'text-slate-700'}`}
              style={{ background: isDarkPreview ? `${branding.primaryColor}26` : `${branding.primaryColor}0d` }}
            >
              <UserIcon /> Equipo
            </div>
            {/* Sub-item con borde primary */}
            <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] border-l-2 ${isDarkPreview ? 'text-slate-300' : 'text-slate-600'}`}
              style={{ borderColor: branding.primaryColor, marginLeft: 8, paddingLeft: 8 }}>
              <UserIcon /> Propuestas
            </div>
            {/* Otros items */}
            <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] ${isDarkPreview ? 'text-slate-400' : 'text-slate-500'}`}>
              <UserIcon /> Gastos
            </div>
          </div>

          {/* Footer del sidebar (avatar + nombre) */}
          <div className={`mt-auto px-2 py-2 border-t flex items-center gap-1.5 ${isDarkPreview ? 'border-slate-700/50' : 'border-slate-200/50'}`}>
            <div className="w-5 h-5 rounded-full flex-shrink-0"
              style={{ background: branding.primaryColor }} />
            <div className="min-w-0 flex-1">
              <p className={`text-[9px] font-semibold truncate ${isDarkPreview ? 'text-slate-200' : 'text-slate-700'}`}>Tú</p>
              <p className={`text-[8px] truncate ${isDarkPreview ? 'text-slate-500' : 'text-slate-400'}`}>admin</p>
            </div>
          </div>
        </div>

        {/* ── Mock right area: navbar + content ─────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Navbar */}
          <div
            className={`h-10 flex items-center px-3 gap-2 border-b flex-shrink-0 ${isDarkPreview ? 'border-slate-700/50' : 'border-slate-200/50'}`}
            style={{ background: previewBranding.navbarBg }}
          >
            {/* Search bar mock */}
            <div className={`flex-1 max-w-[140px] h-5 rounded-md flex items-center px-1.5 gap-1 ${isDarkPreview ? 'bg-slate-700/50' : 'bg-slate-100/80'}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-2.5 h-2.5 ${isDarkPreview ? 'text-slate-500' : 'text-slate-400'}`}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3"/>
              </svg>
              <span className={`text-[8px] ${isDarkPreview ? 'text-slate-500' : 'text-slate-400'}`}>Buscar…</span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              {/* Bell con badge accent */}
              <div className="relative w-4 h-4 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-slate-400">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                </svg>
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: branding.accentColor }} />
              </div>
              {/* Avatar */}
              <div className="w-4 h-4 rounded-full" style={{ background: branding.primaryColor }} />
            </div>
          </div>

          {/* Content — Dashboard mock realista */}
          <div className="flex-1 p-2.5 overflow-hidden space-y-2" style={{ background: previewBranding.contentBg }}>
            {/* Título */}
            <div className="flex items-center justify-between">
              <p className={`text-[10px] font-bold ${isDarkPreview ? 'text-white' : 'text-slate-800'}`}>Propuestas</p>
              <button type="button"
                className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: branding.primaryColor, color: branding.textOnPrimary }}>
                + Nueva
              </button>
            </div>

            {/* KPIs row */}
            <div className="grid grid-cols-3 gap-1.5">
              <div className={`rounded-md p-1.5 border ${isDarkPreview ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <p className={`text-[7px] uppercase ${isDarkPreview ? 'text-slate-500' : 'text-slate-400'}`}>Total</p>
                <p className={`text-[11px] font-bold leading-none mt-0.5 ${isDarkPreview ? 'text-white' : 'text-slate-800'}`}>24</p>
              </div>
              <div className={`rounded-md p-1.5 border ${isDarkPreview ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <p className={`text-[7px] uppercase ${isDarkPreview ? 'text-slate-500' : 'text-slate-400'}`}>Activas</p>
                <p className="text-[11px] font-bold leading-none mt-0.5" style={{ color: branding.primaryColor }}>8</p>
              </div>
              <div className={`rounded-md p-1.5 border-2 ${isDarkPreview ? 'bg-slate-800' : 'bg-white'}`}
                style={{ borderColor: `${branding.accentColor}66` }}>
                <p className="text-[7px] uppercase font-semibold" style={{ color: branding.accentColor }}>Firmadas</p>
                <p className="text-[11px] font-bold leading-none mt-0.5" style={{ color: branding.accentColor }}>5</p>
              </div>
            </div>

            {/* Lista mock con items */}
            <div className={`rounded-md border overflow-hidden ${isDarkPreview ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className={`px-2 py-1 border-b flex items-center justify-between ${isDarkPreview ? 'border-slate-700' : 'border-slate-100'}`}>
                <span className={`text-[8px] font-semibold ${isDarkPreview ? 'text-slate-300' : 'text-slate-600'}`}>Recientes</span>
                <span className={`text-[7px] ${isDarkPreview ? 'text-slate-500' : 'text-slate-400'}`}>Hoy</span>
              </div>
              <div className={`divide-y ${isDarkPreview ? 'divide-slate-700' : 'divide-slate-50'}`}>
                {/* Item 1 con badge primary */}
                <div className="px-2 py-1 flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded flex-shrink-0" style={{ background: `${branding.primaryColor}33` }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[8px] font-semibold truncate ${isDarkPreview ? 'text-slate-200' : 'text-slate-700'}`}>Cliente Demo S.A.</p>
                  </div>
                  <span className="text-[7px] font-bold px-1 py-0.5 rounded"
                    style={{ background: branding.primaryColor, color: branding.textOnPrimary }}>
                    Activa
                  </span>
                </div>
                {/* Item 2 con badge accent */}
                <div className="px-2 py-1 flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded flex-shrink-0" style={{ background: `${branding.accentColor}33` }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[8px] font-semibold truncate ${isDarkPreview ? 'text-slate-200' : 'text-slate-700'}`}>Acme Industries</p>
                  </div>
                  <span className="text-[7px] font-bold px-1 py-0.5 rounded"
                    style={{ background: `${branding.accentColor}1f`, color: branding.accentColor }}>
                    Firmada
                  </span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-1.5 pt-1">
              <button type="button"
                className="text-[8px] font-bold px-2 py-1 rounded-md"
                style={{ background: branding.primaryColor, color: branding.textOnPrimary }}>
                Primario
              </button>
              <button type="button"
                className="text-[8px] font-semibold px-2 py-1 rounded-md border-2"
                style={{ borderColor: branding.accentColor, color: branding.accentColor }}>
                Acento
              </button>
              <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full ml-auto"
                style={{ background: `${branding.accentColor}1a`, color: branding.accentColor }}>
                ★ Premium
              </span>
            </div>
          </div>
        </div>
      </div>
      )}

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Los cambios se previsualizan aquí en tiempo real. Al pulsar <b>Guardar marca</b> se aplican a toda la plataforma de tu organización.
      </p>
    </div>
  )
}

// Vista previa de cómo se ve una propuesta con los colores aplicados
function PropuestaPreviewMock({ branding, orgName }) {
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white" style={{ minHeight: 360 }}>
      {/* Membrete */}
      <div className="px-5 py-4 border-b-4" style={{ borderColor: branding.primaryColor }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: branding.primaryColor }}
            >
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="logo" className="w-full h-full object-contain" />
              ) : (
                <ShieldCheck className="w-5 h-5" style={{ color: branding.textOnPrimary }} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-widest text-slate-400 truncate">{orgName}</p>
              <p className="text-sm font-bold leading-tight truncate" style={{ color: branding.primaryColor }}>
                Propuesta de servicio
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest">Folio</p>
            <p className="text-xs font-mono font-bold" style={{ color: branding.primaryColor }}>AL-2026-001</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3 text-xs text-slate-700">
        <p>Estimado(a) <strong>Cliente Demo</strong>:</p>
        <p className="text-[11px] leading-relaxed text-slate-600">
          Esta es una vista previa de cómo se verá tu propuesta con la marca aplicada.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: branding.primaryColor }}>Cliente</p>
            <p className="text-[10px] font-medium text-slate-700">Cliente Demo</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: branding.primaryColor }}>Asesor</p>
            <p className="text-[10px] font-medium text-slate-700">Tú</p>
          </div>
        </div>

        {/* Tabla mock */}
        <div className="rounded-lg overflow-hidden border-2" style={{ borderColor: branding.primaryColor }}>
          <div className="px-3 py-1.5 text-white text-[9px] font-semibold uppercase tracking-widest"
            style={{ background: branding.primaryColor, color: branding.textOnPrimary }}>
            Honorarios y costos
          </div>
          <table className="w-full text-[10px]">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-3 py-1.5 text-slate-700">Servicio principal</td>
                <td className="px-3 py-1.5 text-right font-semibold text-slate-800">$25,000.00</td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 text-slate-700">Acompañamiento</td>
                <td className="px-3 py-1.5 text-right font-semibold text-slate-800">$5,000.00</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2" style={{ borderColor: branding.primaryColor }}>
                <td className="px-3 py-1.5 text-right text-[9px] font-semibold uppercase" style={{ color: branding.primaryColor }}>Total</td>
                <td className="px-3 py-1.5 text-right font-bold text-xs" style={{ color: branding.primaryColor }}>$30,000.00</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* CTA */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className="flex-1 text-[10px] font-bold px-2 py-1.5 rounded-md"
            style={{ background: branding.primaryColor, color: branding.textOnPrimary }}
          >
            Aceptar propuesta
          </button>
          <button
            type="button"
            className="text-[10px] font-medium px-2 py-1.5 rounded-md border border-slate-200 text-slate-600"
          >
            No, gracias
          </button>
        </div>
      </div>
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
