import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, TrendingDown, Users, CheckCircle2, MousePointerClick,
  ChevronRight, X, Clock, Globe, Sparkles, CalendarCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Etiquetas legibles para los pasos técnicos del funnel
const STEP_LABELS = {
  intro: 'Pantalla de inicio',
  calc: 'Calculando resultado',
  preview: 'Preview difuminado',
  email: 'Captura de correo',
  sent: 'Mapa enviado ✓',
  booked: 'Llamada agendada ✓',
  date: 'Fecha y hora',
  datos: 'Datos de contacto',
  industria: 'P· Industria', subsector: 'P· Sub-sector', tamano: 'P· Tamaño',
  rol: 'P· Rol', modelo: 'P· A quién vende', queHace: 'P· A qué se dedica',
  areas: 'P· Áreas con carga', procesos: 'P· Procesos', foco: 'P· Proceso foco',
  manualidad: 'P· Manualidad', frecuencia: 'P· Frecuencia', horas: 'P· Horas',
  personas: 'P· Personas', ia: 'P· Uso de IA', datos_q: 'P· Datos',
  herramientas: 'P· Herramientas', estrategia: 'P· Estrategia', cultura: 'P· Cultura',
  cuelloBotella: 'P· Cuello de botella', urgencia: 'P· Urgencia', objetivos: 'P· Objetivos',
  contextoExtra: 'P· Contexto extra',
}
const stepLabel = (s) => STEP_LABELS[s] || (s?.startsWith('pageview:') ? `Vista ${s.slice(9)}` : s?.startsWith('cta:') ? `Click ${s.slice(4)}` : s?.startsWith('section:') ? `Sección ${s.slice(8)}` : s)

const FLOWS = [
  { key: 'mapa', label: 'Mapa de Oportunidades', icon: Sparkles },
  { key: 'agendar', label: 'Agendar directo', icon: CalendarCheck },
  { key: 'site', label: 'Sitio (páginas/CTAs)', icon: Globe },
]

export default function AnaliticasTab() {
  const { token } = useAuth()
  const [flow, setFlow] = useState('mapa')
  const [days, setDays] = useState(30)
  const [summary, setSummary] = useState(null)
  const [sessions, setSessions] = useState([])
  const [journey, setJourney] = useState(null) // { sessionId, events, lead }
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const h = { Authorization: `Bearer ${token}` }
      const [s, se] = await Promise.all([
        fetch(`/api/funnel/summary?flow=${flow}&days=${days}`, { headers: h }).then(r => r.ok ? r.json() : null),
        fetch(`/api/funnel/sessions?flow=${flow}&days=${days}&limit=150`, { headers: h }).then(r => r.ok ? r.json() : null),
      ])
      setSummary(s)
      setSessions(se?.sessions || [])
    } catch { /* noop */ }
    setLoading(false)
  }, [token, flow, days])

  useEffect(() => { load() }, [load])

  const openJourney = async (sessionId) => {
    try {
      const r = await fetch(`/api/funnel/journey/${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) setJourney(await r.json())
    } catch { /* noop */ }
  }

  const maxReached = Math.max(1, ...(summary?.reached || []).map(r => r.sessions))
  const totalSessions = summary?.totals?.sessions || 0
  const converted = summary?.totals?.converted || 0

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2">
        {FLOWS.map(f => (
          <button
            key={f.key}
            onClick={() => setFlow(f.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              flow === f.key
                ? 'bg-[var(--brand-primary)] text-white border-transparent'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            <f.icon className="w-3.5 h-3.5" />
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
          <button onClick={load} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-50">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><Users className="w-3.5 h-3.5" /> Sesiones</div>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{totalSessions}</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-50">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Convertidos</div>
          <p className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">{converted}</p>
        </div>
        <div className="p-4 rounded-xl bg-sky-50">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-600"><MousePointerClick className="w-3.5 h-3.5" /> Conversión</div>
          <p className="mt-1 text-2xl font-bold text-sky-700 tabular-nums">{totalSessions ? Math.round((converted / totalSessions) * 100) : 0}%</p>
        </div>
      </div>

      {/* Funnel: cuántos llegaron a cada paso */}
      {flow !== 'site' && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Cuántos llegan a cada paso</h3>
          <div className="space-y-1.5">
            {(summary?.reached || []).map(r => (
              <div key={r.step} className="flex items-center gap-3">
                <span className="w-44 shrink-0 text-xs text-slate-600 truncate" title={r.step}>{stepLabel(r.step)}</span>
                <div className="flex-1 h-5 rounded bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded bg-[var(--brand-primary)]/80 transition-all"
                    style={{ width: `${Math.max(2, (r.sessions / maxReached) * 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-semibold text-slate-700 tabular-nums">{r.sessions}</span>
              </div>
            ))}
            {!loading && !(summary?.reached || []).length && (
              <p className="text-sm text-slate-400 italic py-4">Sin datos todavía en este rango.</p>
            )}
          </div>
        </div>
      )}

      {/* Dónde se quedaron (último paso por sesión) */}
      {flow !== 'site' && Boolean((summary?.dropped || []).length) && (
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            <TrendingDown className="w-3.5 h-3.5" /> Dónde se quedaron (último paso visto)
          </h3>
          <div className="flex flex-wrap gap-2">
            {(summary?.dropped || []).map(d => (
              <span key={d.step} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-800">
                {stepLabel(d.step)} <strong className="tabular-nums">{d.sessions}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sesiones recientes */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Sesiones recientes</h3>
        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
          {sessions.map(s => (
            <li key={s.session_id}>
              <button
                onClick={() => openJourney(s.session_id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.lead_id ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800 truncate">
                    {s.lead_name ? <strong>{s.lead_name}</strong> : <span className="text-slate-500">Visitante anónimo</span>}
                    <span className="ml-2 text-xs text-slate-400 font-mono">{s.session_id.slice(0, 8)}…</span>
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    Llegó hasta: <span className="font-medium text-slate-700">{stepLabel(s.last_step)}</span> · {s.events} eventos
                  </p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{new Date(s.last_seen).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </button>
            </li>
          ))}
          {!loading && !sessions.length && (
            <li className="px-4 py-6 text-sm text-slate-400 italic text-center">Sin sesiones en este rango.</li>
          )}
        </ul>
      </div>

      {/* Drawer de recorrido */}
      {journey && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setJourney(null)}>
          <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-900">Recorrido del visitante</h2>
              <button onClick={() => setJourney(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <p className="text-xs font-mono text-slate-400 mb-4">{journey.sessionId}</p>
            {journey.lead && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-sm font-semibold text-emerald-800">✓ Convertido: {journey.lead.name}</p>
                <p className="text-xs text-emerald-700">{journey.lead.email}{journey.lead.maturity_label ? ` · ${journey.lead.maturity_label}` : ''}</p>
              </div>
            )}
            <ol className="relative border-l border-slate-200 ml-2 space-y-3">
              {journey.events.map((ev, i) => (
                <li key={i} className="ml-4">
                  <span className={`absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full ${ev.event === 'complete' ? 'bg-emerald-500' : ev.event === 'click' ? 'bg-sky-400' : 'bg-slate-300'}`} />
                  <p className="text-sm text-slate-800">{stepLabel(ev.step)} <span className="text-[10px] uppercase text-slate-400">{ev.flow}</span></p>
                  <p className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(ev.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
