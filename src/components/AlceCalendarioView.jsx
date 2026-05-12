import { useState, useEffect, useCallback } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { useAuth } from '../context/AuthContext'
import { getRecordatorios, getPersonal } from '../utils/alceApi.js'
import { CalendarIcon, RefreshCw, CheckCircle2, Circle, Repeat, AlertCircle, Plus, Users, Bell } from 'lucide-react'

function fmtDate(iso) {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function sameDay(a, b) {
  return a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
}

const ESTADO = {
  pendiente:  { label: 'Pendiente',  tw: 'bg-amber-50 text-amber-700' },
  en_proceso: { label: 'En proceso', tw: 'bg-blue-50 text-blue-700' },
  completado: { label: 'Completado', tw: 'bg-emerald-50 text-emerald-700' },
}

export default function AlceCalendarioView({ onOpenModal, refreshKey }) {
  const { token } = useAuth()
  const [tareasEquipo, setTareasEquipo]     = useState([]) // con personal_id
  const [recordatoriosMios, setRecordatoriosMios] = useState([]) // sin personal_id (mis recordatorios personales)
  const [empleados, setEmpleados]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filterEmpleado, setFilterEmpleado] = useState('todos') // 'todos' | id
  const [includePersonal, setIncludePersonal] = useState(false) // toggle: incluir mis recordatorios

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tareasData, empleadosData] = await Promise.all([
        getRecordatorios(token, { limit: 200 }),
        getPersonal(token, { activo: 'true' }),
      ])
      const all = (Array.isArray(tareasData) ? tareasData : [])
        .map(t => ({ ...t, estado: t.estado || 'pendiente' }))
      setTareasEquipo(all.filter(t => t.personal_id))
      setRecordatoriosMios(all.filter(t => !t.personal_id))
      setEmpleados(Array.isArray(empleadosData) ? empleadosData : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load, refreshKey])

  // Combinar: tareas del equipo + (opcional) mis recordatorios personales
  const tareasBase = includePersonal ? [...tareasEquipo, ...recordatoriosMios] : tareasEquipo

  // Filtro por empleado (no aplica a recordatorios personales)
  const tareasFiltradas = filterEmpleado === 'todos'
    ? tareasBase
    : tareasBase.filter(t => String(t.personal_id) === String(filterEmpleado))

  // Tareas del día seleccionado
  const tareasDelDia = tareasFiltradas.filter(t => {
    try { return sameDay(new Date(t.fecha_recordar), selectedDate) }
    catch { return false }
  })

  // Días que tienen tareas (para pintar el calendario)
  const diasConTareas = tareasFiltradas.reduce((acc, t) => {
    try {
      const d = new Date(t.fecha_recordar)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!acc[key]) acc[key] = []
      acc[key].push(t)
    } catch {}
    return acc
  }, {})

  const getTileClass = ({ date, view }) => {
    if (view !== 'month') return ''
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const bucket = diasConTareas[key] || []
    if (bucket.length === 0) return 'rounded-lg'
    const hayVencida = bucket.some(t => t.estado !== 'completado' && new Date(t.fecha_recordar) < new Date())
    const hayCompletada = bucket.every(t => t.estado === 'completado')
    if (hayVencida) return 'rounded-lg !bg-red-50 !text-red-700 font-semibold after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-red-500 after:rounded-full'
    if (hayCompletada) return 'rounded-lg !bg-emerald-50 !text-emerald-700 font-semibold after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-emerald-500 after:rounded-full'
    return 'rounded-lg !bg-amber-50 !text-amber-700 font-semibold after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-amber-500 after:rounded-full'
  }

  return (
    <div className="space-y-5">

      {/* Header con título + acciones */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Calendario del equipo</h2>
          <p className="text-sm text-slate-500 mt-1">Vista unificada de las tareas asignadas al equipo, con quién las tiene y cuándo vencen.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenModal && (
            <button
              onClick={() => onOpenModal('actividad')}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1a3a3a] text-white rounded-lg text-sm font-medium hover:bg-[#0f2929] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva tarea para el equipo
            </button>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtro por empleado */}
      <div className="flex items-center gap-2 flex-wrap">
        <Users className="w-4 h-4 text-slate-400" />
        <button
          onClick={() => setFilterEmpleado('todos')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            filterEmpleado === 'todos' ? 'bg-[#1a3a3a] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >Todos ({tareasEquipo.length})</button>
        {empleados.map(e => {
          const count = tareasEquipo.filter(t => String(t.personal_id) === String(e.id)).length
          return (
            <button
              key={e.id}
              onClick={() => setFilterEmpleado(e.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                String(filterEmpleado) === String(e.id) ? 'bg-[#1a3a3a] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >{e.nombre} ({count})</button>
          )
        })}

        {/* Toggle: incluir mis recordatorios personales */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setIncludePersonal(!includePersonal)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              includePersonal ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
            title="Suma a la vista los recordatorios personales tuyos (sin asignar a alguien del equipo)"
          >
            <Bell className="w-3 h-3" />
            {includePersonal ? `Incluyendo mis recordatorios (${recordatoriosMios.length})` : 'Incluir mis recordatorios'}
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Pendiente</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>Vencida</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>Completada</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Columna izquierda: Calendario + tareas del día */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-slate-800 text-sm">Calendario</h3>
            </div>
            <div className="alce-calendar-wrapper">
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                className="w-full border-0 font-sans text-sm"
                tileClassName={getTileClass}
              />
            </div>
          </div>

          {/* Tareas del día seleccionado */}
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <h4 className="font-semibold text-amber-900 text-sm mb-3">
              {selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h4>
            {tareasDelDia.length === 0 ? (
              <p className="text-sm text-amber-600/70">Sin tareas este día.</p>
            ) : (
              <div className="space-y-2">
                {tareasDelDia.map(t => {
                  const est = ESTADO[t.estado] ?? ESTADO.pendiente
                  return (
                    <div key={t.id} className="bg-white rounded-lg border border-amber-100 p-3 flex items-start gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        t.estado === 'completado' ? 'bg-emerald-500' :
                        new Date(t.fecha_recordar) < new Date() ? 'bg-red-500' : 'bg-amber-500'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 leading-tight flex items-start gap-1.5 flex-wrap">
                          <span>{t.mensaje}</span>
                          {t.created_via === 'whatsapp' && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center gap-0.5" title="Creado vía WhatsApp">
                              📱 WhatsApp
                            </span>
                          )}
                          {!t.personal_id && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700" title="Recordatorio personal">
                              Personal
                            </span>
                          )}
                        </p>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          <span className="text-[11px] text-slate-400">
                            {new Date(t.fecha_recordar).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${est.tw}`}>
                            {est.label}
                          </span>
                          {t.personal_nombre && (
                            <span className="text-[11px] text-slate-400">👤 {t.personal_nombre}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: Tabla completa */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-slate-900 text-sm">Todas las tareas del equipo</h3>
                <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-md">
                  {tareasFiltradas.length}
                </span>
              </div>
            </div>

            {loading && tareasFiltradas.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-400 border-t-transparent mx-auto mb-3" />
                <p className="text-sm">Cargando…</p>
              </div>
            ) : tareasFiltradas.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CalendarIcon className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="text-sm mb-3">{filterEmpleado === 'todos' ? 'No hay tareas del equipo aún.' : 'Esta persona no tiene tareas en este filtro.'}</p>
                {onOpenModal && (
                  <button onClick={() => onOpenModal('actividad')} className="text-xs text-[#1a3a3a] font-medium hover:underline">+ Crear primera tarea</button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium">Tarea</th>
                      <th className="px-4 py-3 font-medium">Asignado a</th>
                      <th className="px-4 py-3 font-medium">Categoría</th>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium text-center">Recurrente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tareasFiltradas.map(t => {
                      const est = ESTADO[t.estado] ?? ESTADO.pendiente
                      const vencida = t.estado !== 'completado' && new Date(t.fecha_recordar) < new Date()
                      return (
                        <tr key={t.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="px-4 py-3">
                            {t.estado === 'completado' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3" /> Completado
                              </span>
                            ) : vencida ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700">
                                <AlertCircle className="w-3 h-3" /> Vencido
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${est.tw}`}>
                                <Circle className="w-3 h-3" /> {est.label}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 max-w-[260px]">
                              <p className="text-sm font-medium text-slate-700 truncate">{t.mensaje}</p>
                              {t.created_via === 'whatsapp' && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0" title="Creado vía WhatsApp">
                                  📱
                                </span>
                              )}
                              {!t.personal_id && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0" title="Recordatorio personal">
                                  PERS
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {t.personal_nombre ?? <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-600 capitalize">
                              {t.categoria || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">{fmtDate(t.fecha_recordar)}</td>
                          <td className="px-4 py-3 text-center">
                            {t.recurrente ? (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <Repeat className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">{t.frecuencia || 'Sí'}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
