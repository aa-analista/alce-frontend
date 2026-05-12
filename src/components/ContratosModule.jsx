import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Plus, FileText, Search, RefreshCw, Trash2, Eye, FileSignature,
  CheckCircle2, Clock, Send, FileX, Filter, TrendingUp, DollarSign, Users as UsersIcon, Award
} from 'lucide-react'
import { getPropuestas, deletePropuesta, updatePropuesta } from '../utils/contratosApi'
import ContratoForm from './ContratoForm'
import ContratoPreview from './ContratoPreview'

const ESTADOS = {
  borrador: { label: 'Borrador',  cls: 'bg-slate-100 text-slate-700',     Icon: FileText },
  enviada:  { label: 'Enviada',   cls: 'bg-blue-50 text-blue-700',        Icon: Send },
  vista:    { label: 'Vista',     cls: 'bg-amber-50 text-amber-700',      Icon: Eye },
  firmada:  { label: 'Firmada',   cls: 'bg-emerald-50 text-emerald-700',  Icon: CheckCircle2 },
  vencida:  { label: 'Vencida',   cls: 'bg-red-50 text-red-700',          Icon: FileX },
}

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtMoney(amount, currency = 'MXN') {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)
}

export default function ContratosModule() {
  const { token } = useAuth()
  const [propuestas, setPropuestas] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // list | form | preview
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPropuestas(token)
      setPropuestas(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleNueva = () => { setSelected(null); setView('form') }
  const handleEdit = (p) => { setSelected(p); setView('form') }
  const handlePreview = (p) => { setSelected(p); setView('preview') }
  const handleSaved = (p) => { setSelected(p); setView('preview'); load() }
  const handleBack = () => { setView('list'); setSelected(null); load() }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta propuesta?')) return
    try { await deletePropuesta(token, id); load() }
    catch (e) { alert('Error al eliminar: ' + e.message) }
  }

  const handleChangeEstado = async (p, nuevoEstado) => {
    try { await updatePropuesta(token, p.id, { estado: nuevoEstado }); load() }
    catch (e) { alert('Error: ' + e.message) }
  }

  // ─── Métricas del dashboard ───
  const metrics = (() => {
    const moneyByStatus = (status) => propuestas
      .filter(p => p.estado === status && p.precio)
      .reduce((sum, p) => sum + parseFloat(p.precio), 0)

    const totalFirmado   = moneyByStatus('firmada')
    const totalEnPipeline = ['borrador', 'enviada', 'vista'].reduce((s, e) => s + moneyByStatus(e), 0)
    const totalPerdido   = moneyByStatus('vencida')

    // Por vendedor (firmadas)
    const byVendedor = {}
    propuestas.forEach(p => {
      const v = p.vendedor_nombre || p.user_nombre || 'Sin asignar'
      if (!byVendedor[v]) byVendedor[v] = { count: 0, firmadas: 0, monto: 0 }
      byVendedor[v].count++
      if (p.estado === 'firmada' && p.precio) {
        byVendedor[v].firmadas++
        byVendedor[v].monto += parseFloat(p.precio)
      }
    })
    const ranking = Object.entries(byVendedor)
      .map(([nombre, stats]) => ({ nombre, ...stats }))
      .sort((a, b) => b.monto - a.monto)

    return { totalFirmado, totalEnPipeline, totalPerdido, ranking }
  })()

  const filtered = propuestas.filter(p => {
    if (filterEstado && p.estado !== filterEstado) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.cliente_nombre?.toLowerCase().includes(q) ||
      p.folio?.toLowerCase().includes(q) ||
      p.tramite_nombre?.toLowerCase().includes(q)
    )
  })

  // ─── Vistas ───
  if (view === 'form') {
    return <ContratoForm propuesta={selected} onSaved={handleSaved} onCancel={handleBack} />
  }
  if (view === 'preview' && selected) {
    return <ContratoPreview propuesta={selected} onBack={handleBack} onEdit={() => handleEdit(selected)} />
  }

  // ─── Lista ───
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-[var(--brand-primary)]" />
            Generación de Contratos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Genera propuestas profesionales en PDF para tus clientes</p>
        </div>
        <button
          onClick={handleNueva}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-primary)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva propuesta
        </button>
      </div>

      {/* ─── Dashboard de dinero ─── */}
      {propuestas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-50/30 rounded-xl border border-emerald-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">Cerrado</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-800">{fmtMoney(metrics.totalFirmado)}</p>
            <p className="text-[11px] text-emerald-600 mt-1">Propuestas firmadas</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-50/30 rounded-xl border border-blue-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-700">Pipeline</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-800">{fmtMoney(metrics.totalEnPipeline)}</p>
            <p className="text-[11px] text-blue-600 mt-1">Borrador + Enviadas + Vistas</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-50/30 rounded-xl border border-red-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-red-700">Perdido</span>
              <FileX className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-800">{fmtMoney(metrics.totalPerdido)}</p>
            <p className="text-[11px] text-red-600 mt-1">Propuestas vencidas</p>
          </div>
        </div>
      )}

      {/* ─── Ranking por vendedor ─── */}
      {metrics.ranking.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-[var(--brand-primary)]" />
            <h3 className="font-semibold text-slate-800 text-sm">Ranking por vendedor</h3>
          </div>
          <div className="space-y-2">
            {metrics.ranking.slice(0, 5).map((v, i) => {
              const max = metrics.ranking[0].monto || 1
              const pct = max > 0 ? (v.monto / max) * 100 : 0
              return (
                <div key={v.nombre} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-700 truncate">{v.nombre}</p>
                      <p className="text-sm font-bold text-[var(--brand-primary)]">{fmtMoney(v.monto)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--brand-primary)] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-400 whitespace-nowrap">{v.firmadas}/{v.count} firmadas</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, folio o trámite..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/10 focus:border-[var(--brand-primary)]/30"
          />
        </div>
        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/10 focus:border-[var(--brand-primary)]/30"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          title="Actualizar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading && propuestas.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--brand-primary)] border-t-transparent mx-auto mb-3" />
            <p className="text-sm">Cargando propuestas…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-1">{propuestas.length === 0 ? 'Aún no hay propuestas' : 'Sin resultados'}</p>
            <p className="text-xs text-slate-400 mb-4">{propuestas.length === 0 ? 'Crea tu primera propuesta para empezar' : 'Prueba con otros filtros'}</p>
            {propuestas.length === 0 && (
              <button
                onClick={handleNueva}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-primary)]"
              >
                <Plus className="w-4 h-4" /> Nueva propuesta
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Folio</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Trámite</th>
                  <th className="px-4 py-3 font-medium">Vendedor</th>
                  <th className="px-4 py-3 font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(p => {
                  const est = ESTADOS[p.estado] ?? ESTADOS.borrador
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-semibold text-[var(--brand-primary)]">{p.folio}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{p.cliente_nombre}</p>
                        {p.cliente_correo && <p className="text-[11px] text-slate-400">{p.cliente_correo}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-600 max-w-[260px] truncate">{p.tramite_nombre || '—'}</p>
                        {p.tramite_categoria && (
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">{p.tramite_categoria}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{p.vendedor_nombre || p.user_nombre || '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-700">{fmtMoney(p.precio, p.moneda)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={p.estado}
                          onChange={(e) => handleChangeEstado(p, e.target.value)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border-0 cursor-pointer ${est.cls}`}
                          title="Cambiar estado"
                        >
                          {Object.entries(ESTADOS).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmt(p.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handlePreview(p)}
                            className="p-1.5 text-slate-400 hover:text-[var(--brand-primary)] hover:bg-slate-100 rounded transition-colors"
                            title="Ver propuesta"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumen rápido */}
      {propuestas.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(ESTADOS).map(([k, v]) => {
            const count = propuestas.filter(p => p.estado === k).length
            return (
              <div key={k} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${v.cls}`}>
                  <v.Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800 leading-tight">{count}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">{v.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
