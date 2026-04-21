import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOutletContext, useNavigate } from 'react-router-dom'
import {
  Bot, Search, FileText, Target, MessageSquare, BookOpen, Blocks
} from 'lucide-react'

const AGENT_META = {
  agente: { category: 'Con integraciones', Icon: MessageSquare, route: '/agente' },
  documentos: { category: 'Con archivos', Icon: FileText, route: '/documentos' },
  accountability: { category: 'Con prompt', Icon: Target, route: '/accountability' },
  conocimiento: { category: 'Con base de datos', Icon: BookOpen, route: '/conocimiento' },
}

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'activos', label: 'Activos' },
  { id: 'inactivos', label: 'Inactivos' },
  { id: 'sin-configurar', label: 'Sin configurar' },
]

const STATUS_STYLES = {
  active: { label: 'Activo', chip: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  inactive: { label: 'Inactivo', chip: 'bg-slate-100 text-slate-500 border border-slate-200', dot: 'bg-slate-400' },
  'needs-config': { label: 'Requiere configuración', chip: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
}

const MarketplaceModule = () => {
  const { setFlows } = useOutletContext()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [orgModules, setOrgModules] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => {
    Promise.all([fetchOrgModules(), fetchUsers()]).finally(() => setLoading(false))
  }, [])

  const fetchOrgModules = async () => {
    try {
      const res = await fetch('/api/modules/org', { headers })
      if (res.ok) { const data = await res.json(); setOrgModules(data.modules) }
    } catch (err) { console.error(err) }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers })
      if (res.ok) { const data = await res.json(); setUsers(data.users || []) }
    } catch (err) { console.error(err) }
  }

  const refreshSidebarFlows = async () => {
    try {
      const res = await fetch('/api/modules/me', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setFlows(data.modules) }
    } catch (err) { console.error(err) }
  }

  const toggleAgent = async (id, e) => {
    e?.stopPropagation()
    const agent = orgModules.find(a => a.id === id)
    if (!agent) return
    setToggling(id)
    try {
      const res = await fetch('/api/modules/org', {
        method: 'PUT', headers,
        body: JSON.stringify({ moduleId: id, active: !agent.active })
      })
      if (res.ok) {
        setOrgModules(orgModules.map(m => m.id === id ? { ...m, active: !m.active } : m))
        refreshSidebarFlows()
      }
    } catch (err) { console.error(err) }
    setToggling(null)
  }

  const getAssignedCount = (moduleId) => users.filter(u => u.modules?.includes(moduleId)).length

  const getStatus = (mod) => {
    if (!mod.active) return 'inactive'
    if (getAssignedCount(mod.id) === 0) return 'needs-config'
    return 'active'
  }

  const visibleAgents = useMemo(() => orgModules.filter(m => m.type === 'module' || !m.type), [orgModules])

  const kpis = {
    active: visibleAgents.filter(m => m.active).length,
    total: visibleAgents.length,
    assignments: visibleAgents.reduce((s, m) => s + getAssignedCount(m.id), 0),
    needsConfig: visibleAgents.filter(m => getStatus(m) === 'needs-config').length,
  }

  const filtered = visibleAgents.filter(mod => {
    if (search) {
      const q = search.toLowerCase()
      if (!mod.name.toLowerCase().includes(q) && !(mod.description || '').toLowerCase().includes(q)) return false
    }
    const s = getStatus(mod)
    if (filter === 'activos' && s !== 'active') return false
    if (filter === 'inactivos' && s !== 'inactive') return false
    if (filter === 'sin-configurar' && s !== 'needs-config') return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1a3a3a] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bot className="w-6 h-6 text-[#1a3a3a]" />
          Agentes
        </h1>
        <p className="text-slate-500 text-sm mt-1">Habilite, configure y asigne agentes operativos para su equipo.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Agentes activos" value={String(kpis.active).padStart(2, '0')} />
        <KpiCard label="Disponibles" value={String(kpis.total).padStart(2, '0')} />
        <KpiCard label="Asignaciones activas" value={String(kpis.assignments).padStart(2, '0')} />
        <KpiCard label="Sin configurar" value={String(kpis.needsConfig).padStart(2, '0')} />
      </div>

      {/* Search + filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="relative md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar agente..."
            className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 bg-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${filter === f.id
                ? 'bg-[#1a3a3a] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-sm">No hay agentes que coincidan con el filtro.</div>
        ) : filtered.map(agent => {
          const meta = AGENT_META[agent.id] || { category: 'General', Icon: Blocks, route: `/${agent.id}` }
          const status = getStatus(agent)
          const statusMeta = STATUS_STYLES[status]
          const assigned = getAssignedCount(agent.id)
          const { Icon, category, route } = meta
          return (
            <div
              key={agent.id}
              className={`bg-white rounded-xl border p-5 transition-all ${agent.active ? 'border-slate-200 hover:border-[#1a3a3a]/20 hover:shadow-sm' : 'border-slate-100'}`}
            >
              <div className="flex justify-between items-start gap-3 mb-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-[#e8f0f0] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#1a3a3a]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                    <p className="mt-1 text-sm text-slate-500 leading-relaxed">{agent.description}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => toggleAgent(agent.id, e)}
                  disabled={toggling === agent.id}
                  title={agent.active ? 'Desactivar' : 'Activar'}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${agent.active ? 'bg-[#1a3a3a]' : 'bg-slate-300'} ${toggling === agent.id ? 'opacity-50' : ''}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${agent.active ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusMeta.chip}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                    {statusMeta.label}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                    {category}
                  </span>
                </div>
                <span className="text-xs text-slate-500">{assigned} usuario{assigned === 1 ? '' : 's'}</span>
              </div>

              <button
                onClick={() => navigate(route)}
                className="w-full mt-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                Ver detalle
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const KpiCard = ({ label, value }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">{value}</p>
  </div>
)

export default MarketplaceModule
