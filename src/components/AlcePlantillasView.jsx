import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getPlantillas, createPlantilla, updatePlantilla, deletePlantilla } from '../utils/alceApi.js'
import { ClipboardList, Plus, RotateCcw } from 'lucide-react'

const FORM_INIT = { nombre: '', descripcion: '' }

export default function AlcePlantillasView() {
  const { token } = useAuth()
  const [plantillas, setPlantillas] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [editId, setEditId]         = useState(null)
  const [form, setForm]             = useState(FORM_INIT)
  const [pasos, setPasos]           = useState([{ nombre: '' }])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getPlantillas(token)
      setPlantillas(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditId(null); setForm(FORM_INIT); setPasos([{ nombre: '' }]); setError(''); setModal(true)
  }
  const openEdit = (pl) => {
    setEditId(pl.id)
    setForm({ nombre: pl.nombre, descripcion: pl.descripcion ?? '' })
    setPasos(
      Array.isArray(pl.pasos) && pl.pasos.length > 0
        ? pl.pasos.map(p => ({ nombre: p.nombre ?? '' }))
        : [{ nombre: '' }]
    )
    setError(''); setModal(true)
  }

  const setPasoNombre = (i, val) =>
    setPasos(prev => prev.map((p, idx) => idx === i ? { ...p, nombre: val } : p))
  const addPaso = () => setPasos(prev => [...prev, { nombre: '' }])
  const removePaso = (i) => {
    if (pasos.length === 1) return
    setPasos(prev => prev.filter((_, idx) => idx !== i))
  }
  const movePaso = (i, dir) => {
    const next = [...pasos]; const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setPasos(next)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    const pasosValidos = pasos.filter(p => p.nombre.trim())
    if (pasosValidos.length === 0) { setError('Agrega al menos un paso'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        pasos: pasosValidos.map((p, i) => ({ orden: i + 1, nombre: p.nombre.trim() })),
      }
      if (editId) {
        const updated = await updatePlantilla(token, editId, payload)
        setPlantillas(prev => prev.map(pl => pl.id === editId ? updated : pl))
      } else {
        const created = await createPlantilla(token, payload)
        setPlantillas(prev => [...prev, created])
      }
      setModal(false)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await deletePlantilla(token, id)
      setPlantillas(prev => prev.filter(pl => pl.id !== id))
      setConfirmDelete(null)
    } catch (e) { console.error(e) }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Plantillas de proceso</h2>
            <p className="text-sm text-slate-500">{plantillas.length} plantilla{plantillas.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nueva plantilla
          </button>
        </div>
      </div>

      {/* Grid */}
      {plantillas.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-4">No hay plantillas. ¡Crea la primera!</p>
          <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            + Nueva plantilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantillas.map(pl => {
            const numPasos = Array.isArray(pl.pasos) ? pl.pasos.length : 0
            return (
              <div key={pl.id} className={`bg-white rounded-xl border border-slate-200 border-t-2 border-t-blue-500 p-5 flex flex-col gap-3 ${pl.activo === false ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-sm text-slate-800">{pl.nombre}</h3>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(pl)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-sm">✏️</button>
                    <button onClick={() => setConfirmDelete(pl)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors text-sm">🗑️</button>
                  </div>
                </div>

                {pl.descripcion && (
                  <p className="text-xs text-slate-500 leading-relaxed">{pl.descripcion}</p>
                )}

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    {numPasos} paso{numPasos !== 1 ? 's' : ''}
                  </p>
                  {Array.isArray(pl.pasos) && pl.pasos.slice(0, 5).map((paso, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-slate-50 last:border-0">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {paso.orden ?? i + 1}
                      </span>
                      <span className="text-xs text-slate-700">{paso.nombre}</span>
                    </div>
                  ))}
                  {numPasos > 5 && (
                    <p className="text-[11px] text-slate-400 italic mt-1.5">+ {numPasos - 5} pasos más…</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
              <h2 className="font-semibold text-slate-800">{editId ? 'Editar plantilla' : 'Nueva plantilla'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
                <input
                  required value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Onboarding de cliente, Revisión mensual…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descripción (opcional)</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="¿Para qué sirve esta plantilla?"
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>

              {/* Steps */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Pasos del proceso *</label>
                <div className="space-y-2">
                  {pasos.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <input
                        value={p.nombre}
                        onChange={e => setPasoNombre(i, e.target.value)}
                        placeholder={`Paso ${i + 1}…`}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPaso() } }}
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <div className="flex gap-1">
                        <button type="button" onClick={() => movePaso(i, -1)} disabled={i === 0}
                          className="w-7 h-7 border border-slate-200 rounded-lg text-xs text-slate-400 hover:border-slate-300 disabled:opacity-30">▲</button>
                        <button type="button" onClick={() => movePaso(i, 1)} disabled={i === pasos.length - 1}
                          className="w-7 h-7 border border-slate-200 rounded-lg text-xs text-slate-400 hover:border-slate-300 disabled:opacity-30">▼</button>
                        <button type="button" onClick={() => removePaso(i)} disabled={pasos.length === 1}
                          className="w-7 h-7 border border-red-200 rounded-lg text-xs text-red-400 hover:border-red-400 disabled:opacity-30">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addPaso}
                  className="mt-3 w-full border border-dashed border-blue-300 rounded-lg py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors">
                  + Agregar paso
                </button>
              </div>

              {error && <p className="text-red-600 text-xs">{error}</p>}

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                  {saving ? 'Guardando…' : editId ? 'Guardar cambios' : 'Crear plantilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-2">Eliminar plantilla</h3>
            <p className="text-sm text-slate-500 mb-6">
              ¿Seguro que quieres eliminar <strong>"{confirmDelete.nombre}"</strong>?
              Las tareas existentes mantendrán sus pasos.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
