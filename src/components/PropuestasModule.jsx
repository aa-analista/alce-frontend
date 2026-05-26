import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ClipboardList, Plus, RefreshCw, FileText, Eye, Send, CheckCircle2, FileX,
  Loader2, Search, X, ChevronLeft, ChevronRight, Settings, Layers, XCircle, Clock,
  Edit3, Copy, Trash2, Calendar, User, Palette, Download, Upload, Sparkles, Star,
  CheckCheck, FileStack
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAVY = 'var(--brand-primary, #101C44)'
const SKY  = 'var(--brand-secondary, #6DBBE8)'

const ESTADO_CSS = {
  borrador:  'bg-slate-100 text-slate-700',
  enviada:   'bg-blue-50 text-blue-700',
  vista:     'bg-amber-50 text-amber-700',
  firmada:   'bg-emerald-50 text-emerald-700',
  vencida:   'bg-red-50 text-red-700',
  rechazada: 'bg-red-50 text-red-700',
}
const ESTADO_LABEL = {
  borrador: 'Borrador', enviada: 'Enviada', vista: 'Vista',
  firmada: 'Firmada', vencida: 'Vencida', rechazada: 'Rechazada',
}
const ESTADO_ICON = {
  borrador: FileText, enviada: Send, vista: Eye,
  firmada: CheckCircle2, vencida: FileX, rechazada: XCircle,
}

const fmt = (d) => d ? new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
const fmtMoney = (a, m='MXN') => a == null || a === 0 ? '—' : new Intl.NumberFormat('es-MX', { style:'currency', currency: m }).format(a)
const fmtCompact = (a) => a == null || a === 0 ? '—' : new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 }).format(a)

// Period helpers
const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todo' },
  { value: 'month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: '3months', label: 'Últimos 3 meses' },
  { value: 'year', label: 'Este año' },
]
function filterByPeriod(list, period) {
  if (period === 'all') return list
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  let from
  if (period === 'month') from = new Date(y, m, 1)
  else if (period === 'last_month') from = new Date(y, m - 1, 1)
  else if (period === '3months') from = new Date(y, m - 3, 1)
  else if (period === 'year') from = new Date(y, 0, 1)
  const to = period === 'last_month' ? new Date(y, m, 1) : new Date()
  return list.filter(p => {
    const d = new Date(p.created_at)
    return d >= from && d <= to
  })
}

