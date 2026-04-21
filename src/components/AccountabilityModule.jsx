import { useState, useEffect } from 'react'
import { handleUpdate } from '../utils/api'
import { Bell, Clock, RefreshCw, CheckCircle2, Circle, Repeat, Plus, Send, Calendar as CalendarIcon } from 'lucide-react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { useAssistant } from '../context/AssistantContext'
import AgentAdminPanel from './AgentAdminPanel'

const AccountabilityModule = () => {
  const sessionId = 'whatsapp:+5219991735903'
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(false)
  const [alertTime, setAlertTime] = useState('10')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [form, setForm] = useState({
    mensaje: '',
    fecha_recordar: '',
    categoria: 'personal',
    recurrente: false,
    frecuencia: '',
    aviso_previo: 10,
  })
  const { lastAction } = useAssistant()

  const fetchReminders = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/n8n/webhook/reminders-read?session_id=${encodeURIComponent(sessionId)}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setReminders(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Error fetching reminders:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchReminders()
  }, [])

  const submitReminder = async (data) => {
    setSaving(true)
    const result = await handleUpdate('/api/n8n/webhook/reminders-write', {
      session_id: sessionId,
      mensaje: data.mensaje,
      fecha_recordar: data.fecha_recordar,
      categoria: data.categoria,
      recurrente: data.recurrente,
      frecuencia: data.recurrente ? data.frecuencia : 'ninguna',
      aviso_previo: parseInt(data.aviso_previo) || 10,
    })
    setSaving(false)
    setSaveStatus(result.success ? 'success' : 'error')
    if (result.success) {
      setForm({ mensaje: '', fecha_recordar: '', categoria: 'personal', recurrente: false, frecuencia: '', aviso_previo: 10 })
      setShowForm(false)
      fetchReminders()
    }
    setTimeout(() => setSaveStatus(null), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await submitReminder(form)
  }

  // Listen to Voice Assistant actions
  useEffect(() => {
    if (lastAction?.action === 'create_reminder' && lastAction?.data) {
      const payload = {
        mensaje: lastAction.data.mensaje || '',
        fecha_recordar: lastAction.data.fecha_recordar || '',
        categoria: lastAction.data.categoria || 'personal',
        recurrente: lastAction.data.recurrente || false,
        frecuencia: lastAction.data.frecuencia || '',
        aviso_previo: lastAction.data.aviso_previo || 10
      }
      submitReminder(payload)
    }
  }, [lastAction])

  const formatDate = (dateStr) => {
    if (!dateStr) return '--'
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const isOverdue = (dateStr) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  return (
    <div className="space-y-5">
      <AgentAdminPanel moduleId="accountability" />

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center space-x-3 flex-1">
            <div className="p-2.5 bg-amber-50 rounded-lg flex-shrink-0">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Recordatorios</h3>
              <p className="text-sm text-slate-500">Consulta y crea recordatorios.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={alertTime}
              onChange={(e) => setAlertTime(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-amber-500/40 outline-none cursor-pointer"
            >
              <option value="5">5 min antes</option>
              <option value="10">10 min antes</option>
              <option value="15">15 min antes</option>
              <option value="30">30 min antes</option>
            </select>
            <button
              onClick={() => setShowForm(!showForm)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                showForm
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
              }`}
            >
              <Plus className={`w-4 h-4 transition-transform ${showForm ? 'rotate-45' : ''}`} />
              <span>{showForm ? 'Cancelar' : 'Nuevo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* New Reminder Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-amber-100">
          <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-600" />
            Crear Recordatorio
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Mensaje</label>
              <textarea
                required
                value={form.mensaje}
                onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/40 outline-none transition-all text-sm"
                placeholder="Ej: Revisar el reporte semanal"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  required
                  value={form.fecha_recordar}
                  onChange={(e) => setForm({ ...form, fecha_recordar: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/40 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Categoria</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/40 outline-none transition-all text-sm cursor-pointer"
                >
                  <option value="personal">Personal</option>
                  <option value="trabajo">Trabajo</option>
                  <option value="salud">Salud</option>
                  <option value="finanzas">Finanzas</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Aviso Previo (min)</label>
                <select
                  value={form.aviso_previo}
                  onChange={(e) => setForm({ ...form, aviso_previo: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/40 outline-none transition-all text-sm cursor-pointer"
                >
                  <option value={5}>5 minutos</option>
                  <option value={10}>10 minutos</option>
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={60}>1 hora</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.recurrente}
                  onChange={(e) => setForm({ ...form, recurrente: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-slate-700">Recurrente</span>
              </label>
              {form.recurrente && (
                <select
                  value={form.frecuencia}
                  onChange={(e) => setForm({ ...form, frecuencia: e.target.value })}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/40 outline-none cursor-pointer"
                >
                  <option value="">Seleccionar frecuencia</option>
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="mensual">Mensual</option>
                </select>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                {saveStatus && (
                  <span className={`text-sm font-medium ${saveStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {saveStatus === 'success' ? 'Recordatorio creado!' : 'Error al crear recordatorio.'}
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-2 px-5 py-2.5 bg-amber-500 text-white rounded-lg font-semibold text-sm hover:bg-amber-600 transition-all active:scale-[0.98] shadow-sm"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Crear Recordatorio</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Calendar Column */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2 mb-4">
              <CalendarIcon className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Calendario</h3>
            </div>

            <div className="alce-calendar-wrapper">
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                className="w-full border-0 font-sans"
                tileClassName={({ date, view }) => {
                  if (view !== 'month') return ''
                  const hasReminder = reminders.some(r => {
                    if (!r.fecha_recordar) return false
                    const rDate = new Date(r.fecha_recordar)
                    return rDate.getDate() === date.getDate() &&
                           rDate.getMonth() === date.getMonth() &&
                           rDate.getFullYear() === date.getFullYear()
                  })

                  return `rounded-lg p-2 transition-all ${
                    hasReminder
                      ? 'bg-amber-50 text-amber-700 font-semibold relative after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-amber-500 after:rounded-full'
                      : 'hover:bg-slate-50'
                  }`
                }}
              />
            </div>
          </div>

          {/* Selected Date Summary */}
          <div className="bg-amber-50 p-5 rounded-xl border border-amber-100">
            <h4 className="font-semibold text-amber-900 text-sm mb-2">
              {selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h4>
            <div className="space-y-2 mt-3">
              {reminders.filter(r => {
                if (!r.fecha_recordar) return false
                const rDate = new Date(r.fecha_recordar)
                return rDate.getDate() === selectedDate.getDate() &&
                       rDate.getMonth() === selectedDate.getMonth() &&
                       rDate.getFullYear() === selectedDate.getFullYear()
              }).length === 0 ? (
                <p className="text-sm text-amber-600/70">No hay recordatorios este dia.</p>
              ) : (
                reminders.filter(r => {
                  if (!r.fecha_recordar) return false
                  const rDate = new Date(r.fecha_recordar)
                  return rDate.getDate() === selectedDate.getDate() &&
                         rDate.getMonth() === selectedDate.getMonth() &&
                         rDate.getFullYear() === selectedDate.getFullYear()
                }).map(r => (
                  <div key={r.id} className="bg-white p-3 rounded-lg border border-amber-100/50 flex items-start gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${r.enviado ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800 leading-tight">{r.mensaje}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(r.fecha_recordar).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}<span className="capitalize">{r.categoria}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Table Column */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Clock className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold text-slate-900 text-sm">Todos los Recordatorios</h2>
                <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-md">
                  {reminders.length}
                </span>
              </div>
              <button
                onClick={fetchReminders}
                disabled={loading}
                className="flex items-center space-x-1.5 text-sm text-amber-600 font-medium hover:text-amber-700 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
            </div>

        {loading && reminders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-500 border-t-transparent mx-auto mb-3"></div>
            <p className="text-sm">Cargando recordatorios...</p>
          </div>
        ) : reminders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay recordatorios para esta sesion.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Mensaje</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Recordar</th>
                  <th className="px-4 py-3 font-medium">Creado</th>
                  <th className="px-4 py-3 font-medium text-center">Recurrente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reminders.map((r) => (
                  <tr key={r.id} className="hover:bg-amber-50/30 transition-colors group">
                    <td className="px-4 py-3">
                      {r.enviado ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700">
                          <CheckCircle2 className="w-3 h-3" /> Enviado
                        </span>
                      ) : isOverdue(r.fecha_recordar) ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700">
                          <Circle className="w-3 h-3" /> Vencido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
                          <Circle className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700 text-sm max-w-xs truncate">{r.mensaje}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-600 capitalize">
                        {r.categoria || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {formatDate(r.fecha_recordar)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {formatDate(r.fecha_creo)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.recurrente ? (
                        <span className="inline-flex items-center gap-1 text-amber-600" title={r.frecuencia || 'Recurrente'}>
                          <Repeat className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">{r.frecuencia || 'Si'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">--</span>
                      )}
                    </td>
                  </tr>
                ))}
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

export default AccountabilityModule
