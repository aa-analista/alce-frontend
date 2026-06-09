/**
 * Módulo "Soporte" — Mesa de tickets de plataforma (cliente → Alce Alce).
 *
 * - Cualquier usuario: crea tickets y ve el estado de los suyos ("Mis tickets").
 * - Staff de Alce Alce (super_admin): ve TODA la bandeja, con KPIs, filtros,
 *   asignación, cambio de estado, respuestas y notas internas.
 *
 * Modelo inspirado en AuraDesk, reconstruido en el stack del Accountability Partner.
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  LifeBuoy, Plus, Loader2, Send, X, Inbox, Search, AlertTriangle,
  CheckCircle2, Clock, MessageSquare, Lock, UserCheck, RefreshCw, Tag, Building2,
} from 'lucide-react'

const NAVY = 'var(--brand-primary, #101C44)'

const PRIORIDADES = [
  { id: 'baja', label: 'Baja' },
  { id: 'media', label: 'Media' },
  { id: 'alta', label: 'Alta' },
  { id: 'urgente', label: 'Urgente' },
]
const ESTADOS = [
  { id: 'nuevo', label: 'Nuevo' },
  { id: 'en_proceso', label: 'En proceso' },
  { id: 'esperando', label: 'Esperando' },
  { id: 'resuelto', label: 'Resuelto' },
  { id: 'cerrado', label: 'Cerrado' },
]
const CATEGORIAS = [
  { id: 'soporte', label: 'Soporte técnico' },
  { id: 'error', label: 'Error / Bug' },
  { id: 'solicitud', label: 'Solicitud / Mejora' },
  { id: 'facturacion', label: 'Facturación' },
  { id: 'otro', label: 'Otro' },
]

const PRIORIDAD_CSS = {
  urgente: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  alta:    'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  media:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  baja:    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
}
const ESTADO_CSS = {
  nuevo:      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  en_proceso: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  esperando:  'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
  resuelto:   'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  cerrado:    'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300',
}
const labelOf = (arr, id) => arr.find((x) => x.id === id)?.label || id

const fmtFecha = (d) => {
  if (!d) return ''
  try { return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return d }
}

export default function SoporteModule() {
  const { token, user } = useAuth()
  const isStaff = user?.role === 'super_admin'

  const [vista, setVista] = useState('lista') // lista | nuevo
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // filtros (staff)
  const [fEstado, setFEstado] = useState('')
  const [fPrioridad, setFPrioridad] = useState('')
  const [q, setQ] = useState('')

  // detalle
  const [selected, setSelected] = useState(null)

  // nuevo ticket
  const [form, setForm] = useState({ asunto: '', descripcion: '', categoria: 'soporte', prioridad: 'media' })
  const [saving, setSaving] = useState(false)

  const authHeaders = { Authorization: `Bearer ${token}` }

  const fetchTickets = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (fEstado) params.set('estado', fEstado)
      if (fPrioridad) params.set('prioridad', fPrioridad)
      if (q.trim()) params.set('q', q.trim())
      const res = await fetch(`/api/soporte?${params.toString()}`, { headers: authHeaders })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar tickets')
      setTickets(data.tickets || [])
    } catch (e) { setError(e.message) }
    setLoading(false)
  }, [token, fEstado, fPrioridad, q])

  const fetchStats = useCallback(async () => {
    if (!isStaff) return
    try {
      const res = await fetch('/api/soporte/stats', { headers: authHeaders })
      if (res.ok) setStats(await res.json())
    } catch { /* silencio */ }
  }, [token, isStaff])

  useEffect(() => { if (vista === 'lista') { fetchTickets(); fetchStats() } }, [vista, fetchTickets, fetchStats])

  const crearTicket = async (e) => {
    e.preventDefault()
    if (!form.asunto.trim() || form.descripcion.trim().length < 5) {
      setError('Pon un asunto y describe tu solicitud (mín. 5 caracteres).'); return
    }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/soporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el ticket')
      setForm({ asunto: '', descripcion: '', categoria: 'soporte', prioridad: 'media' })
      setVista('lista')
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const abrirTicket = async (id) => {
    setSelected({ loading: true })
    try {
      const res = await fetch(`/api/soporte/${id}`, { headers: authHeaders })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo abrir')
      setSelected(data)
    } catch (e) { setError(e.message); setSelected(null) }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: NAVY }}>
            <LifeBuoy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Soporte</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isStaff ? 'Bandeja de tickets · todos los clientes' : 'Envíanos un ticket y dale seguimiento'}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setVista('nuevo'); setError('') }}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg font-semibold text-sm shadow-sm hover:opacity-90 transition-all active:scale-[0.98]"
          style={{ background: NAVY }}
        >
          <Plus className="w-4 h-4" /> Nuevo ticket
        </button>
      </div>

      {/* KPIs (staff) */}
      {isStaff && stats && vista === 'lista' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { k: 'total', label: 'Total', val: stats.total, icon: Inbox, css: 'text-slate-700 dark:text-slate-200' },
            { k: 'nuevos', label: 'Nuevos', val: stats.nuevos, icon: AlertTriangle, css: 'text-blue-600' },
            { k: 'en_proceso', label: 'En proceso', val: stats.en_proceso, icon: Clock, css: 'text-amber-600' },
            { k: 'resueltos', label: 'Resueltos', val: stats.resueltos, icon: CheckCircle2, css: 'text-emerald-600' },
            { k: 'urgentes_abiertos', label: 'Urgentes', val: stats.urgentes_abiertos, icon: AlertTriangle, css: 'text-red-600' },
          ].map(({ k, label, val, icon: Icon, css }) => (
            <div key={k} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${css}`} />
              <p className={`text-2xl font-bold ${css}`}>{val ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Vista: NUEVO TICKET ── */}
      {vista === 'nuevo' && (
        <form onSubmit={crearTicket} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4 max-w-2xl">
          <h3 className="font-semibold text-slate-900 dark:text-white">Nuevo ticket de soporte</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Asunto</label>
            <input
              value={form.asunto} onChange={(e) => setForm({ ...form, asunto: e.target.value })}
              maxLength={200} placeholder="Resume tu solicitud en una línea"
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Categoría</label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none">
                {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Prioridad</label>
              <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none">
                {PRIORIDADES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Descripción</label>
            <textarea
              value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={6} placeholder="Cuéntanos con detalle qué necesitas o qué problema tienes…"
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 resize-y"
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => { setVista('lista'); setError('') }}
              className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg font-semibold text-sm shadow-sm hover:opacity-90 disabled:opacity-50" style={{ background: NAVY }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : <><Send className="w-4 h-4" /> Enviar ticket</>}
            </button>
          </div>
        </form>
      )}

      {/* ── Vista: LISTA / BANDEJA ── */}
      {vista === 'lista' && (
        <>
          {/* Filtros (staff) */}
          {isStaff && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar asunto o descripción…"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none" />
              </div>
              <select value={fEstado} onChange={(e) => setFEstado(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white">
                <option value="">Todos los estados</option>
                {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
              <select value={fPrioridad} onChange={(e) => setFPrioridad(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white">
                <option value="">Toda prioridad</option>
                {PRIORIDADES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <button onClick={fetchTickets} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><RefreshCw className="w-4 h-4" /></button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{isStaff ? 'No hay tickets todavía.' : 'No has enviado tickets aún.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <button key={t.id} onClick={() => abrirTicket(t.id)}
                  className="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-[var(--brand-primary)]/40 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[11px] font-mono text-slate-400">{t.folio}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ESTADO_CSS[t.estado]}`}>{labelOf(ESTADOS, t.estado)}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORIDAD_CSS[t.prioridad]}`}>{labelOf(PRIORIDADES, t.prioridad)}</span>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{t.asunto}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        {isStaff && t.solicitante_nombre && <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />{t.solicitante_nombre}</span>}
                        {isStaff && t.org_nombre && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{t.org_nombre}</span>}
                        <span>{fmtFecha(t.created_at)}</span>
                        {t.comentarios > 0 && <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{t.comentarios}</span>}
                      </div>
                    </div>
                    {isStaff && t.asignado_nombre && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md whitespace-nowrap">{t.asignado_nombre}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Modal de detalle ── */}
      {selected && (
        <TicketDetail
          data={selected}
          isStaff={isStaff}
          token={token}
          currentUser={user}
          onClose={() => setSelected(null)}
          onChanged={() => { abrirTicket(selected.id); fetchTickets(); fetchStats() }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Modal de detalle del ticket (con comentarios y acciones de staff)
// ─────────────────────────────────────────────────────────────
function TicketDetail({ data, isStaff, token, currentUser, onClose, onChanged }) {
  const [comentario, setComentario] = useState('')
  const [interno, setInterno] = useState(false)
  const [sending, setSending] = useState(false)
  const [busy, setBusy] = useState(false)
  const authHeaders = { Authorization: `Bearer ${token}` }

  if (data.loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <Loader2 className="w-7 h-7 animate-spin text-white" />
      </div>
    )
  }

  const patch = async (body) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/soporte/${data.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify(body),
      })
      if (res.ok) onChanged()
    } finally { setBusy(false) }
  }

  const enviarComentario = async (e) => {
    e.preventDefault()
    if (!comentario.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/soporte/${data.id}/comentarios`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ cuerpo: comentario, es_interno: interno }),
      })
      if (res.ok) { setComentario(''); setInterno(false); onChanged() }
    } finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono text-slate-400">{data.folio}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ESTADO_CSS[data.estado]}`}>{labelOf(ESTADOS, data.estado)}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORIDAD_CSS[data.prioridad]}`}>{labelOf(PRIORIDADES, data.prioridad)}</span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1"><Tag className="w-3 h-3" />{labelOf(CATEGORIAS, data.categoria)}</span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white">{data.asunto}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {data.solicitante_nombre}{data.org_nombre ? ` · ${data.org_nombre}` : ''} · {fmtFecha(data.created_at)}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"><X className="w-5 h-5" /></button>
        </div>

        {/* Acciones de staff */}
        {isStaff && (
          <div className="flex items-center gap-2 flex-wrap px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
            <select value={data.estado} disabled={busy} onChange={(e) => patch({ estado: e.target.value })}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white">
              {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
            <select value={data.prioridad} disabled={busy} onChange={(e) => patch({ prioridad: e.target.value })}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white">
              {PRIORIDADES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <button onClick={() => patch({ asignado_a: currentUser.id })} disabled={busy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white hover:border-[var(--brand-primary)]/40">
              <UserCheck className="w-3.5 h-3.5" /> {data.asignado_nombre ? `Asignado: ${data.asignado_nombre}` : 'Asignarme'}
            </button>
          </div>
        )}

        {/* Cuerpo + comentarios */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
            {data.descripcion}
          </div>

          {(data.comentarios || []).map((c) => (
            <div key={c.id} className={`rounded-lg p-3 text-sm ${
              c.es_interno
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                : c.autor_role === 'super_admin'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900'
                  : 'bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{c.autor_nombre || 'Usuario'}</span>
                {c.autor_role === 'super_admin' && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">Alce Alce</span>}
                {c.es_interno && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" />Nota interna</span>}
                <span className="text-[10px] text-slate-400 ml-auto">{fmtFecha(c.created_at)}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{c.cuerpo}</p>
            </div>
          ))}
        </div>

        {/* Responder */}
        <form onSubmit={enviarComentario} className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
          {isStaff && (
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
              <input type="checkbox" checked={interno} onChange={(e) => setInterno(e.target.checked)} />
              <Lock className="w-3 h-3" /> Nota interna (solo la ve el equipo Alce Alce)
            </label>
          )}
          <div className="flex items-end gap-2">
            <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2}
              placeholder={interno ? 'Escribe una nota interna…' : 'Escribe una respuesta…'}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 resize-none" />
            <button type="submit" disabled={sending || !comentario.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 text-white rounded-lg font-semibold text-sm shadow-sm hover:opacity-90 disabled:opacity-50" style={{ background: NAVY }}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
