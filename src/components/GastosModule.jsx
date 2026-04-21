import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  DollarSign, TrendingUp, Users as UsersIcon, Zap, Calendar,
  MessageSquare, AudioLines, Mic, Volume2, Database, Image as ImageIcon, Bot,
  ArrowUpDown, Loader2
} from 'lucide-react'

const FEATURE_META = {
  coach_chat:      { label: 'Coach AI (chat)', Icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
  coach_widget:    { label: 'Coach widget',    Icon: Bot,           color: 'text-indigo-600 bg-indigo-50' },
  coach_voice:     { label: 'Coach AI (voz)',  Icon: AudioLines,    color: 'text-[#1a3a3a] bg-[#e8f0f0]' },
  tts:             { label: 'Texto a voz',     Icon: Volume2,       color: 'text-purple-600 bg-purple-50' },
  whisper:         { label: 'Transcripcion',   Icon: Mic,           color: 'text-amber-600 bg-amber-50' },
  knowledge_chat:  { label: 'Base conocimiento', Icon: Database,    color: 'text-emerald-600 bg-emerald-50' },
  image:           { label: 'Imagenes',        Icon: ImageIcon,     color: 'text-pink-600 bg-pink-50' },
}

const RANGES = [
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
  { id: 'ytd', label: 'Este año' },
]

const fmtUsd = (n) => `$${(n || 0).toFixed(n < 1 ? 4 : 2)}`
const fmtNum = (n) => new Intl.NumberFormat('es-MX').format(Math.round(n || 0))
const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
const fmtDateTime = (d) => new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

const GastosModule = () => {
  const { token, user } = useAuth()
  const [range, setRange] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    setLoading(true)
    setErrorMsg('')
    fetch(`/api/admin/usage?range=${range}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
        // Guard against unexpected shape
        if (!body.summary) throw new Error('Respuesta incompleta del servidor')
        setData(body)
      })
      .catch((err) => {
        console.error('Gastos fetch error:', err)
        setErrorMsg(err.message || 'Error al cargar los datos')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [token, range])

  const timelineMax = useMemo(() => {
    if (!data?.timeline?.length) return 1
    return Math.max(1, ...data.timeline.map(d => d.cost_usd))
  }, [data])

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return <div className="text-sm text-slate-500">No tienes acceso a esta seccion.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#1a3a3a]" />
            Gastos
          </h1>
          <p className="text-sm text-slate-500 mt-1">Consumo de tokens, audio y costo estimado de OpenAI por tu organizacion.</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
          {RANGES.map(r => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${range === r.id ? 'bg-[#1a3a3a] text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#1a3a3a] animate-spin" />
        </div>
      ) : !data ? (
        <div className="text-center py-20">
          <p className="text-sm text-slate-500">Error al cargar los datos.</p>
          {errorMsg && <p className="text-xs text-slate-400 mt-2 font-mono">{errorMsg}</p>}
          <p className="text-xs text-slate-400 mt-3">Si la tabla <code>alce_ai_usage</code> no existe, corre <code>node src/migrate.js</code> en el backend.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiBig icon={DollarSign} color="bg-[#e8f0f0] text-[#1a3a3a]" label="Gasto en el rango" value={fmtUsd(data.summary.total_cost)} sub={`Hoy: ${fmtUsd(data.summary.cost_today)}`} />
            <KpiBig icon={Zap} color="bg-blue-50 text-blue-600" label="Tokens consumidos" value={fmtNum(data.summary.total_tokens)} sub={`${fmtNum(data.summary.total_calls)} llamadas`} />
            <KpiBig icon={AudioLines} color="bg-purple-50 text-purple-600" label="Audio (min)" value={((data.summary.total_audio_sec || 0) / 60).toFixed(1)} sub={`${fmtNum(data.summary.total_audio_sec)} seg`} />
            <KpiBig icon={UsersIcon} color="bg-amber-50 text-amber-600" label="Usuarios activos" value={data.summary.active_users} sub="en el rango" />
          </div>

          {/* Timeline chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#1a3a3a]" /> Gasto diario
            </h3>
            {data.timeline.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">Sin datos en este rango.</p>
            ) : (
              <div className="flex gap-1.5 h-40 items-stretch">
                {data.timeline.map((d, i) => {
                  const pct = (d.cost_usd / timelineMax) * 100
                  return (
                    <div key={i} className="flex-1 min-w-0 max-w-[80px] flex flex-col items-center gap-1 group">
                      <div className="flex-1 w-full flex items-end">
                        <div
                          className="w-full bg-[#1a3a3a] rounded-t group-hover:bg-[#224a4a] transition-colors relative"
                          style={{ height: `${Math.max(3, pct)}%`, minHeight: '4px' }}
                          title={`${fmtDate(d.day)}: ${fmtUsd(d.cost_usd)} · ${d.calls} llamadas`}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 whitespace-nowrap">{fmtDate(d.day)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Breakdown grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* By feature */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-4">
                <ArrowUpDown className="w-4 h-4 text-[#1a3a3a]" /> Gasto por feature
              </h3>
              {data.byFeature.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Sin consumo.</p>
              ) : (
                <div className="space-y-3">
                  {data.byFeature.map(f => {
                    const meta = FEATURE_META[f.feature] || { label: f.feature, Icon: Bot, color: 'text-slate-600 bg-slate-100' }
                    const MetaIcon = meta.Icon
                    const pct = data.summary.total_cost > 0 ? (f.cost_usd / data.summary.total_cost) * 100 : 0
                    return (
                      <div key={f.feature}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${meta.color}`}>
                              <MetaIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-medium text-slate-900 truncate">{meta.label}</span>
                          </div>
                          <span className="text-slate-700 font-semibold tabular-nums">{fmtUsd(f.cost_usd)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#1a3a3a]" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{fmtNum(f.tokens)} tokens · {f.calls} llamadas</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* By user */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-4">
                <UsersIcon className="w-4 h-4 text-[#1a3a3a]" /> Top usuarios por gasto
              </h3>
              {data.byUser.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Sin consumo.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.byUser.slice(0, 10).map(u => (
                    <div key={u.id} className="py-2.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                        {(u.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{fmtNum(u.tokens)} tokens · {u.calls} llamadas</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">{fmtUsd(u.cost_usd)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent entries */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1a3a3a]" />
              <h3 className="font-semibold text-slate-900 text-sm">Ultimas llamadas</h3>
              <span className="text-xs text-slate-400">({data.recent.length})</span>
            </div>
            {data.recent.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">Sin registros.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
                      <th className="px-4 py-2.5 text-left font-medium">Usuario</th>
                      <th className="px-4 py-2.5 text-left font-medium">Feature</th>
                      <th className="px-4 py-2.5 text-left font-medium">Modelo</th>
                      <th className="px-4 py-2.5 text-right font-medium">Tokens</th>
                      <th className="px-4 py-2.5 text-right font-medium">Costo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.recent.map(r => {
                      const meta = FEATURE_META[r.feature] || { label: r.feature }
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                          <td className="px-4 py-2 text-slate-700">{r.user_name || '—'}</td>
                          <td className="px-4 py-2 text-slate-700">{meta.label}</td>
                          <td className="px-4 py-2 text-slate-500 font-mono text-[10px]">{r.model || '—'}</td>
                          <td className="px-4 py-2 text-slate-600 text-right tabular-nums">{fmtNum((r.prompt_tokens || 0) + (r.completion_tokens || 0))}</td>
                          <td className="px-4 py-2 text-slate-900 font-semibold text-right tabular-nums">{fmtUsd(r.cost_usd)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const KpiBig = ({ icon: Icon, color, label, value, sub }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5">
    <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-2`}>
      <Icon className="w-4 h-4" />
    </div>
    <p className="text-xs text-slate-500">{label}</p>
    <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
    {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
  </div>
)

export default GastosModule