// API helpers
const api = {
  list:   (token) => fetch('/api/propuestas',           { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  one:    (token, id) => fetch(`/api/propuestas/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  create: (token, body) => fetch('/api/propuestas', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d }),
  update: (token, id, body) => fetch(`/api/propuestas/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d }),
  patch: (token, id, body) => fetch(`/api/propuestas/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d }),
  remove: (token, id) => fetch(`/api/propuestas/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  }).then(async r => { if (!r.ok) throw new Error('Error al borrar') }),
  markSent: (token, id) => fetch(`/api/propuestas/${id}/marcar-enviada`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d }),
  servicios: (token) => fetch('/api/propuestas/servicios', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  createServicio: (token, body) => fetch('/api/propuestas/servicios', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d }),
  patchServicio: (token, id, body) => fetch(`/api/propuestas/servicios/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d }),
  deleteServicio: (token, id) => fetch(`/api/propuestas/servicios/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d }),
  // ── Paletas (presets) ──
  paletas: (token) => fetch('/api/propuestas/paletas', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  createPaleta: (token, body) => fetch('/api/propuestas/paletas', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d }),
  deletePaleta: (token, id) => fetch(`/api/propuestas/paletas/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d }),
  updatePaleta: (token, id, body) => fetch(`/api/propuestas/paletas/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d }),
  applyPaletaAsBrand: (token, id) => fetch(`/api/propuestas/paletas/${id}/apply-as-brand`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d }),
  // ── Plantillas de propuesta ──
  plantillas: (token) => fetch('/api/propuestas/plantillas', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  createPlantilla: (token, body) => fetch('/api/propuestas/plantillas', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d }),
  deletePlantilla: (token, id) => fetch(`/api/propuestas/plantillas/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d }),
}

// ─────────────────────────────────────────────────────────────
//  COMPONENTE PRINCIPAL — Dashboard del módulo
// ─────────────────────────────────────────────────────────────

export default function PropuestasModule() {
  const { token, user } = useAuth()
  const [view, setView] = useState('dashboard') // dashboard|nueva|edit|preview|servicios|paletas
  const [selectedId, setSelectedId] = useState(null)
  const [propuestas, setPropuestas] = useState([])
  const [servicios, setServicios] = useState([])
  const [paletas, setPaletas] = useState([])
  const [plantillas, setPlantillas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterEstado, setFilterEstado] = useState('todas')
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [props, servs, pals, plants] = await Promise.all([
        api.list(token).catch(() => []),
        api.servicios(token).catch(() => ({ servicios: [] })),
        api.paletas(token).catch(() => ({ paletas: [] })),
        api.plantillas(token).catch(() => ({ plantillas: [] })),
      ])
      setPropuestas(Array.isArray(props) ? props : [])
      setServicios(servs.servicios || [])
      setPaletas(pals.paletas || [])
      setPlantillas(plants.plantillas || [])
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const periodList = filterByPeriod(propuestas, filterPeriod)
    const total = periodList.length
    const borradores = periodList.filter(p => p.estado === 'borrador').length
    const activas   = periodList.filter(p => ['enviada', 'vista'].includes(p.estado)).length
    const firmadas  = periodList.filter(p => p.estado === 'firmada').length
    const rechazadas = periodList.filter(p => p.estado === 'rechazada').length
    const cerradoMxn = periodList.filter(p => p.estado === 'firmada').reduce((s, p) => s + (parseFloat(p.total_mxn) || 0), 0)
    const cerradoUsd = periodList.filter(p => p.estado === 'firmada').reduce((s, p) => s + (parseFloat(p.total_usd) || 0), 0)
    const considered = activas + firmadas + rechazadas
    const conversion = considered > 0 ? Math.round((firmadas / considered) * 100) : 0
    return { total, borradores, activas, firmadas, rechazadas, cerradoMxn, cerradoUsd, conversion }
  }, [propuestas, filterPeriod])

  const filtradas = useMemo(() => {
    let list = filterByPeriod(propuestas, filterPeriod)
    if (filterEstado === 'borrador')   list = list.filter(p => p.estado === 'borrador')
    if (filterEstado === 'activas')    list = list.filter(p => ['enviada', 'vista'].includes(p.estado))
    if (filterEstado === 'firmadas')   list = list.filter(p => p.estado === 'firmada')
    if (filterEstado === 'rechazadas') list = list.filter(p => p.estado === 'rechazada')
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p =>
        (p.folio || '').toLowerCase().includes(q) ||
        (p.cliente_nombre || '').toLowerCase().includes(q) ||
        (p.cliente_correo || '').toLowerCase().includes(q) ||
        (p.servicio_nombre || '').toLowerCase().includes(q) ||
        (p.vendedor_user_name || p.vendedor_nombre || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [propuestas, filterEstado, filterPeriod, search])

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const filtradasPag = filtradas.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)
  useEffect(() => { setPage(1) }, [filterEstado, filterPeriod, search])

  // ─── Sub-vistas ───
  if (view === 'nueva') {
    return <PropuestaForm servicios={servicios} paletas={paletas} plantillas={plantillas}
      onClose={() => { setView('dashboard'); load() }} />
  }
  if (view === 'edit' && selectedId) {
    return <PropuestaForm servicios={servicios} paletas={paletas} plantillas={plantillas} editId={selectedId}
      onClose={() => { setView('dashboard'); setSelectedId(null); load() }} />
  }
  if (view === 'preview' && selectedId) {
    return <PreviewPropuesta id={selectedId}
      onEdit={() => setView('edit')}
      onClose={() => { setView('dashboard'); setSelectedId(null); load() }} />
  }
  if (view === 'servicios') {
    return <ServiciosCatalog isAdmin={isAdmin} onClose={() => { setView('dashboard'); load() }} />
  }
  if (view === 'paletas') {
    return <PaletasGestor isAdmin={isAdmin} onClose={() => { setView('dashboard'); load() }} />
  }
  if (view === 'plantillas') {
    return <PlantillasGestor isAdmin={isAdmin} onClose={() => { setView('dashboard'); load() }} />
  }

  // ─── Dashboard ───
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white"
              style={{ background: NAVY }}>
              <ClipboardList className="w-5 h-5" />
            </span>
            Propuestas
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Crea y da seguimiento a propuestas comerciales personalizables.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setView('plantillas')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            <FileStack className="w-3.5 h-3.5" /> Plantillas ({plantillas.length})
          </button>
          <button onClick={() => setView('paletas')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            <Palette className="w-3.5 h-3.5" /> Paletas ({paletas.length})
          </button>
          <button onClick={() => setView('servicios')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            <Layers className="w-3.5 h-3.5" /> Catálogo ({servicios.length})
          </button>
          <button onClick={() => setView('nueva')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ background: NAVY }}>
            <Plus className="w-4 h-4" /> Nueva propuesta
          </button>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        {PERIOD_OPTIONS.map(o => (
          <button key={o.value} onClick={() => setFilterPeriod(o.value)}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
              filterPeriod === o.value
                ? 'text-white' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
            }`}
            style={filterPeriod === o.value ? { background: NAVY } : {}}>
            {o.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard icon={FileText} label="Total" value={stats.total} accent="slate"
          onClick={() => setFilterEstado('todas')} active={filterEstado === 'todas'} />
        <KpiCard icon={Clock} label="Borradores" value={stats.borradores} accent="slate"
          onClick={() => setFilterEstado('borrador')} active={filterEstado === 'borrador'} />
        <KpiCard icon={Send} label="Activas" value={stats.activas} accent="blue"
          onClick={() => setFilterEstado('activas')} active={filterEstado === 'activas'} />
        <KpiCard icon={CheckCircle2} label="Firmadas" value={stats.firmadas}
          sub={`${stats.conversion}% conv.`} accent="emerald"
          onClick={() => setFilterEstado('firmadas')} active={filterEstado === 'firmadas'} />
        <KpiCard icon={ClipboardList} label="Cerrado MXN"
          value={`$${fmtCompact(stats.cerradoMxn)}`}
          sub={stats.cerradoUsd > 0 ? `+ $${fmtCompact(stats.cerradoUsd)} USD` : 'firmadas'}
          accent="navy" />
      </div>

      {/* Búsqueda */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por folio, cliente, servicio o asesor…"
            className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#101C44)]/15 focus:bg-white" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button onClick={load} disabled={loading} title="Refrescar"
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">
            {filterEstado === 'todas' ? 'Todas las propuestas' :
             filterEstado === 'borrador' ? 'Borradores' :
             filterEstado === 'activas' ? 'Propuestas activas' :
             filterEstado === 'firmadas' ? 'Propuestas firmadas' :
             'Propuestas rechazadas'}
            <span className="ml-2 text-xs font-medium text-slate-400">{filtradas.length}</span>
          </h3>
          {filterEstado !== 'todas' && (
            <button onClick={() => setFilterEstado('todas')} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
              <X className="w-3 h-3" /> Quitar filtro
            </button>
          )}
        </div>

        {loading && propuestas.length === 0 ? (
          <div className="py-16 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : filtradas.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-1">
              {propuestas.length === 0 ? 'Aún no has creado propuestas' : 'Sin resultados con esos filtros'}
            </p>
            {propuestas.length === 0 && (
              <button onClick={() => setView('nueva')}
                className="inline-flex items-center gap-2 px-4 py-2 mt-3 text-sm font-semibold text-white rounded-lg" style={{ background: NAVY }}>
                <Plus className="w-4 h-4" /> Crear la primera
              </button>
            )}
            {propuestas.length === 0 && servicios.length === 0 && (
              <p className="text-[11px] text-slate-400 mt-3 max-w-sm mx-auto">
                Empieza creando tu <button onClick={() => setView('servicios')} className="underline hover:text-slate-700">catálogo de servicios</button> con
                lo que ofrece tu empresa (objeto, requisitos, precios). Después podrás usarlos para generar propuestas en segundos.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-50">
              {filtradasPag.map(p => {
                const Icon = ESTADO_ICON[p.estado] || FileText
                return (
                  <button key={p.id} onClick={() => { setSelectedId(p.id); setView('preview') }}
                    className="w-full text-left block px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-50 flex-shrink-0">
                        <Icon className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-mono font-semibold" style={{ color: NAVY }}>{p.folio}</span>
                          <span className={`text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded ${ESTADO_CSS[p.estado] || ESTADO_CSS.borrador}`}>
                            {ESTADO_LABEL[p.estado] || p.estado}
                          </span>
                          {isAdmin && (p.vendedor_user_name || p.vendedor_nombre) && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <User className="w-2.5 h-2.5" /> {p.vendedor_user_name || p.vendedor_nombre}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-800 truncate">{p.cliente_nombre}</p>
                        <p className="text-xs text-slate-500 truncate">{p.servicio_nombre || '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {p.total_mxn > 0 && <p className="text-sm font-semibold text-slate-700">{fmtMoney(p.total_mxn, 'MXN')}</p>}
                        {p.total_usd > 0 && <p className="text-xs text-slate-500">{fmtMoney(p.total_usd, 'USD')} USD</p>}
                        {!p.total_mxn && !p.total_usd && <p className="text-sm text-slate-400">—</p>}
                        <p className="text-[11px] text-slate-400">{fmt(p.created_at)}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            {filtradas.length > PAGE_SIZE && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-slate-500">
                  Mostrando <strong className="text-slate-700">{(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, filtradas.length)}</strong> de <strong className="text-slate-700">{filtradas.length}</strong>
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageSafe === 1}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-slate-700 px-3 py-1 bg-slate-50 rounded-lg min-w-[60px] text-center">
                    {pageSafe} / {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageSafe === totalPages}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Sub-componente: KPI card
// ─────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent = 'slate', onClick, active }) {
  const ACCENTS = {
    slate:   { bg: 'bg-slate-50',    text: 'text-slate-600',   active: 'border-slate-400' },
    blue:    { bg: 'bg-blue-50',     text: 'text-blue-600',    active: 'border-blue-400' },
    emerald: { bg: 'bg-emerald-50',  text: 'text-emerald-600', active: 'border-emerald-400' },
    navy:    { bg: 'bg-[var(--brand-primary-soft,#e8ecf2)]',   text: 'text-[var(--brand-primary,#101C44)]', active: 'border-[var(--brand-primary,#101C44)]' },
  }
  const a = ACCENTS[accent] || ACCENTS.slate
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={`text-left bg-white border-2 rounded-xl p-4 transition-all ${
        active ? a.active + ' shadow-sm' : 'border-slate-200'
      } ${onClick ? 'hover:border-slate-300 cursor-pointer' : 'cursor-default'}`}>
      <div className={`w-8 h-8 rounded-lg ${a.bg} ${a.text} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
      <p className="text-xs font-medium text-slate-700 mt-1.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
//  Formulario de Propuesta (Nueva + Edición)
// ─────────────────────────────────────────────────────────────

function PropuestaForm({ servicios, paletas = [], plantillas = [], onClose, editId }) {
  const { token, user } = useAuth()
  const isEdit = !!editId
  const [loadingEdit, setLoadingEdit] = useState(!!editId)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateMsg, setTemplateMsg] = useState('')
  const [form, setForm] = useState({
    servicio_id: '',
    paleta_id: '',
    cliente_nombre: '', cliente_correo: '', cliente_ciudad: '', cliente_telefono: '',
    vendedor_nombre: user?.name || '',
    vendedor_correo: user?.email || '',
    vendedor_puesto: '', vendedor_telefono: '',
    notas: '', vigencia_dias: 30,
  })
  const [conceptos, setConceptos] = useState([{ concepto: '', precio: 0, moneda: 'MXN', cantidad: 1 }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load existing data for edit
  useEffect(() => {
    if (!editId) return
    api.one(token, editId).then(p => {
      setForm({
        servicio_id: p.servicio_id || '',
        paleta_id: p.paleta_id || '',
        cliente_nombre: p.cliente_nombre || '',
        cliente_correo: p.cliente_correo || '',
        cliente_ciudad: p.cliente_ciudad || '',
        cliente_telefono: p.cliente_telefono || '',
        vendedor_nombre: p.vendedor_nombre || '',
        vendedor_correo: p.vendedor_correo || '',
        vendedor_puesto: p.vendedor_puesto || '',
        vendedor_telefono: p.vendedor_telefono || '',
        notas: p.notas || '',
        vigencia_dias: p.vigencia_dias || 30,
      })
      if (p.conceptos?.length) {
        setConceptos(p.conceptos.map(c => ({
          concepto: c.concepto || '',
          precio: c.precio ?? 0,
          moneda: c.moneda || 'MXN',
          cantidad: c.cantidad ?? 1,
        })))
      }
    }).catch(console.error).finally(() => setLoadingEdit(false))
  }, [editId, token])

  const servicioSel = servicios.find(s => String(s.id) === String(form.servicio_id))

  // Cuando cambia el servicio, sugiere precio del catálogo (solo en nueva)
  useEffect(() => {
    if (isEdit || !servicioSel) return
    if (conceptos.length === 1 && !conceptos[0].concepto && servicioSel.precio_default) {
      setConceptos([{
        concepto: servicioSel.nombre,
        precio: parseFloat(servicioSel.precio_default) || 0,
        moneda: servicioSel.moneda_default || 'MXN',
        cantidad: 1,
      }])
    }
  }, [form.servicio_id])

  const totals = useMemo(() => {
    let mxn = 0, usd = 0
    for (const c of conceptos) {
      const sub = (parseFloat(c.precio) || 0) * (parseInt(c.cantidad) || 1)
      if (c.moneda === 'USD') usd += sub
      else mxn += sub
    }
    return { mxn, usd }
  }, [conceptos])

  const loadFromTemplate = (templateId) => {
    if (!templateId) return
    const t = plantillas.find(x => String(x.id) === String(templateId))
    if (!t) return
    setForm(f => ({
      ...f,
      servicio_id: t.servicio_id || '',
      paleta_id: t.paleta_id || '',
      notas: t.notas || f.notas,
      vigencia_dias: t.vigencia_dias || 30,
    }))
    if (Array.isArray(t.conceptos) && t.conceptos.length > 0) {
      setConceptos(t.conceptos.map(c => ({
        concepto: c.concepto || '',
        precio: c.precio ?? 0,
        moneda: c.moneda || 'MXN',
        cantidad: c.cantidad ?? 1,
      })))
    }
    setTemplateMsg(`Plantilla "${t.nombre}" cargada — modifica lo que necesites`)
    setTimeout(() => setTemplateMsg(''), 4000)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      const conceptosLimpios = conceptos.filter(c => c.concepto?.trim())
      if (conceptosLimpios.length === 0) throw new Error('Agrega al menos un concepto con nombre')
      if (!form.cliente_nombre.trim()) throw new Error('El nombre del cliente es obligatorio')

      const cleanForm = {
        ...form,
        servicio_id: form.servicio_id || null,
        paleta_id: form.paleta_id || null,
        conceptos: conceptosLimpios,
      }
      if (isEdit) {
        await api.update(token, editId, cleanForm)
      } else {
        await api.create(token, cleanForm)
      }
      onClose()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#101C44)]/15"

  if (loadingEdit) return <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        <h2 className="text-xl font-bold text-slate-900">{isEdit ? 'Editar propuesta' : 'Nueva propuesta'}</h2>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Plantilla — cargar conceptos pre-llenados */}
        {plantillas.length > 0 && !isEdit && (
          <Card title="Cargar desde plantilla (opcional)" icon={FileStack}>
            <select onChange={e => loadFromTemplate(e.target.value)} className={inputCls} defaultValue="">
              <option value="">— Empezar desde cero —</option>
              {plantillas.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}{t.servicio_nombre ? ` · ${t.servicio_nombre}` : ''}</option>
              ))}
            </select>
            {templateMsg && (
              <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> {templateMsg}
              </p>
            )}
          </Card>
        )}

        {/* Servicio */}
        <Card title="Servicio (opcional)" icon={ClipboardList}>
          <select value={form.servicio_id} onChange={e => setForm({ ...form, servicio_id: e.target.value })}
            className={inputCls}>
            <option value="">— Sin servicio del catálogo —</option>
            {servicios.map(s => (
              <option key={s.id} value={s.id}>{s.nombre} {s.categoria ? `(${s.categoria})` : ''}</option>
            ))}
          </select>
          {servicioSel?.objeto && (
            <p className="mt-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded leading-relaxed">
              <strong>Objeto:</strong> {servicioSel.objeto}
            </p>
          )}
        </Card>

        {/* Paleta de marca para esta propuesta */}
        <Card title="Paleta de marca (opcional)" icon={Palette}>
          <select value={form.paleta_id} onChange={e => setForm({ ...form, paleta_id: e.target.value })}
            className={inputCls}>
            <option value="">— Usa la marca actual de la organización —</option>
            {paletas.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}{p.descripcion ? ` · ${p.descripcion}` : ''}</option>
            ))}
          </select>
          {paletas.length === 0 ? (
            <p className="mt-2 text-[11px] text-slate-500">
              💡 Tip: puedes crear paletas reutilizables desde el dashboard → botón <b>Paletas</b>. Útil para enviar propuestas con branding distinto por cliente.
            </p>
          ) : form.paleta_id && (() => {
            const p = paletas.find(x => String(x.id) === String(form.paleta_id))
            if (!p) return null
            return (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded">
                <span>Vista previa:</span>
                <div className="w-4 h-4 rounded border border-white shadow-sm" style={{ background: p.primary_color }} />
                <div className="w-4 h-4 rounded border border-white shadow-sm" style={{ background: p.secondary_color }} />
                <div className="w-4 h-4 rounded border border-white shadow-sm" style={{ background: p.accent_color }} />
                <span className="ml-2 text-slate-400">El cliente verá la propuesta con estos colores</span>
              </div>
            )
          })()}
        </Card>

        {/* Datos del cliente */}
        <Card title="Datos del cliente" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Nombre completo *</label>
              <input className={inputCls} required
                value={form.cliente_nombre} onChange={e => setForm({ ...form, cliente_nombre: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Correo</label>
              <input className={inputCls} type="email"
                value={form.cliente_correo} onChange={e => setForm({ ...form, cliente_correo: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Ciudad</label>
              <input className={inputCls}
                value={form.cliente_ciudad} onChange={e => setForm({ ...form, cliente_ciudad: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Teléfono</label>
              <input className={inputCls}
                value={form.cliente_telefono} onChange={e => setForm({ ...form, cliente_telefono: e.target.value })} />
            </div>
          </div>
        </Card>

        {/* Datos del asesor/vendedor */}
        <Card title="Datos del asesor" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Nombre</label>
              <input className={inputCls}
                value={form.vendedor_nombre} onChange={e => setForm({ ...form, vendedor_nombre: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Puesto</label>
              <input className={inputCls} placeholder="Ej: Consultor senior"
                value={form.vendedor_puesto} onChange={e => setForm({ ...form, vendedor_puesto: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Correo</label>
              <input className={inputCls} type="email"
                value={form.vendedor_correo} onChange={e => setForm({ ...form, vendedor_correo: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Teléfono</label>
              <input className={inputCls}
                value={form.vendedor_telefono} onChange={e => setForm({ ...form, vendedor_telefono: e.target.value })} />
            </div>
          </div>
        </Card>

        {/* Conceptos */}
        <Card title="Conceptos y precios" icon={ClipboardList}>
          <div className="space-y-2">
            {conceptos.map((c, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input className={`${inputCls} col-span-5`} placeholder="Descripción del concepto"
                  value={c.concepto} onChange={e => {
                    const next = [...conceptos]; next[idx] = { ...next[idx], concepto: e.target.value }; setConceptos(next)
                  }} />
                <input className={`${inputCls} col-span-2 text-right`} type="number" min="0" step="0.01"
                  placeholder="Precio"
                  value={c.precio} onChange={e => {
                    const next = [...conceptos]; next[idx] = { ...next[idx], precio: e.target.value }; setConceptos(next)
                  }} />
                <select className={`${inputCls} col-span-2`}
                  value={c.moneda} onChange={e => {
                    const next = [...conceptos]; next[idx] = { ...next[idx], moneda: e.target.value }; setConceptos(next)
                  }}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
                <input className={`${inputCls} col-span-2 text-center`} type="number" min="1"
                  placeholder="Cant"
                  value={c.cantidad} onChange={e => {
                    const next = [...conceptos]; next[idx] = { ...next[idx], cantidad: e.target.value }; setConceptos(next)
                  }} />
                <button type="button" onClick={() => setConceptos(conceptos.filter((_, i) => i !== idx))}
                  className="col-span-1 text-slate-400 hover:text-red-500 flex items-center justify-center"
                  disabled={conceptos.length === 1}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setConceptos([...conceptos, { concepto: '', precio: 0, moneda: 'MXN', cantidad: 1 }])}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 mt-2">
              <Plus className="w-3 h-3" /> Agregar concepto
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-4 text-sm">
            {totals.mxn > 0 && <span><strong>Total MXN:</strong> {fmtMoney(totals.mxn, 'MXN')}</span>}
            {totals.usd > 0 && <span><strong>Total USD:</strong> {fmtMoney(totals.usd, 'USD')}</span>}
          </div>
        </Card>

        {/* Notas + vigencia */}
        <Card title="Notas y vigencia">
          <textarea className={inputCls} rows={3} placeholder="Notas opcionales para el cliente"
            value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-xs text-slate-500">Vigencia (días)</label>
              <input className={inputCls} type="number" min="1" max="365"
                value={form.vigencia_dias} onChange={e => setForm({ ...form, vigencia_dias: parseInt(e.target.value) || 30 })} />
            </div>
          </div>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}

        <div className="flex justify-between items-center gap-2 flex-wrap">
          <button type="button" onClick={() => setShowSaveTemplate(true)}
            disabled={conceptos.every(c => !c.concepto?.trim())}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all disabled:opacity-50"
            title="Guarda los conceptos y notas actuales como plantilla reutilizable">
            <FileStack className="w-3.5 h-3.5" /> Guardar como plantilla
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              style={{ background: NAVY }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isEdit ? 'Guardar cambios' : 'Crear propuesta'}
            </button>
          </div>
        </div>
      </form>

      {showSaveTemplate && (
        <SavePlantillaModal
          form={form}
          conceptos={conceptos.filter(c => c.concepto?.trim())}
          token={token}
          onClose={() => setShowSaveTemplate(false)}
          onSaved={() => { setShowSaveTemplate(false); setTemplateMsg('Plantilla guardada ✓'); setTimeout(() => setTemplateMsg(''), 4000) }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Preview de la propuesta (vista del consultor)
// ─────────────────────────────────────────────────────────────

function PreviewPropuesta({ id, onClose, onEdit }) {
  const { token } = useAuth()
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [sentMsg, setSentMsg] = useState('')

  useEffect(() => {
    api.one(token, id).then(setP).catch(console.error).finally(() => setLoading(false))
  }, [id, token])

  if (loading) return <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
  if (!p) return <div className="py-16 text-center text-slate-400">No encontrada</div>

  const publicLink = `${window.location.origin}/propuestas/p/${p.public_token}`

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(publicLink); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  const markSent = async () => {
    try {
      await api.markSent(token, id)
      setSentMsg('Marcada como enviada. Comparte el link público al cliente.')
      const updated = await api.one(token, id)
      setP(updated)
    } catch (e) { setSentMsg('Error: ' + e.message) }
  }

  const eliminar = async () => {
    if (!confirm('¿Eliminar esta propuesta? Esta acción no se puede deshacer.')) return
    try { await api.remove(token, id); onClose() } catch (e) { alert(e.message) }
  }

  const canEdit = p.estado === 'borrador'

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        <div className="flex gap-2 flex-wrap">
          {canEdit && (
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg">
              <Edit3 className="w-3.5 h-3.5" /> Editar
            </button>
          )}
          <button onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar link'}
          </button>
          {p.estado === 'borrador' && (
            <button onClick={markSent}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white rounded-lg"
              style={{ background: NAVY }}>
              <Send className="w-3.5 h-3.5" /> Marcar como enviada
            </button>
          )}
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg">
            Imprimir/PDF
          </button>
          <button onClick={eliminar} className="p-1.5 text-slate-400 hover:text-red-500 rounded" title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {sentMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {sentMsg}
        </div>
      )}

      <div className="bg-[var(--brand-primary-soft,#f0f4f9)] border-l-4 rounded-r-lg px-4 py-2.5 text-xs flex items-center gap-3 flex-wrap"
        style={{ borderColor: NAVY }}>
        <span className="font-mono text-slate-700 break-all">{publicLink}</span>
        <span className="ml-auto text-[10px] text-slate-500">Link público para el cliente</span>
        {p.vista_at && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px]">Vista {fmt(p.vista_at)}</span>}
        {p.firmada_at && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px]">Firmada {fmt(p.firmada_at)}</span>}
        {p.estado === 'rechazada' && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">Rechazada</span>}
      </div>

      {/* Documento */}
      <PropuestaDoc p={p} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Documento de la propuesta (re-usable: preview + público)
// ─────────────────────────────────────────────────────────────

export function PropuestaDoc({ p }) {
  const requisitos = Array.isArray(p.requisitos) ? p.requisitos
    : (typeof p.requisitos === 'string' ? (() => { try { return JSON.parse(p.requisitos) } catch { return [] } })() : [])
  const conceptos = p.conceptos || []
  const fechaEmision = new Date(p.created_at)
  const fechaVencimiento = new Date(fechaEmision.getTime() + (p.vigencia_dias || 30) * 86400000)

  return (
    <div className="print-area bg-white border border-slate-200 rounded-xl">
      <div className="px-8 py-6 border-b-4" style={{ borderColor: NAVY }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">{p.org_name || 'Alce'}</p>
            <h1 className="text-xl font-bold mt-1" style={{ color: NAVY }}>Propuesta de servicio</h1>
            {p.servicio_nombre && <p className="text-sm text-slate-600 mt-0.5">{p.servicio_nombre}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Folio</p>
            <p className="text-lg font-mono font-bold" style={{ color: NAVY }}>{p.folio}</p>
            <p className="text-xs text-slate-500 mt-1">{fechaEmision.toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' })}</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5 text-sm text-slate-700">
        <p>Estimado(a) <strong>{p.cliente_nombre}</strong>{p.cliente_ciudad ? ` de ${p.cliente_ciudad}` : ''}:</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: NAVY }}>Datos del cliente</p>
            <Row label="Nombre" value={p.cliente_nombre} />
            <Row label="Ciudad" value={p.cliente_ciudad} />
            <Row label="Correo" value={p.cliente_correo} />
            <Row label="Teléfono" value={p.cliente_telefono} />
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: NAVY }}>Asesor</p>
            <Row label="Nombre" value={p.vendedor_nombre} />
            <Row label="Puesto" value={p.vendedor_puesto} />
            <Row label="Correo" value={p.vendedor_correo} />
            <Row label="Teléfono" value={p.vendedor_telefono} />
          </div>
        </div>

        {p.servicio_objeto && (
          <Section title="Objeto"><p>{p.servicio_objeto}</p></Section>
        )}
        {p.descripcion_servicio && (
          <Section title="Descripción del servicio"><p>{p.descripcion_servicio}</p></Section>
        )}
        {p.descripcion_proceso && (
          <Section title="Proceso"><p>{p.descripcion_proceso}</p></Section>
        )}
        {requisitos.length > 0 && (
          <Section title="Requisitos">
            <ul className="list-disc list-outside ml-4 space-y-0.5">
              {requisitos.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </Section>
        )}
        {p.tiempos_estimados && (
          <Section title="Tiempos estimados"><p>{p.tiempos_estimados}</p></Section>
        )}

        {conceptos.length > 0 && (
          <div className="rounded-lg overflow-hidden border-2" style={{ borderColor: NAVY }}>
            <div className="px-4 py-2 text-white text-xs font-semibold uppercase tracking-widest" style={{ background: NAVY }}>
              Honorarios y costos
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Concepto</th>
                  <th className="text-center px-2 py-2 w-12 font-medium">Cant</th>
                  <th className="text-right px-2 py-2 w-24 font-medium">Precio</th>
                  <th className="text-right px-3 py-2 w-24 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {conceptos.map((c, i) => {
                  const subtotal = (parseFloat(c.precio) || 0) * (parseInt(c.cantidad) || 1)
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-700">{c.concepto}</td>
                      <td className="text-center px-2 py-2 text-slate-500">{c.cantidad || 1}</td>
                      <td className="text-right px-2 py-2 text-slate-600">{fmtMoney(c.precio, c.moneda)} <span className="text-[9px] text-slate-400">{c.moneda}</span></td>
                      <td className="text-right px-3 py-2 font-semibold text-slate-800">{fmtMoney(subtotal, c.moneda)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                {p.total_mxn > 0 && (
                  <tr className="border-t-2" style={{ borderColor: NAVY }}>
                    <td colSpan="3" className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{ color: NAVY }}>Total MXN</td>
                    <td className="px-3 py-2 text-right font-bold text-base" style={{ color: NAVY }}>{fmtMoney(p.total_mxn, 'MXN')}</td>
                  </tr>
                )}
                {p.total_usd > 0 && (
                  <tr style={{ borderTop: `1px solid ${NAVY}` }}>
                    <td colSpan="3" className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{ color: NAVY }}>Total USD</td>
                    <td className="px-3 py-2 text-right font-bold text-base" style={{ color: NAVY }}>{fmtMoney(p.total_usd, 'USD')}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}

        {p.notas_extra && (
          <Section title="Información adicional">
            <p className="whitespace-pre-wrap">{p.notas_extra}</p>
          </Section>
        )}

        {p.notas && (
          <Section title="Notas">
            <p className="whitespace-pre-wrap">{p.notas}</p>
          </Section>
        )}

        <div className="rounded-lg p-3 grid grid-cols-3 gap-3 text-center text-xs" style={{ background: 'var(--brand-primary-soft, #f0f4f9)' }}>
          <div><p className="text-[10px] uppercase tracking-widest text-slate-400">Emitida</p><p className="font-semibold text-slate-700">{fechaEmision.toLocaleDateString('es-MX')}</p></div>
          <div className="border-x border-slate-200"><p className="text-[10px] uppercase tracking-widest text-slate-400">Vigencia</p><p className="font-semibold text-slate-700">{p.vigencia_dias} días</p></div>
          <div><p className="text-[10px] uppercase tracking-widest text-slate-400">Válida hasta</p><p className="font-semibold text-slate-700">{fechaVencimiento.toLocaleDateString('es-MX')}</p></div>
        </div>

        <div className="pt-3">
          <p>Quedamos a sus órdenes.</p>
          <div className="mt-6">
            <p className="font-semibold text-slate-900">{p.vendedor_nombre || '—'}</p>
            {p.vendedor_puesto && <p className="text-xs text-slate-500">{p.vendedor_puesto}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: NAVY }}>{title}</p>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}
function Row({ label, value }) {
  return (
    <div className="flex items-baseline gap-2 text-[11px] py-0.5">
      <span className="text-slate-400 w-14 flex-shrink-0">{label}:</span>
      <span className="text-slate-700 font-medium truncate">{value || '—'}</span>
    </div>
  )
}
function Card({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />} {title}
      </p>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Catálogo de Servicios
// ─────────────────────────────────────────────────────────────

function ServiciosCatalog({ isAdmin, onClose }) {
  const { token } = useAuth()
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editServicio, setEditServicio] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.servicios(token).then(d => setServicios(d.servicios || [])).finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  const handleDelete = async (s) => {
    if (!confirm(`¿Desactivar el servicio "${s.nombre}"? Las propuestas existentes no se verán afectadas.`)) return
    try { await api.deleteServicio(token, s.id); load() } catch (e) { alert(e.message) }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <h2 className="text-xl font-bold text-slate-900">Catálogo de servicios</h2>
        </div>
        {isAdmin && (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: NAVY }}>
            <Plus className="w-4 h-4" /> Nuevo servicio
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Los servicios del catálogo se sugieren al crear propuestas para acelerar el flujo (objeto, requisitos y precio precargados).
      </p>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
      ) : servicios.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Layers className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-1">Aún no tienes servicios</p>
          <p className="text-xs text-slate-400 mb-4">
            Crea servicios típicos de tu empresa para reutilizar en propuestas.
          </p>
          {isAdmin && (
            <button onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: NAVY }}>
              <Plus className="w-4 h-4" /> Crear el primero
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Servicio</th>
                <th className="text-left px-4 py-2 font-medium">Categoría</th>
                <th className="text-left px-4 py-2 font-medium">Idioma</th>
                <th className="text-right px-4 py-2 font-medium">Precio default</th>
                <th className="text-center px-4 py-2 font-medium">Usos</th>
                {isAdmin && <th className="text-center px-4 py-2 font-medium w-20">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {servicios.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{s.nombre}</p>
                    {s.objeto && <p className="text-[11px] text-slate-400 truncate max-w-xs">{s.objeto}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{s.categoria || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{s.idioma === 'ingles' ? 'EN' : 'ES'}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {s.precio_default ? `${fmtMoney(s.precio_default, s.moneda_default)} ${s.moneda_default}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">{s.uso_count || 0}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEditServicio(s)} className="p-1 text-slate-400 hover:text-slate-700 rounded" title="Editar">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(s)} className="p-1 text-slate-400 hover:text-red-500 rounded" title="Desactivar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <ServicioModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load() }} />}
      {editServicio && <ServicioModal servicio={editServicio} onClose={() => setEditServicio(null)} onSaved={() => { setEditServicio(null); load() }} />}
    </div>
  )
}

function ServicioModal({ servicio, onClose, onSaved }) {
  const { token } = useAuth()
  const isEdit = !!servicio
  const [form, setForm] = useState({
    nombre: servicio?.nombre || '',
    nombre_en: servicio?.nombre_en || '',
    categoria: servicio?.categoria || '',
    idioma: servicio?.idioma || 'español',
    objeto: servicio?.objeto || '',
    descripcion_servicio: servicio?.descripcion_servicio || '',
    tiempos_estimados: servicio?.tiempos_estimados || '',
    precio_default: servicio?.precio_default || '',
    moneda_default: servicio?.moneda_default || 'MXN',
  })
  const [requisitos, setRequisitos] = useState(() => {
    if (!servicio?.requisitos) return ['']
    const parsed = Array.isArray(servicio.requisitos) ? servicio.requisitos
      : (() => { try { return JSON.parse(servicio.requisitos) } catch { return [] } })()
    return parsed.length > 0 ? parsed : ['']
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      const reqs = requisitos.filter(r => r.trim()).map(r => r.trim())
      const payload = { ...form, requisitos: reqs, precio_default: parseFloat(form.precio_default) || null }
      if (isEdit) {
        await api.patchServicio(token, servicio.id, payload)
      } else {
        await api.createServicio(token, payload)
      }
      onSaved()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#101C44)]/15"

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{isEdit ? 'Editar servicio' : 'Nuevo servicio del catálogo'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Nombre del servicio *</label>
              <input className={inputCls} required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Auditoría financiera anual" />
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Categoría</label>
              <input className={inputCls} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                placeholder="auditoria / consultoria / asesoria…" />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600 mb-1 block">Objeto del servicio</label>
            <textarea className={inputCls} rows={2} value={form.objeto} onChange={e => setForm({ ...form, objeto: e.target.value })}
              placeholder="Qué cubre este servicio en general" />
          </div>

          <div>
            <label className="text-xs text-slate-600 mb-1 block">Descripción del servicio</label>
            <textarea className={inputCls} rows={2} value={form.descripcion_servicio} onChange={e => setForm({ ...form, descripcion_servicio: e.target.value })}
              placeholder="Qué incluye específicamente" />
          </div>

          <div>
            <label className="text-xs text-slate-600 mb-1 block">Requisitos</label>
            <div className="space-y-1">
              {requisitos.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputCls} value={r}
                    onChange={e => { const next = [...requisitos]; next[i] = e.target.value; setRequisitos(next) }}
                    placeholder={`Requisito ${i + 1}`} />
                  <button type="button" onClick={() => setRequisitos(requisitos.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-red-500" disabled={requisitos.length === 1}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setRequisitos([...requisitos, ''])}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Agregar requisito
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600 mb-1 block">Tiempos estimados</label>
            <input className={inputCls} value={form.tiempos_estimados} onChange={e => setForm({ ...form, tiempos_estimados: e.target.value })}
              placeholder="Ej: 4-6 semanas" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Precio default</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={form.precio_default}
                onChange={e => setForm({ ...form, precio_default: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Moneda</label>
              <select className={inputCls} value={form.moneda_default} onChange={e => setForm({ ...form, moneda_default: e.target.value })}>
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Idioma</label>
              <select className={inputCls} value={form.idioma} onChange={e => setForm({ ...form, idioma: e.target.value })}>
                <option value="español">Español</option>
                <option value="ingles">Inglés</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              style={{ background: NAVY }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isEdit ? 'Guardar cambios' : 'Crear servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Gestor de Paletas (presets reutilizables por propuesta)
// ─────────────────────────────────────────────────────────────

function PaletasGestor({ isAdmin, onClose }) {
  const { token, user } = useAuth()
  const [paletas, setPaletas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editPaleta, setEditPaleta] = useState(null)     // paleta en edición
  const [duplicateFrom, setDuplicateFrom] = useState(null) // colores para duplicar
  const [toastMsg, setToastMsg] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.paletas(token).then(d => setPaletas(d.paletas || [])).finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  const handleDelete = async (p) => {
    if (!confirm(`¿Eliminar la paleta "${p.nombre}"? Las propuestas que la usen quedarán sin paleta (volverán a la marca de la org).`)) return
    try { await api.deletePaleta(token, p.id); load() } catch (e) { alert(e.message) }
  }

  const handleDuplicate = (p) => {
    setDuplicateFrom({
      nombre: `${p.nombre} (copia)`,
      descripcion: p.descripcion || '',
      primary_color: p.primary_color,
      secondary_color: p.secondary_color,
      accent_color: p.accent_color,
      text_on_primary: p.text_on_primary,
    })
    setShowNew(true)
  }

  const handleExport = (p) => {
    const json = {
      format: 'alce-paleta-v1',
      nombre: p.nombre,
      descripcion: p.descripcion,
      primary_color: p.primary_color,
      secondary_color: p.secondary_color,
      accent_color: p.accent_color,
      text_on_primary: p.text_on_primary,
    }
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `paleta-${p.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file) => {
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      // Soporta un objeto o un array de paletas
      const paletasImport = Array.isArray(data) ? data : [data]
      let count = 0
      for (const p of paletasImport) {
        if (!p.nombre || !p.primary_color) continue
        await api.createPaleta(token, {
          nombre: p.nombre,
          descripcion: p.descripcion || null,
          primary_color: p.primary_color,
          secondary_color: p.secondary_color || p.primary_color,
          accent_color: p.accent_color || '#3b82f6',
          text_on_primary: p.text_on_primary || '#ffffff',
        })
        count++
      }
      load()
      setToastMsg(`✓ ${count} paleta(s) importada(s)`)
      setTimeout(() => setToastMsg(''), 4000)
    } catch (e) {
      alert('Error al importar: ' + e.message)
    }
  }

  const handleApplyAsBrand = async (p) => {
    if (!isAdmin) return
    if (!confirm(`¿Aplicar la paleta "${p.nombre}" como marca oficial de tu organización?\n\nEsto cambiará los colores de toda la plataforma (sidebar, navbar, botones, etc.) para todos los usuarios de la org. Las propuestas existentes que tenían esta paleta NO se ven afectadas.`)) return
    try {
      await api.applyPaletaAsBrand(token, p.id)
      setToastMsg(`✓ "${p.nombre}" aplicada como marca de la org. Recarga para ver los cambios.`)
      setTimeout(() => setToastMsg(''), 5000)
    } catch (e) { alert(e.message) }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Palette className="w-5 h-5" style={{ color: NAVY }} /> Paletas de marca
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Presets reutilizables — cada propuesta puede usar una distinta sin tocar la marca de tu organización.</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Importar
            <input type="file" accept="application/json,.json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = '' }} />
          </label>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: NAVY }}>
            <Plus className="w-4 h-4" /> Nueva paleta
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
      ) : paletas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Palette className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-1">Aún no tienes paletas guardadas</p>
          <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
            Crea paletas para usarlas en propuestas específicas. Útil cuando quieres enviar propuestas con el branding del cliente en vez del tuyo.
          </p>
          <button onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: NAVY }}>
            <Plus className="w-4 h-4" /> Crear la primera
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {paletas.map(p => {
            const conv = p.uso_count > 0 ? Math.round((p.firmadas_count / p.uso_count) * 100) : 0
            return (
            <div key={p.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{p.nombre}</p>
                  {p.descripcion && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{p.descripcion}</p>}
                </div>
              </div>
              {/* Swatches grandes */}
              <div className="grid grid-cols-4 gap-1 mt-2">
                {[
                  { key: 'primary_color', label: 'Pri' },
                  { key: 'secondary_color', label: 'Sec' },
                  { key: 'accent_color', label: 'Ace' },
                  { key: 'text_on_primary', label: 'Txt' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex flex-col items-center">
                    <div className="w-full h-10 rounded border-2 border-white shadow-sm" style={{ background: p[key] }} />
                    <p className="text-[9px] text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Stats: uso y conversión */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-[10px]">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Uso: <strong className="text-slate-700 dark:text-slate-200">{p.uso_count || 0}</strong> · Firmadas: <strong className="text-emerald-600">{p.firmadas_count || 0}</strong></span>
                  {p.uso_count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full font-bold ${conv >= 50 ? 'bg-emerald-100 text-emerald-700' : conv >= 25 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {conv}% conv
                    </span>
                  )}
                </div>
                {p.created_by_name && <p className="text-[9px] text-slate-400 mt-1">por {p.created_by_name}</p>}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex-wrap">
                <button onClick={() => setEditPaleta(p)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Editar">
                  <Edit3 className="w-3 h-3" /> Editar
                </button>
                <button onClick={() => handleDuplicate(p)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Duplicar">
                  <Copy className="w-3 h-3" /> Duplicar
                </button>
                <button onClick={() => handleExport(p)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Exportar JSON">
                  <Download className="w-3 h-3" /> Exportar
                </button>
                {isAdmin && (
                  <button onClick={() => handleApplyAsBrand(p)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded" title="Aplicar como marca oficial de la organización">
                    <Star className="w-3 h-3" /> Como marca
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => handleDelete(p)} className="ml-auto p-1 text-slate-400 hover:text-red-500" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )})}
        </div>
      )}

      {showNew && (
        <NuevaPaletaModal
          prefilled={duplicateFrom}
          onClose={() => { setShowNew(false); setDuplicateFrom(null) }}
          onCreated={() => { setShowNew(false); setDuplicateFrom(null); load() }}
        />
      )}
      {editPaleta && (
        <NuevaPaletaModal
          editPaleta={editPaleta}
          onClose={() => setEditPaleta(null)}
          onCreated={() => { setEditPaleta(null); load() }}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toastMsg}
        </div>
      )}
    </div>
  )
}

function NuevaPaletaModal({ onClose, onCreated, editPaleta = null, prefilled = null }) {
  const { token } = useAuth()
  const isEdit = !!editPaleta
  const [form, setForm] = useState(() => {
    if (editPaleta) return {
      nombre: editPaleta.nombre || '',
      descripcion: editPaleta.descripcion || '',
      primary_color: editPaleta.primary_color || '#101C44',
      secondary_color: editPaleta.secondary_color || '#1e3a8a',
      accent_color: editPaleta.accent_color || '#f59e0b',
      text_on_primary: editPaleta.text_on_primary || '#ffffff',
    }
    if (prefilled) return prefilled
    return {
      nombre: '', descripcion: '',
      primary_color: '#101C44', secondary_color: '#1e3a8a', accent_color: '#f59e0b', text_on_primary: '#ffffff',
    }
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      if (isEdit) {
        await api.updatePaleta(token, editPaleta.id, form)
      } else {
        await api.createPaleta(token, form)
      }
      onCreated()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#101C44)]/15"

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full my-8 p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{isEdit ? 'Editar paleta' : 'Nueva paleta'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-600 mb-1 block">Nombre *</label>
            <input className={inputCls} required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Banca azul corporativa" />
          </div>
          <div>
            <label className="text-xs text-slate-600 mb-1 block">Descripción</label>
            <input className={inputCls} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Para clientes del sector financiero" />
          </div>

          {/* 4 color pickers */}
          <div className="space-y-2">
            {[
              { key: 'primary_color', label: 'Primario', hint: 'Botones principales' },
              { key: 'secondary_color', label: 'Secundario', hint: 'Hovers, variantes' },
              { key: 'accent_color', label: 'Acento', hint: 'Badges, links' },
              { key: 'text_on_primary', label: 'Texto sobre primario', hint: '#ffffff o #000000' },
            ].map(({ key, label, hint }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0" style={{ background: form[key] }}>
                  <input type="color" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{label}</span>
                    <input type="text" value={form[key]}
                      onChange={e => { const v = e.target.value; setForm({ ...form, [key]: v.startsWith('#') ? v.slice(0, 7) : '#' + v.slice(0, 6) }) }}
                      className="ml-auto w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-700" />
                  </div>
                  <p className="text-[10px] text-slate-500">{hint}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Preview en vivo */}
          <div className="border border-slate-200 rounded-lg p-3 text-sm" style={{ background: form.primary_color + '0d' }}>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Preview</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" className="px-3 py-1.5 text-xs font-bold rounded-md"
                style={{ background: form.primary_color, color: form.text_on_primary }}>
                Botón primario
              </button>
              <button type="button" className="px-3 py-1.5 text-xs font-semibold rounded-md border-2"
                style={{ borderColor: form.accent_color, color: form.accent_color }}>
                Acento
              </button>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: form.accent_color + '1a', color: form.accent_color }}>
                Badge
              </span>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              style={{ background: NAVY }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isEdit ? 'Guardar cambios' : 'Crear paleta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Gestor de Plantillas (de propuesta)
// ─────────────────────────────────────────────────────────────

function PlantillasGestor({ isAdmin, onClose }) {
  const { token } = useAuth()
  const [plantillas, setPlantillas] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api.plantillas(token).then(d => setPlantillas(d.plantillas || [])).finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  const handleDelete = async (t) => {
    if (!confirm(`¿Eliminar la plantilla "${t.nombre}"?`)) return
    try { await api.deletePlantilla(token, t.id); load() } catch (e) { alert(e.message) }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileStack className="w-5 h-5" style={{ color: NAVY }} /> Plantillas de propuesta
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Plantillas con conceptos y notas pre-cargados. Se crean desde el formulario de propuesta con el botón "Guardar como plantilla".</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
      ) : plantillas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <FileStack className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-1">Aún no tienes plantillas</p>
          <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
            Crea una propuesta normal y al final del formulario presiona <b>"Guardar como plantilla"</b> — guarda los conceptos, precios y notas para reusarlos después.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-100">
            {plantillas.map(t => {
              const conceptos = Array.isArray(t.conceptos) ? t.conceptos : []
              const total = conceptos.reduce((s, c) => s + ((parseFloat(c.precio) || 0) * (parseInt(c.cantidad) || 1)), 0)
              return (
                <div key={t.id} className="px-5 py-4 hover:bg-slate-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{t.nombre}</p>
                      {t.descripcion && <p className="text-xs text-slate-500 mt-0.5">{t.descripcion}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 flex-wrap">
                        {t.servicio_nombre && <span><Layers className="w-3 h-3 inline" /> {t.servicio_nombre}</span>}
                        {t.paleta_nombre && <span><Palette className="w-3 h-3 inline" /> {t.paleta_nombre}</span>}
                        <span>{conceptos.length} concepto(s) · ~{fmtMoney(total, 'MXN')}</span>
                        <span>vigencia {t.vigencia_dias}d</span>
                        {t.created_by_name && <span>por {t.created_by_name}</span>}
                      </div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDelete(t)} className="p-1 text-slate-400 hover:text-red-500" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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

// ─────────────────────────────────────────────────────────────
//  Modal: guardar form actual como plantilla
// ─────────────────────────────────────────────────────────────

function SavePlantillaModal({ form, conceptos, token, onClose, onSaved }) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) { setError('Pon un nombre'); return }
    setSaving(true); setError('')
    try {
      await api.createPlantilla(token, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        servicio_id: form.servicio_id || null,
        paleta_id: form.paleta_id || null,
        conceptos,
        notas: form.notas || null,
        vigencia_dias: form.vigencia_dias || 30,
      })
      onSaved()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileStack className="w-5 h-5 text-emerald-600" /> Guardar como plantilla
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Se guardarán los <b>{conceptos.length} concepto(s)</b>, las notas, vigencia, servicio y paleta seleccionada (si hay). El cliente, vendedor y datos específicos NO se guardan.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-600 mb-1 block">Nombre *</label>
            <input className={inputCls} required value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Auditoría financiera estándar" autoFocus />
          </div>
          <div>
            <label className="text-xs text-slate-600 mb-1 block">Descripción</label>
            <input className={inputCls} value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Para qué tipo de cliente / situación" />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileStack className="w-4 h-4" />}
              Guardar plantilla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
