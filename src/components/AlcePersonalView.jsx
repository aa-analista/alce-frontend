import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPersonal, getRecordatorios, createPersonal, updatePersonal } from '../utils/alceApi.js'
import { Users, Plus, RotateCcw, ChevronRight } from 'lucide-react'

const AVATAR_BG = ['bg-blue-600','bg-emerald-600','bg-violet-600','bg-orange-500','bg-red-700','bg-indigo-600']

const FORM_INIT = { nombre: '', whatsapp: '', rol: '' }

export default function AlcePersonalView() {
  const { token } = useAuth()
  const navigate  = useNavigate()

  const [personal, setPersonal]   = useState([])
  const [tareas, setTareas]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState(null)
  const [form, setForm]           = useState(FORM_INIT)
  const [saving, setSaving]       = useState(false)
  const [search, setSearch]       = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, t] = await Promise.all([getPersonal(token), getRecordatorios(token)])
      setPersonal(Array.isArray(p) ? p : [])
      setTareas(Array.isArray(t) ? t : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const openNew = () => { setEditId(null); setForm(FORM_INIT); setShowForm(true) }
  const openEdit = (p) => {
    setEditId(p.id)
    setForm({ nombre: p.nombre, whatsapp: p.whatsapp?.replace('whatsapp:', '') ?? '', rol: p.rol ?? '' })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        rol: form.rol.trim() || null,
        whatsapp: form.whatsapp.trim() ? `whatsapp:${form.whatsapp.trim()}` : null,
      }
      if (editId) {
        const updated = await updatePersonal(token, editId, payload)
        setPersonal(prev => prev.map(p => p.id === editId ? updated : p))
      } else {
        const created = await createPersonal(token, payload)
        setPersonal(prev => [...prev, created])
      }
      setShowForm(false)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const filtered = personal.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (p.rol ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const tareasPara = (id) => tareas.filter(t => String(t.personal_id) === String(id))

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
          <Users className="w-6 h-6 text-violet-500" />
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Personal</h2>
            <p className="text-sm text-slate-500">{personal.filter(p => p.activo).length} miembro{personal.filter(p => p.activo).length !== 1 ? 's' : ''} activo{personal.filter(p => p.activo).length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuevo
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre o rol…"
        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
      />

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">{search ? 'Sin resultados.' : 'No hay personal registrado aún.'}</p>
          {!search && (
            <button onClick={openNew} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              + Agregar primero
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => {
            const tt = tareasPara(p.id)
            const pendientes = tt.filter(t => t.estado === 'pendiente').length
            const enProceso  = tt.filter(t => t.estado === 'en_proceso').length
            const completadas = tt.filter(t => t.estado === 'completado').length
            return (
              <div key={p.id} className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${!p.activo ? 'opacity-50' : ''}`}>
                {/* Color bar */}
                <div className={`h-1.5 ${AVATAR_BG[i % AVATAR_BG.length]}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${AVATAR_BG[i % AVATAR_BG.length]} text-white font-bold text-sm flex items-center justify-center flex-shrink-0`}>
                        {p.nombre[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{p.nombre}</p>
                        <p className="text-xs text-slate-400">{p.rol ?? 'Sin rol'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openEdit(p)}
                      className="text-xs text-slate-400 hover:text-blue-600 px-2 py-1 rounded border border-slate-200 hover:border-blue-300 transition-colors"
                    >
                      Editar
                    </button>
                  </div>

                  {p.whatsapp && (
                    <p className="mt-3 text-xs text-slate-400">📱 {p.whatsapp.replace('whatsapp:', '')}</p>
                  )}

                  <div className="flex gap-3 mt-4">
                    {[
                      { label: 'Pend.', val: pendientes, color: 'text-amber-600' },
                      { label: 'Proc.', val: enProceso,  color: 'text-blue-600' },
                      { label: 'Done', val: completadas,  color: 'text-emerald-600' },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                        <p className="text-[10px] text-slate-400">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate(`/operacion/equipo/${p.id}`)}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    Ver panel <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">{editId ? 'Editar miembro' : 'Nuevo miembro'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
                <input
                  required value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Nombre completo"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
                <input
                  value={form.rol}
                  onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
                  placeholder="Ej: Diseñador, Vendedor…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">WhatsApp</label>
                <div className="flex">
                  <span className="flex items-center px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg text-xs text-slate-500">+</span>
                  <input
                    value={form.whatsapp}
                    onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                    placeholder="521XXXXXXXXXX"
                    className="flex-1 border border-slate-200 rounded-r-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Formato: 521XXXXXXXXXX (sin espacios ni guiones)</p>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                  {saving ? 'Guardando…' : editId ? 'Guardar cambios' : 'Crear miembro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
