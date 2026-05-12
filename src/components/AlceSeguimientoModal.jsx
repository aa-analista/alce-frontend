import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getSeguimientoTarea, createPaso, updatePaso, deletePaso,
  getPlantillas, cargarDesdePlantilla, updateRecordatorio,
} from '../utils/alceApi.js'

const PRIO_COLOR = {
  urgente: 'text-red-700 bg-red-50',
  alta:    'text-amber-700 bg-amber-50',
  normal:  'text-blue-700 bg-blue-50',
  baja:    'text-slate-500 bg-slate-100',
}
const CAT_COLOR = {
  personal: 'bg-purple-100 text-purple-700',
  negocio:  'bg-blue-100 text-blue-700',
  salud:    'bg-green-100 text-green-700',
  escuela:  'bg-yellow-100 text-yellow-700',
  trabajo:  'bg-indigo-100 text-indigo-700',
  otro:     'bg-slate-100 text-slate-600',
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

export default function AlceSeguimientoModal({ tarea, onClose, onEstadoChanged }) {
  const { token } = useAuth()
  const [pasos, setPasos]         = useState([])
  const [plantillas, setPlantillas] = useState([])
  const [loadingPasos, setLoadingPasos] = useState(true)
  const [nuevoPaso, setNuevoPaso] = useState('')
  const [addingPaso, setAddingPaso] = useState(false)
  const [selectedPlantilla, setSelectedPlantilla] = useState('')
  const [loadingPlantilla, setLoadingPlantilla] = useState(false)
  const [saving, setSaving]       = useState(false)

  const loadPasos = async () => {
    setLoadingPasos(true)
    try {
      const data = await getSeguimientoTarea(token, tarea.id)
      setPasos(Array.isArray(data) ? data : [])
    } catch { setPasos([]) }
    finally { setLoadingPasos(false) }
  }

  useEffect(() => {
    loadPasos()
    getPlantillas(token)
      .then(data => setPlantillas(Array.isArray(data) ? data.filter(p => p.activo) : []))
      .catch(() => {})
  }, [tarea.id])

  const totalPasos  = pasos.length
  const completados = pasos.filter(p => p.completado).length
  const pct         = totalPasos > 0 ? Math.round((completados / totalPasos) * 100) : 0

  const handleToggle = async (paso) => {
    setPasos(prev => prev.map(p =>
      p.id === paso.id ? { ...p, completado: !p.completado } : p
    ))
    try {
      await updatePaso(token, paso.id, { completado: !paso.completado })
    } catch {
      setPasos(prev => prev.map(p =>
        p.id === paso.id ? { ...p, completado: paso.completado } : p
      ))
    }
  }

  const handleDelete = async (id) => {
    setPasos(prev => prev.filter(p => p.id !== id))
    try { await deletePaso(token, id) }
    catch { loadPasos() }
  }

  const handleAdd = async () => {
    if (!nuevoPaso.trim()) return
    setAddingPaso(true)
    try {
      const created = await createPaso(token, {
        tarea_id: tarea.id, personal_id: tarea.personal_id || null,
        nombre_paso: nuevoPaso.trim(), orden: pasos.length + 1,
      })
      setPasos(prev => [...prev, created])
      setNuevoPaso('')
    } catch (e) { console.error(e) }
    finally { setAddingPaso(false) }
  }

  const handleCargarPlantilla = async () => {
    if (!selectedPlantilla) return
    setLoadingPlantilla(true)
    try {
      await cargarDesdePlantilla(token, tarea.id, parseInt(selectedPlantilla), tarea.personal_id || null)
      await loadPasos()
      setSelectedPlantilla('')
    } catch (e) { console.error(e) }
    finally { setLoadingPlantilla(false) }
  }

  const handleCompletar = async () => {
    setSaving(true)
    try {
      await updateRecordatorio(token, tarea.id, { estado: 'completado' })
      onEstadoChanged && onEstadoChanged('completado')
      onClose()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[540px] max-h-[88vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-50 rounded-t-2xl border-b border-slate-200 px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-slate-800 leading-snug break-words">
                {tarea.mensaje}
              </h2>
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                {tarea.personal_nombre && (
                  <span className="text-xs text-slate-500">👤 {tarea.personal_nombre}</span>
                )}
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CAT_COLOR[tarea.categoria] ?? CAT_COLOR.otro}`}>
                  {tarea.categoria}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PRIO_COLOR[tarea.prioridad] ?? PRIO_COLOR.normal}`}>
                  {tarea.prioridad}
                </span>
                <span className="text-[11px] text-slate-400">📅 {fmtDate(tarea.fecha_recordar)}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none flex-shrink-0 mt-0.5">×</button>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>{totalPasos > 0 ? `${completados} / ${totalPasos} pasos completados` : 'Sin pasos aún'}</span>
              {totalPasos > 0 && <span className="font-semibold text-blue-600">{pct}%</span>}
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  background: pct === 100 ? '#1d9e75' : '#1e5fa8'
                }}
              />
            </div>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Steps */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Pasos del proceso
            </p>
            {loadingPasos ? (
              <p className="text-xs text-slate-400 py-3">Cargando pasos…</p>
            ) : pasos.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3">
                Sin pasos. Agrega uno abajo o carga una plantilla.
              </p>
            ) : (
              <div className="space-y-1.5">
                {pasos.map(paso => (
                  <div key={paso.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0 group">
                    <button
                      onClick={() => handleToggle(paso)}
                      className={`w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors ${
                        paso.completado
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 hover:border-blue-400'
                      }`}
                    >
                      {paso.completado ? '✓' : ''}
                    </button>
                    <span className={`flex-1 text-sm ${paso.completado ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {paso.nombre_paso}
                    </span>
                    <button
                      onClick={() => handleDelete(paso.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 text-xs px-1 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add paso */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Agregar paso
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={nuevoPaso}
                onChange={e => setNuevoPaso(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Nombre del nuevo paso…"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              />
              <button
                onClick={handleAdd}
                disabled={addingPaso || !nuevoPaso.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {addingPaso ? '…' : '+ Agregar'}
              </button>
            </div>
          </div>

          {/* Load plantilla */}
          {plantillas.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Cargar plantilla de proceso
              </p>
              <div className="flex gap-2 items-center">
                <select
                  value={selectedPlantilla}
                  onChange={e => setSelectedPlantilla(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">— Selecciona una plantilla —</option>
                  {plantillas.map(pl => (
                    <option key={pl.id} value={pl.id}>{pl.nombre}</option>
                  ))}
                </select>
                <button
                  onClick={handleCargarPlantilla}
                  disabled={!selectedPlantilla || loadingPlantilla}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  {loadingPlantilla ? '…' : 'Cargar'}
                </button>
              </div>
              {selectedPlantilla && (
                <p className="text-[11px] text-slate-400 mt-2">⚠ Se agregarán los pasos al final de los existentes.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 rounded-b-2xl border-t border-slate-200 px-6 py-4 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cerrar
          </button>
          {tarea.estado !== 'completado' && (
            <button
              onClick={handleCompletar}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Guardando…' : '✓ Marcar tarea completada'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
