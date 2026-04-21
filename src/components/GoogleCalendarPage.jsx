import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGoogleOAuth } from '../hooks/useGoogleOAuth'
import { useOutletContext, useNavigate } from 'react-router-dom'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import {
  Calendar as CalendarIcon, Link2, Unlink, CheckCircle2, XCircle,
  Clock, MapPin, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, ShoppingBag
} from 'lucide-react'

const SCOPE = 'https://www.googleapis.com/auth/calendar'

// Color map for Google Calendar event colors
const EVENT_COLORS = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
  '9': '#3f51b5', '10': '#0b8043', '11': '#d50000',
}

const GoogleCalendarPage = () => {
  const { token } = useAuth()
  const { connect, disconnect, connecting } = useGoogleOAuth()
  const { flows } = useOutletContext()
  const navigate = useNavigate()
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  // Check if module is active in marketplace
  const isModuleActive = flows.some(f => f.id === 'google-calendar' && f.active)
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMonth, setViewMonth] = useState(new Date())

  // Check connection status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/integrations/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          const connected = !!data.integrations?.['google-calendar']
          setIsConnected(connected)
          if (connected) fetchEvents()
        }
      } catch (err) {
        console.error('Error fetching status:', err)
      }
      setLoading(false)
    }
    fetchStatus()
  }, [token])

  // Fetch events from Google Calendar via backend proxy
  const fetchEvents = useCallback(async (month) => {
    setLoadingEvents(true)
    setError('')
    try {
      const target = month || viewMonth
      const timeMin = new Date(target.getFullYear(), target.getMonth() - 1, 1).toISOString()
      const timeMax = new Date(target.getFullYear(), target.getMonth() + 2, 0).toISOString()

      const res = await fetch(
        `/api/integrations/google-calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.details || errData.error || 'Error al cargar eventos')
      }

      const data = await res.json()
      setEvents(data.events || [])
    } catch (err) {
      console.error('Fetch events error:', err)
      setError(err.message)
    }
    setLoadingEvents(false)
  }, [token, viewMonth])

  const handleConnect = async () => {
    try {
      await connect('google-calendar', SCOPE)
      setIsConnected(true)
      fetchEvents()
    } catch (err) {
      console.error('Connect error:', err)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect('google-calendar')
      setIsConnected(false)
      setEvents([])
    } catch (err) {
      console.error('Disconnect error:', err)
    }
  }

  // Get events for a specific date
  const getEventsForDate = (date) => {
    return events.filter(event => {
      const start = event.start?.dateTime || event.start?.date
      if (!start) return false
      const eventDate = new Date(start)
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear()
    })
  }

  // Get dates that have events (for calendar dots)
  const datesWithEvents = new Set(
    events.map(e => {
      const start = e.start?.dateTime || e.start?.date
      if (!start) return null
      const d = new Date(start)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    }).filter(Boolean)
  )

  const selectedEvents = getEventsForDate(selectedDate)
  const isBusy = connecting === 'google-calendar'

  const formatEventTime = (event) => {
    if (event.start?.date) return 'Todo el dia'
    const start = new Date(event.start?.dateTime)
    const end = new Date(event.end?.dateTime)
    return `${start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
  }

  const getEventColor = (event) => {
    return EVENT_COLORS[event.colorId] || '#3b82f6'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  // Module not activated in marketplace
  if (!isModuleActive) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-8 h-8 text-slate-300" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Google Calendar no esta activo</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Activa este conector desde el Marketplace para poder usarlo.
          </p>
          <button
            onClick={() => navigate('/marketplace')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            Ir al Marketplace
          </button>
        </div>
      </div>
    )
  }

  // Not connected state (module active but OAuth pending)
  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Google Calendar</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Conecta tu cuenta de Google para ver y gestionar tus eventos del calendario.
          </p>
          <button
            onClick={handleConnect}
            disabled={isBusy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm"
          >
            <Link2 className="w-4 h-4" />
            {isBusy ? 'Conectando...' : 'Conectar Google Calendar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Google Calendar</h2>
            <p className="text-sm text-slate-500">Tus eventos sincronizados en tiempo real.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEvents()}
            disabled={loadingEvents}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingEvents ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <CheckCircle2 className="w-3 h-3" />
            Conectado
          </span>
          <button
            onClick={handleDisconnect}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-all"
          >
            <Unlink className="w-3 h-3" />
            Desconectar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="alce-calendar-wrapper">
              <Calendar
                onChange={(date) => setSelectedDate(date)}
                value={selectedDate}
                onActiveStartDateChange={({ activeStartDate }) => {
                  setViewMonth(activeStartDate)
                  fetchEvents(activeStartDate)
                }}
                className="w-full border-0 font-sans"
                tileClassName={({ date, view }) => {
                  if (view !== 'month') return ''
                  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
                  const hasEvent = datesWithEvents.has(key)
                  return `rounded-lg p-2 transition-all ${
                    hasEvent
                      ? 'bg-blue-50 text-blue-700 font-semibold relative after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-blue-500 after:rounded-full'
                      : 'hover:bg-slate-50'
                  }`
                }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Resumen</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Eventos totales</span>
                <span className="font-semibold text-slate-900">{events.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Eventos hoy</span>
                <span className="font-semibold text-slate-900">{getEventsForDate(new Date()).length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Dia seleccionado</span>
                <span className="font-semibold text-slate-900">{selectedEvents.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  {selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedEvents.length} {selectedEvents.length === 1 ? 'evento' : 'eventos'}
                </p>
              </div>
            </div>

            {loadingEvents ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Cargando eventos...</p>
                </div>
              </div>
            ) : selectedEvents.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="text-center">
                  <CalendarIcon className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No hay eventos este dia.</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                {selectedEvents.map((event, i) => (
                  <div key={event.id || i} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Color bar */}
                      <div
                        className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: getEventColor(event) }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-900">
                          {event.summary || '(Sin titulo)'}
                        </h4>

                        <div className="flex items-center gap-4 mt-1.5">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {formatEventTime(event)}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1 text-xs text-slate-500 truncate max-w-[200px]">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {event.location}
                            </span>
                          )}
                        </div>

                        {event.description && (
                          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                            {event.description.replace(/<[^>]*>/g, '').substring(0, 150)}
                          </p>
                        )}

                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            {event.attendees.slice(0, 5).map((a, j) => (
                              <div
                                key={j}
                                className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-600 border-2 border-white -ml-1 first:ml-0"
                                title={a.email}
                              >
                                {(a.displayName || a.email || '?')[0].toUpperCase()}
                              </div>
                            ))}
                            {event.attendees.length > 5 && (
                              <span className="text-[10px] text-slate-400 ml-1">
                                +{event.attendees.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex-shrink-0">
                        {event.status === 'confirmed' && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-600">
                            Confirmado
                          </span>
                        )}
                        {event.status === 'tentative' && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                            Tentativo
                          </span>
                        )}
                        {event.status === 'cancelled' && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                            Cancelado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming events preview */}
            {selectedEvents.length === 0 && events.length > 0 && (
              <div className="border-t border-slate-100 p-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Proximos eventos</h4>
                <div className="space-y-2">
                  {events
                    .filter(e => {
                      const start = e.start?.dateTime || e.start?.date
                      return start && new Date(start) >= new Date()
                    })
                    .slice(0, 5)
                    .map((event, i) => {
                      const start = event.start?.dateTime || event.start?.date
                      const date = new Date(start)
                      return (
                        <div
                          key={event.id || i}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedDate(date)}
                        >
                          <div
                            className="w-1 h-8 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getEventColor(event) }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-700 truncate">{event.summary || '(Sin titulo)'}</p>
                            <p className="text-xs text-slate-400">
                              {date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                              {event.start?.dateTime && ` · ${date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GoogleCalendarPage
