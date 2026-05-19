import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, Link, Routes, Route, useOutlet, useLocation } from 'react-router-dom'
import {
  ClipboardList, Plus, RefreshCw, FileText, Eye, Send, CheckCircle2, FileX,
  Loader2, Search, X, ChevronLeft, ChevronRight, Settings, Layers, XCircle, Clock
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

// API helpers
const api = {
  list:   (token) => fetch('/api/propuestas',           { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  one:    (token, id) => fetch(`/api/propuestas/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  create: (token, body) => fetch('/api/propuestas', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
}

// ─────────────────────────────────────────────────────────────
//  COMPONENTE PRINCIPAL — Dashboard del módulo
// ─────────────────────────────────────────────────────────────

export default function PropuestasModule() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [view, setView] = useState('dashboard') // dashboard|nueva|preview|servicios
  const [selectedId, setSelectedId] = useState(null)
  const [propuestas, setPropuestas] = useState([])
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterEstado, setFilterEstado] = useState('todas')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [props, servs] = await Promise.all([
        api.list(token).catch(() => []),
        api.servicios(token).catch(() => ({ servicios: [] })),
      ])
      setPropuestas(Array.isArray(props) ? props : [])
      setServicios(servs.servicios || [])
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const total = propuestas.length
    const borradores = propuestas.filter(p => p.estado === 'borrador').length
    const activas   = propuestas.filter(p => ['enviada', 'vista'].includes(p.estado)).length
    const firmadas  = propuestas.filter(p => p.estado === 'firmada').length
    const cerradoMxn = propuestas.filter(p => p.estado === 'firmada').reduce((s, p) => s + (parseFloat(p.total_mxn) || 0), 0)
    const cerradoUsd = propuestas.filter(p => p.estado === 'firmada').reduce((s, p) => s + (parseFloat(p.total_usd) || 0), 0)
    const considered = activas + firmadas
    const conversion = considered > 0 ? Math.round((firmadas / considered) * 100) : 0
    return { total, borradores, activas, firmadas, cerradoMxn, cerradoUsd, conversion }
  }, [propuestas])

  const filtradas = useMemo(() => {
    let list = propuestas
    if (filterEstado === 'borrador')  list = list.filter(p => p.estado === 'borrador')
    if (filterEstado === 'activas')   list = list.filter(p => ['enviada', 'vista'].includes(p.estado))
    if (filterEstado === 'firmadas')  list = list.filter(p => p.estado === 'firmada')
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
  }, [propuestas, filterEstado, search])

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const filtradasPag = filtradas.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)
  useEffect(() => { setPage(1) }, [filterEstado, search])

  // ─── Sub-vistas ───
  if (view === 'nueva') {
    return <NuevaPropuestaForm servicios={servicios} onClose={() => { setView('dashboard'); load() }} />
  }
  if (view === 'preview' && selectedId) {
    return <PreviewPropuesta id={selectedId} onClose={() => { setView('dashboard'); setSelectedId(null); load() }} />
  }
  if (view === 'servicios') {
    return <ServiciosCatalog isAdmin={isAdmin} onClose={() => { setView('dashboard'); load() }} />
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
                💡 Empieza creando tu <button onClick={() => setView('servicios')} className="underline hover:text-slate-700">catálogo de servicios</button> con
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
                            <span className="text-[10px] text-slate-400">· 👤 {p.vendedor_user_name || p.vendedor_nombre}</span>
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
//  Nueva Propuesta
// ─────────────────────────────────────────────────────────────

function NuevaPropuestaForm({ servicios, onClose }) {
  const { token, user } = useAuth()
  const [form, setForm] = useState({
    servicio_id: '',
    cliente_nombre: '', cliente_correo: '', cliente_ciudad: '', cliente_telefono: '',
    vendedor_nombre: user?.name || '',
    vendedor_correo: user?.email || '',
    vendedor_puesto: '', vendedor_telefono: '',
    notas: '', vigencia_dias: 30,
  })
  const [conceptos, setConceptos] = useState([{ concepto: '', precio: 0, moneda: 'MXN', cantidad: 1 }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const servicioSel = servicios.find(s => String(s.id) === String(form.servicio_id))

  // Cuando cambia el servicio, sugiere precio del catálogo
  useEffect(() => {
    if (!servicioSel) return
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

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      const conceptosLimpios = conceptos.filter(c => c.concepto?.trim())
      if (conceptosLimpios.length === 0) throw new Error('Agrega al menos un concepto con nombre')
      if (!form.cliente_nombre.trim()) throw new Error('El nombre del cliente es obligatorio')

      const created = await api.create(token, {
        ...form,
        servicio_id: form.servicio_id || null,
        conceptos: conceptosLimpios,
      })
      onClose() // vuelve al dashboard, refresca
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#101C44)]/15"

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        <h2 className="text-xl font-bold text-slate-900">Nueva propuesta</h2>
      </div>

      <form onSubmit={submit} className="space-y-4">
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

        {/* Datos del cliente */}
        <Card title="Datos del cliente" icon={ClipboardList}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Nombre completo *" required
              value={form.cliente_nombre} onChange={e => setForm({ ...form, cliente_nombre: e.target.value })} />
            <input className={inputCls} placeholder="Correo" type="email"
              value={form.cliente_correo} onChange={e => setForm({ ...form, cliente_correo: e.target.value })} />
            <input className={inputCls} placeholder="Ciudad"
              value={form.cliente_ciudad} onChange={e => setForm({ ...form, cliente_ciudad: e.target.value })} />
            <input className={inputCls} placeholder="Teléfono"
              value={form.cliente_telefono} onChange={e => setForm({ ...form, cliente_telefono: e.target.value })} />
          </div>
        </Card>

        {/* Conceptos */}
        <Card title="Conceptos y precios" icon={ClipboardList}>
          <div className="space-y-2">
            {conceptos.map((c, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input className={`${inputCls} col-span-6`} placeholder="Descripción del concepto"
                  value={c.concepto} onChange={e => {
                    const next = [...conceptos]; next[idx].concepto = e.target.value; setConceptos(next)
                  }} />
                <input className={`${inputCls} col-span-2 text-right`} type="number" min="0" step="0.01"
                  value={c.precio} onChange={e => {
                    const next = [...conceptos]; next[idx].precio = e.target.value; setConceptos(next)
                  }} />
                <select className={`${inputCls} col-span-2`}
                  value={c.moneda} onChange={e => {
                    const next = [...conceptos]; next[idx].moneda = e.target.value; setConceptos(next)
                  }}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
                <input className={`${inputCls} col-span-1 text-center`} type="number" min="1"
                  value={c.cantidad} onChange={e => {
                    const next = [...conceptos]; next[idx].cantidad = e.target.value; setConceptos(next)
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
          <textarea className={inputCls} rows={3} placeholder="Notas opcionales"
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

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg">Cancelar</button>
          <button type="submit" disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
            style={{ background: NAVY }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Crear propuesta
          </button>
        </div>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Preview de la propuesta (vista del consultor)
// ─────────────────────────────────────────────────────────────

function PreviewPropuesta({ id, onClose }) {
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
      setSentMsg('✅ Marcada como enviada. Comparte el link público al cliente.')
      const updated = await api.one(token, id)
      setP(updated)
    } catch (e) { setSentMsg('❌ ' + e.message) }
  }

  const eliminar = async () => {
    if (!confirm('¿Eliminar esta propuesta?')) return
    try { await api.remove(token, id); onClose() } catch (e) { alert(e.message) }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        <div className="flex gap-2 flex-wrap">
          <button onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : null}
            {copied ? '¡Copiado!' : 'Copiar link público'}
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
          <button onClick={eliminar} className="p-1.5 text-slate-400 hover:text-red-500 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {sentMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-3 py-2">{sentMsg}</div>
      )}

      <div className="bg-[var(--brand-primary-soft,#f0f4f9)] border-l-4 rounded-r-lg px-4 py-2.5 text-xs flex items-center gap-3"
        style={{ borderColor: NAVY }}>
        <span className="font-mono text-slate-700">{publicLink}</span>
        <span className="ml-auto text-[10px] text-slate-500">Link público para el cliente</span>
        {p.vista_at && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px]">👁 Vista</span>}
        {p.firmada_at && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px]">✍ Firmada</span>}
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
  const requisitos = Array.isArray(p.requisitos) ? p.requisitos : (typeof p.requisitos === 'string' ? JSON.parse(p.requisitos || '[]') : [])
  const conceptos = p.conceptos || []
  const fechaEmision = new Date(p.created_at)
  const fechaVencimiento = new Date(fechaEmision.getTime() + (p.vigencia_dias || 30) * 86400000)

  return (
    <div className="print-area bg-white border border-slate-200 rounded-xl">
      <div className="px-8 py-6 border-b-4" style={{ borderColor: NAVY }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">{p.org_name || 'Alce Alce'}</p>
            <h1 className="text-xl font-bold mt-1" style={{ color: NAVY }}>Propuesta de servicio</h1>
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

  const load = useCallback(() => {
    setLoading(true)
    api.servicios(token).then(d => setServicios(d.servicios || [])).finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {servicios.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.nombre}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{s.categoria || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{s.idioma === 'ingles' ? '🇺🇸 EN' : '🇲🇽 ES'}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {s.precio_default ? `${fmtMoney(s.precio_default, s.moneda_default)} ${s.moneda_default}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">{s.uso_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NuevoServicioModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load() }} />}
    </div>
  )
}

function NuevoServicioModal({ onClose, onCreated }) {
  const { token } = useAuth()
  const [form, setForm] = useState({
    nombre: '', nombre_en: '', categoria: '', idioma: 'español',
    objeto: '', descripcion_servicio: '', tiempos_estimados: '',
    precio_default: '', moneda_default: 'MXN',
  })
  const [requisitos, setRequisitos] = useState([''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      const reqs = requisitos.filter(r => r.trim()).map(r => r.trim())
      await api.createServicio(token, {
        ...form,
        requisitos: reqs,
        precio_default: parseFloat(form.precio_default) || null,
      })
      onCreated()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#101C44)]/15"

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Nuevo servicio del catálogo</h3>
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
                <option value="español">🇲🇽 Español</option>
                <option value="ingles">🇺🇸 Inglés</option>
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
              Crear servicio
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
