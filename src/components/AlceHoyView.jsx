import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRecordatorios, getPersonal, createRecordatorio, updateRecordatorio, deleteRecordatorio } from '../utils/alceApi.js'
import AlceSeguimientoModal from './AlceSeguimientoModal.jsx'
import { Sun, Clock, Users, Plus, Trash2, CheckCircle, RotateCcw, AlertCircle } from 'lucide-react'

const ESTADO = {
  pendiente:  { label: 'Pendiente',  tw: 'bg-amber-50 text-amber-700' },
  en_proceso: { label: 'En proceso', tw: 'bg-blue-50 text-blue-700' },
  completado: { label: 'Completado', tw: 'bg-emerald-50 text-emerald-700' },
}
const CAT_COLOR = {
  personal: 'bg-purple-100 text-purple-700', negocio: 'bg-blue-100 text-blue-700',
  salud: 'bg-green-100 text-green-700', escuela: 'bg-yellow-100 text-yellow-700',
  trabajo: 'bg-indigo-100 text-indigo-700', otro: 'bg-slate-100 text-slate-600',
}
const AVATAR_BG = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-orange-500','bg-red-700','bg-navy-800']

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function isToday(iso) {
  try {
    const d = new Date(iso)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  } catch { return false }
}

function isPast(iso) {
  try { return new Date(iso) < new Date() } catch { return false }
}

const FORM_INIT = {
  session_id: 'web-dashboard', mensaje: '', fecha_recordar: '', categoria: 'personal',
  prioridad: 'normal', recurrente: false, aviso_previo: 10, notas: '',
  asignado_por: '', personal_id: '',
}

