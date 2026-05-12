import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPersonal, getRecordatorios, getResumenSeguimiento } from '../utils/alceApi.js'
import AlceSeguimientoModal from './AlceSeguimientoModal.jsx'
import { ArrowLeft, RotateCcw, AlertCircle } from 'lucide-react'

const AVATAR_BG = ['bg-blue-600','bg-emerald-600','bg-violet-600','bg-orange-500','bg-red-700','bg-indigo-600']
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

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function isPast(iso) {
  try { return new Date(iso) < new Date() } catch { return false }
}

export default function AlceEmpleadoView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()

  const [empleado, setEmpleado]   = useState(null)
  const [tareas, setTareas]       = useState([])
  const [resumen, setResumen]     = useState({})
  const [loading, setLoading]     = useState(true)
  const [filtro, setFiltro]       = useState('todos')
  const [selectedTarea, setSelectedTarea] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [allP, allT] = await Promise.all([getPersonal(token), getRecordatorios(token)])
      const persona = (Array.isArray(allP) ? allP : []).find(p => String(p.id) === String(id))
      if (!persona) { navigate('/operacion', { state: { tab: 'mi-equipo' } }); return }
      setEmpleado(persona)

      const misTareas = (Array.isArray(allT) ? allT : [])
        .filter(t => String(t.personal_id) === String(id))
        .map(t => ({ ...t, estado: t.estado || 'pendiente' }))
      setTareas(misTareas)

      if (misTareas.length > 0) {
        try {
          const data = await getResumenSeguimiento(token, misTareas.map(t => t.id))
          setResumen(typeof data === 'object' ? data : {})
        } catch { /* ignore */ }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [id, token, navigate])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }
  if (!empleado) return null

  const idx = parseInt(empleado.id) % AVATAR_BG.length
  const total      = tareas.length
  const pendientes = tareas.filter(t => t.estado === 'pendiente').length
  const enProceso  = tareas.filter(t => t.estado === 'en_proceso').length
  const completadas = tareas.filter(t => t.estado === 'completado').length
  const vencidas   = tareas.filter(t => t.estado !== 'completado' && isPast(t.fecha_recordar)).length

  const shown = filtro === 'todos' ? tareas : tareas.filter(t => t.estado === filtro)

  return (
    <div className="space-y-6">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/operacion', { state: { tab: 'mi-equipo' } })}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Personal
        </button>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <RotateCcw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Hero card */}
      <div className={`${AVATAR_BG[idx]} rounded-2xl p-6 text-white`}>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {empleado.nombre[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">{empleado.nombre}</h2>
            <p className="text-white/75 text-sm mt-0.5">
              {empleado.rol ?? 'Sin rol'}
              {empleado.whatsapp && (
                <span className="ml-4">📱 {empleado.whatsapp.replace('whatsapp:', '')}</span>
              )}
            </p>
          </div>
          <div className="flex gap-5 flex-shrink-0">
            {[
              { label: 'Total', val: total, color: 'text-white' },
              { label: 'Pend.', val: pendientes, color: 'text-yellow-200' },
              { label: 'Proc.', val: enProceso, color: 'text-blue-200' },
              { label: 'Done', val: completadas, color: 'text-green-200' },
              ...(vencidas > 0 ? [{ label: 'Venc.', val: vencidas, color: 'text-red-200' }] : []),
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-2xl font-bold ${s.color} leading-none`}>{s.val}</p>
                <p className="text-[10px] text-white/60 mt-1 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {shown.length} tarea{shown.length !== 1 ? 's' : ''}
          {filtro !== 'todos' ? ` · ${ESTADO[filtro]?.label ?? filtro}` : ' en total'}
        </p>
        <div className="flex gap-2">
          {[
            { key: 'todos', label: 'Todas' },
            { key: 'pendiente', label: 'Pendiente' },
            { key: 'en_proceso', label: 'En proceso' },
            { key: 'completado', label: 'Completado' },
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
      </div>

      {/* Task grid */}
      {shown.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">
            {filtro === 'todos' ? `${empleado.nombre} no tiene tareas asignadas aún.` : 'No hay tareas en este estado.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shown.map(t => {
            const res = resumen[t.id] || null
            const hasPasos = res && res.total > 0
            const pct = hasPasos ? Math.round((res.completados / res.total) * 100) : 0
            const est = ESTADO[t.estado] ?? ESTADO.pendiente
            const vencida = t.estado !== 'completado' && isPast(t.fecha_recordar)
            return (
              <div
                key={t.id}
                onClick={() => setSelectedTarea(t)}
                className={`bg-white rounded-xl border cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all ${
                  vencida ? 'border-red-200 border-t-2 border-t-red-500' : 'border-slate-200 border-t-2 border-t-blue-500'
                } p-4 flex flex-col gap-3`}
              >
                <p className="text-sm font-medium text-slate-800 leading-snug">{t.mensaje}</p>

                <div className="flex flex-wrap gap-1.5 items-center">
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
                </div>

                <p className="text-[11px] text-slate-400">📅 {fmtDate(t.fecha_recordar)}</p>

                {hasPasos ? (
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">{res.completados}/{res.total} pasos</span>
                      <span className={`font-semibold ${pct === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: pct === 100 ? '#1d9e75' : '#1e5fa8' }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-300 italic">Sin pasos</p>
                )}

                <div className="flex justify-end">
                  <span className="text-[11px] text-blue-500 font-medium">Ver pasos →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
