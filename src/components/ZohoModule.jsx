/**
 * Módulo Zoho — conecta Zoho CRM y trae el catálogo de registros (leads,
 * contactos, cuentas, deals) por organización. Credenciales encriptadas (BYOK).
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Database, Loader2, Plug, CheckCircle2, AlertTriangle, RefreshCw, Trash2,
  Lock, Link2, Users, Building2, Briefcase, UserPlus, Mail, Phone, X,
} from 'lucide-react'

const NAVY = 'var(--brand-primary, #101C44)'
const MODULOS = [
  { id: 'Leads', label: 'Leads', icon: UserPlus },
  { id: 'Contacts', label: 'Contactos', icon: Users },
  { id: 'Accounts', label: 'Cuentas', icon: Building2 },
  { id: 'Deals', label: 'Negocios', icon: Briefcase },
]

export default function ZohoModule() {
  const { token, user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const authHeaders = { Authorization: `Bearer ${token}` }

  const [config, setConfig] = useState(null)
  const [loadingCfg, setLoadingCfg] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ apiDomain: 'https://www.zohoapis.com', accountsDomain: 'https://accounts.zoho.com', clientId: '', clientSecret: '', code: '', refreshToken: '', accessToken: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const [modulo, setModulo] = useState('Leads')
  const [catalogo, setCatalogo] = useState(null)
  const [loadingCat, setLoadingCat] = useState(false)

  const fetchConfig = useCallback(async () => {
    setLoadingCfg(true)
    try {
      const res = await fetch('/api/zoho/config', { headers: authHeaders })
      if (res.ok) setConfig(await res.json())
    } catch { /* silencio */ }
    setLoadingCfg(false)
  }, [token])

  const fetchCatalogo = useCallback(async (mod) => {
    setLoadingCat(true); setCatalogo(null)
    try {
      const res = await fetch(`/api/zoho/catalogo?modulo=${mod}`, { headers: authHeaders })
      const data = await res.json()
      setCatalogo(data)
    } catch (e) { setCatalogo({ conectado: true, error: e.message, registros: [] }) }
    setLoadingCat(false)
  }, [token])

  useEffect(() => { if (isAdmin) fetchConfig() }, [isAdmin, fetchConfig])
  useEffect(() => { if (config?.conectado) fetchCatalogo(modulo) }, [config?.conectado, modulo, fetchCatalogo])

  const guardar = async () => {
    if (!form.apiDomain.trim()) { setErr('Falta el dominio de la API'); return }
    if (!form.code.trim() && !form.refreshToken.trim() && !form.accessToken.trim()) { setErr('Pega el código del Self Client (recomendado), o un Refresh/Access Token'); return }
    if (form.code.trim() && (!form.clientId.trim() || !form.clientSecret.trim())) { setErr('Para usar el código necesitas también Client ID y Client Secret'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/zoho/config', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar')
      setConfig(data); setShowForm(false)
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  const desconectar = async () => {
    if (!confirm('¿Desconectar Zoho? Se borran las credenciales guardadas.')) return
    await fetch('/api/zoho/config', { method: 'DELETE', headers: authHeaders })
    setConfig({ conectado: false }); setCatalogo(null)
  }

  if (!isAdmin) {
    return <div className="max-w-2xl mx-auto p-8 text-center text-slate-500">Solo administradores pueden gestionar la conexión con Zoho.</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: NAVY }}><Database className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Zoho CRM</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Trae tu catálogo de registros desde Zoho</p>
          </div>
        </div>
        {config?.conectado && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" /> Conectado</span>
            <button onClick={() => { setShowForm(true); setErr('') }} className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 px-2 py-1">Reconfigurar</button>
            <button onClick={desconectar} className="flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg"><Trash2 className="w-3.5 h-3.5" /> Desconectar</button>
          </div>
        )}
      </div>

      {loadingCfg && <div className="flex justify-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>}

      {/* No conectado / form */}
      {!loadingCfg && (!config?.conectado || showForm) && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4 max-w-2xl">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Plug className="w-4 h-4" /> Conectar Zoho CRM</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pega las credenciales OAuth de tu Zoho (de un Self Client). Se guardan <strong>encriptadas</strong>.</p>
          </div>
          {[
            { k: 'apiDomain', label: 'Dominio de la API', ph: 'https://www.zohoapis.com', help: 'Tu data center (.com, .com.mx, .eu…)' },
            { k: 'accountsDomain', label: 'Dominio de cuentas', ph: 'https://accounts.zoho.com' },
            { k: 'clientId', label: 'Client ID' },
            { k: 'clientSecret', label: 'Client Secret', secret: true },
            { k: 'code', label: 'Código del Self Client ⭐', help: 'Lo más fácil: pega aquí el código que genera Zoho (Generate Code). Nosotros lo cambiamos por un Refresh Token automáticamente. Caduca en minutos, así que pégalo rápido.' },
            { k: 'refreshToken', label: 'Refresh Token (avanzado)', secret: true, help: 'Solo si ya tienes uno. Si pegaste el código, déjalo vacío.' },
            { k: 'accessToken', label: 'Access Token (avanzado)', secret: true, help: 'Alternativa rápida que caduca en 1 hora.' },
          ].map((f) => (
            <div key={f.k}>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{f.label}</label>
              <input type={f.secret ? 'password' : 'text'} value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                placeholder={f.ph || ''} autoComplete="off"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20" />
              {f.help && <p className="text-[11px] text-slate-400 mt-1">{f.help}</p>}
            </div>
          ))}
          {err && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {err}</div>}
          <div className="flex items-center justify-end gap-2">
            {showForm && config?.conectado && <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>}
            <button onClick={guardar} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50" style={{ background: NAVY }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Conectando…</> : <><Link2 className="w-4 h-4" /> Conectar</>}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><Lock className="w-3 h-3" /> Sincronización de solo lectura (Zoho → plataforma). Tus credenciales nunca se muestran completas.</p>
        </div>
      )}

      {/* Catálogo */}
      {!loadingCfg && config?.conectado && !showForm && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            {MODULOS.map((m) => {
              const Icon = m.icon
              return (
                <button key={m.id} onClick={() => setModulo(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${modulo === m.id ? 'text-white border-transparent' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                  style={modulo === m.id ? { background: NAVY } : {}}>
                  <Icon className="w-4 h-4" /> {m.label}
                </button>
              )
            })}
            <button onClick={() => fetchCatalogo(modulo)} className="p-2 text-slate-400 hover:text-slate-700 ml-auto"><RefreshCw className={`w-4 h-4 ${loadingCat ? 'animate-spin' : ''}`} /></button>
          </div>

          {loadingCat ? (
            <div className="flex justify-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : catalogo?.error ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div><p className="font-semibold">No se pudo traer el catálogo</p><p className="mt-0.5">{catalogo.error}</p><p className="mt-1 text-amber-700/80 text-xs">Revisa las credenciales en "Reconfigurar".</p></div>
            </div>
          ) : (catalogo?.registros || []).length === 0 ? (
            <div className="text-center py-16 text-slate-400"><Database className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">Sin registros en {modulo}.</p></div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{catalogo.registros.length} registro(s){catalogo.total ? ` de ${catalogo.total}` : ''}</span>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {catalogo.registros.map((r) => (
                  <div key={r.id} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-300 shrink-0">{(r.nombre || '?')[0]?.toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{r.nombre}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
                        {r.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{r.email}</span>}
                        {r.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.telefono}</span>}
                        {r.empresa && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{r.empresa}</span>}
                      </div>
                    </div>
                    {r.estado && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.estado}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