export default function AlceHoyView({ onTabChange }) {
  const { token, user } = useAuth()
  const navigate = useNavigate()

  const [tareas, setTareas]           = useState([])
  const [personal, setPersonal]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [selectedTarea, setSelectedTarea] = useState(null)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState(FORM_INIT)
  const [saving, setSaving]           = useState(false)
  const [filtro, setFiltro]           = useState('hoy')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, p] = await Promise.all([getRecordatorios(token), getPersonal(token)])
      setTareas(Array.isArray(t) ? t.map(x => ({ ...x, estado: x.estado || 'pendiente' })) : [])
      setPersonal(Array.isArray(p) ? p.filter(x => x.activo) : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  // Derived lists
  const hoy      = tareas.filter(t => isToday(t.fecha_recordar) && t.estado !== 'completado')
  const vencidas = tareas.filter(t => !isToday(t.fecha_recordar) && isPast(t.fecha_recordar) && t.estado !== 'completado')
  const proximas = tareas.filter(t => !isPast(t.fecha_recordar) && !isToday(t.fecha_recordar)).slice(0, 5)

  const shown = filtro === 'hoy' ? hoy : filtro === 'vencidas' ? vencidas : tareas.filter(t => t.estado !== 'completado')

  const handleEstado = async (t, estado) => {
    setTareas(prev => prev.map(x => x.id === t.id ? { ...x, estado } : x))
    try { await updateRecordatorio(token, t.id, { estado }) }
    catch { load() }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    setTareas(prev => prev.filter(x => x.id !== id))
    try { await deleteRecordatorio(token, id) }
    catch { load() }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.mensaje.trim() || !form.fecha_recordar) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        personal_id: form.personal_id ? parseInt(form.personal_id) : null,
        asignado_por: form.asignado_por || user?.name || 'Dashboard',
        aviso_previo: parseInt(form.aviso_previo) || 10,
      }
      const created = await createRecordatorio(token, payload)
      setTareas(prev => [...prev, { ...created, estado: created.estado || 'pendiente' }])
      setForm(FORM_INIT)
      setShowForm(false)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sun className="w-6 h-6 text-amber-500" />
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Mi día</h2>
            <p className="text-sm text-slate-500">
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Actualizar
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva tarea
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', val: tareas.length, color: 'border-t-blue-500' },
          { label: 'Hoy', val: hoy.length, color: 'border-t-amber-500' },
          { label: 'Vencidas', val: vencidas.length, color: 'border-t-red-500' },
          { label: 'Completadas', val: tareas.filter(t => t.estado === 'completado').length, color: 'border-t-emerald-500' },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-xl border border-slate-200 border-t-2 ${s.color} p-4`}>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{s.val}</p>
          </div>
        ))}
      </div>

      {/* Main 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

        {/* LEFT: Task list */}
        <div className="space-y-4">
          {/* Filter tabs */}
          <div className="flex gap-2">
            {[
              { key: 'hoy', label: `Hoy (${hoy.length})` },
              { key: 'vencidas', label: `Vencidas (${vencidas.length})` },
              { key: 'todas', label: 'Todas pendientes' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filtro === f.key ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                {filtro === 'hoy' ? '¡Sin tareas para hoy!' : 'No hay tareas en este filtro.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {shown.map(t => {
                const est = ESTADO[t.estado] ?? ESTADO.pendiente
                const vencida = t.estado !== 'completado' && isPast(t.fecha_recordar) && !isToday(t.fecha_recordar)
                return (
                  <div
                    key={t.id}
                    className={`bg-white rounded-xl border ${vencida ? 'border-red-200 border-t-2 border-t-red-500' : 'border-slate-200 border-t-2 border-t-blue-500'} p-4 cursor-pointer hover:shadow-md transition-all`}
                    onClick={() => setSelectedTarea(t)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 leading-snug">{t.mensaje}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CAT_COLOR[t.categoria] ?? CAT_COLOR.otro}`}>
                            {t.categoria}
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${est.tw}`}>
                            {est.label}
                          </span>
                          {vencida && (
                            <span className="flex items-center gap-1 text-[11px] text-red-600 font-semibold">
                              <AlertCircle className="w-3 h-3" /> Vencida
                            </span>
                          )}
                          {t.personal_nombre && (
                            <span className="text-[11px] text-slate-500">👤 {t.personal_nombre}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5">📅 {fmtDate(t.fecha_recordar)}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {t.estado !== 'completado' && (
                          <button
                            onClick={() => handleEstado(t, 'completado')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Marcar completada"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Widgets */}
        <div className="space-y-4">

          {/* Próximas */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-slate-700">Próximas</h3>
            </div>
            {proximas.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Sin tareas próximas</p>
            ) : (
              <div className="space-y-2">
                {proximas.map(t => (
                  <div key={t.id} className="flex items-start gap-2 cursor-pointer hover:bg-slate-50 rounded-lg p-1.5 transition-colors" onClick={() => setSelectedTarea(t)}>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-700 leading-snug truncate">{t.mensaje}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(t.fecha_recordar)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Equipo */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-violet-500" />
              <h3 className="text-sm font-semibold text-slate-700">Equipo</h3>
            </div>
            {personal.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Sin miembros</p>
            ) : (
              <div className="space-y-2">
                {personal.slice(0, 6).map((p, i) => {
                  const tareasPersona = tareas.filter(t => String(t.personal_id) === String(p.id) && t.estado !== 'completado')
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 rounded-lg p-1.5 transition-colors"
                      onClick={() => navigate(`/gestion-equipo/equipo/${p.id}`)}
                    >
                      <div className={`w-7 h-7 rounded-full ${AVATAR_BG[i % AVATAR_BG.length]} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
                        {p.nombre[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{p.nombre}</p>
                        <p className="text-[11px] text-slate-400">{tareasPersona.length} tarea{tareasPersona.length !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="text-[11px] text-blue-500 font-medium">→</span>
                    </div>
                  )
                })}
              </div>
            )}
            <button
              onClick={() => onTabChange?.('equipo')}
              className="w-full mt-3 text-xs text-blue-600 hover:underline text-center"
            >
              Ver todo el equipo →
            </button>
          </div>

          {/* Acciones rápidas */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Acciones rápidas</h3>
            <div className="space-y-2">
              {[
                { label: '+ Nueva tarea', action: () => setShowForm(true), primary: true },
                { label: '👥 Ver equipo', action: () => onTabChange?.('equipo') },
                { label: '📋 Plantillas', action: () => onTabChange?.('plantillas') },
              ].map(a => (
                <button
                  key={a.label}
                  onClick={a.action}
                  className={`w-full text-sm py-2 px-3 rounded-lg text-left transition-colors ${
                    a.primary
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Nueva tarea modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">Nueva tarea / recordatorio</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mensaje / tarea *</label>
                <textarea
                  required value={form.mensaje}
                  onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))}
                  rows={3}
                  placeholder="¿Qué hay que hacer?"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha y hora *</label>
                  <input
                    type="datetime-local" required value={form.fecha_recordar}
                    onChange={e => setForm(f => ({ ...f, fecha_recordar: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {['personal','negocio','salud','escuela','trabajo','otro'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Prioridad</label>
                  <select
                    value={form.prioridad}
                    onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {['urgente','alta','normal','baja'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Asignar a</label>
                  <select
                    value={form.personal_id}
                    onChange={e => setForm(f => ({ ...f, personal_id: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">— Nadie (personal) —</option>
                    {personal.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notas (opcional)</label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                  {saving ? 'Guardando…' : 'Crear tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seguimiento modal */}
      {selectedTarea && (
        <AlceSeguimientoModal
          tarea={selectedTarea}
          onClose={() => setSelectedTarea(null)}
          onEstadoChanged={load}
        />
      )}
    </div>
  )
}
