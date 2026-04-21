import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Plus, AlertTriangle, Ban, CalendarClock, Clock, ClipboardCheck, Send, RefreshCw,
  FolderPlus, UserPlus, ChevronRight, Search, List, LayoutGrid, GitBranch, X,
  Check, CheckCircle2, ArrowUpDown, Circle, Bell, Repeat, ArrowLeft, Folder,
  FileText, User as UserIcon
} from 'lucide-react'
import DatePicker from './ui/DatePicker'
import TimePicker from './ui/TimePicker'
import Select from './ui/Select'

const PRIORITY_LABELS = { baja: 'BAJA', media: 'MEDIA', alta: 'ALTA', critica: 'CRÍTICA' }
const PRIORITY_COLORS = {
  baja: 'bg-slate-50 text-slate-500 border-slate-200',
  media: 'bg-amber-50 text-amber-600 border-amber-200',
  alta: 'bg-red-50 text-red-600 border-red-200',
  critica: 'bg-red-100 text-red-700 border-red-300',
}
const PRIORITY_DOT = { baja: 'bg-slate-400', media: 'bg-amber-500', alta: 'bg-red-500', critica: 'bg-red-600' }
const STATUS_LABELS = { por_iniciar: 'Por iniciar', en_curso: 'En curso', en_espera: 'En espera', bloqueada: 'Bloqueado', completada: 'Completada' }
const STATUS_COLORS = {
  por_iniciar: 'bg-slate-100 text-slate-600',
  en_curso: 'bg-blue-50 text-blue-700',
  en_espera: 'bg-amber-50 text-amber-700',
  bloqueada: 'bg-red-50 text-red-700',
  completada: 'bg-green-50 text-green-700',
}
const STATUS_DOT = {
  por_iniciar: 'bg-slate-400', en_curso: 'bg-blue-500', en_espera: 'bg-amber-500',
  bloqueada: 'bg-red-500', completada: 'bg-green-500',
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—'
const fmtRelative = (d) => {
  if (!d) return ''
  const diff = Math.floor((new Date() - new Date(d)) / 60000)
  if (diff < 1) return 'Ahora'
  if (diff < 60) return `Hace ${diff} min`
  if (diff < 1440) return `Hace ${Math.floor(diff / 60)} h`
  const days = Math.floor(diff / 1440)
  return `Hace ${days} ${days === 1 ? 'día' : 'días'}`
}

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'compartido', label: 'Trabajo compartido' },
  { id: 'agenda', label: 'Mi agenda' },
  { id: 'historial', label: 'Historial' },
]

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
const OperacionPage = () => {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('resumen')
  const [modal, setModal] = useState(null)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [detailView, setDetailView] = useState(null) // { type: 'activity'|'block'|'request', data }

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  // Load shared lists (users + projects) — used by modals
  useEffect(() => {
    fetch('/api/users', { headers }).then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {})
    fetch('/api/operacion/projects', { headers }).then(r => r.json()).then(d => setProjects(d.projects || [])).catch(() => {})
  }, [refreshKey])

  const refresh = () => setRefreshKey(k => k + 1)
  const openDetail = (type, data) => setDetailView({ type, data })
  const closeDetail = () => { setDetailView(null); refresh() }

  // Full-page detail views — replace tabs completely
  if (detailView?.type === 'activity') return <ActivityDetail token={token} data={detailView.data} onBack={closeDetail} onOpenDetail={openDetail} />
  if (detailView?.type === 'block') return <BlockDetail token={token} data={detailView.data} onBack={closeDetail} onOpenDetail={openDetail} />
  if (detailView?.type === 'request') return <RequestDetail token={token} data={detailView.data} onBack={closeDetail} onOpenDetail={openDetail} />

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === t.id ? 'border-[#1a3a3a] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'resumen' && <ResumenTab token={token} onOpenModal={setModal} onOpenDetail={openDetail} refreshKey={refreshKey} />}
      {activeTab === 'compartido' && <CompartidoTab token={token} onOpenModal={setModal} onOpenDetail={openDetail} refreshKey={refreshKey} projects={projects} />}
      {activeTab === 'agenda' && <AgendaTab token={token} onOpenModal={setModal} refreshKey={refreshKey} />}
      {activeTab === 'historial' && <HistorialTab token={token} refreshKey={refreshKey} />}

      {/* Modals */}
      {modal === 'actividad' && <ActivityModal token={token} users={users} projects={projects} onClose={() => setModal(null)} onSuccess={refresh} />}
      {modal === 'proyecto' && <ProjectModal token={token} users={users} onClose={() => setModal(null)} onSuccess={refresh} />}
      {modal === 'bloqueo' && <BlockModal token={token} users={users} projects={projects} onClose={() => setModal(null)} onSuccess={refresh} />}
      {modal === 'solicitud' && <RequestModal token={token} users={users} projects={projects} onClose={() => setModal(null)} onSuccess={refresh} />}
      {modal === 'personal' && <PersonalModal token={token} onClose={() => setModal(null)} onSuccess={refresh} />}
      {modal === 'recordatorio' && <ReminderModal token={token} onClose={() => setModal(null)} onSuccess={refresh} />}
      {modal?.type === 'convertir' && <ConvertModal token={token} users={users} projects={projects} item={modal.item} onClose={() => setModal(null)} onSuccess={refresh} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// RESUMEN TAB
// ═══════════════════════════════════════════════════════════
const ResumenTab = ({ token, onOpenModal, onOpenDetail, refreshKey }) => {
  const [summary, setSummary] = useState(null)
  const [activities, setActivities] = useState([])
  const [blocks, setBlocks] = useState([])
  const [requests, setRequests] = useState([])

  useEffect(() => {
    const h = { Authorization: `Bearer ${token}` }
    fetch('/api/operacion/summary', { headers: h }).then(r => r.json()).then(setSummary).catch(() => {})
    fetch('/api/operacion/activities', { headers: h }).then(r => r.json()).then(d => setActivities(d.activities || [])).catch(() => {})
    fetch('/api/operacion/blocks', { headers: h }).then(r => r.json()).then(d => setBlocks((d.blocks || []).filter(b => !b.resolved))).catch(() => {})
    fetch('/api/operacion/requests', { headers: h }).then(r => r.json()).then(d => setRequests((d.requests || []).filter(r => r.status === 'pendiente'))).catch(() => {})
  }, [token, refreshKey])

  const attention = activities.filter(a => (a.priority === 'alta' || a.priority === 'critica') && a.status !== 'completada').slice(0, 3)

  const kpis = [
    { icon: AlertTriangle, color: 'bg-amber-50 text-amber-600', label: 'Requieren atención', value: summary?.requieren_atencion || 0 },
    { icon: Ban, color: 'bg-red-50 text-red-600', label: 'Bloqueos activos', value: summary?.bloqueos_activos || 0 },
    { icon: CalendarClock, color: 'bg-blue-50 text-blue-600', label: 'Vence hoy', value: summary?.vence_hoy || 0 },
    { icon: Clock, color: 'bg-slate-100 text-slate-600', label: 'Esperando respuesta', value: summary?.esperando_respuesta || 0 },
    { icon: ClipboardCheck, color: 'bg-[#e8f0f0] text-[#1a3a3a]', label: 'Check-ins pendientes', value: summary?.checkins_pendientes || 0 },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Operación</h2>
        <p className="text-sm text-slate-500 mt-1">Monitoreo del trabajo compartido, prioridades, bloqueos y seguimiento del equipo</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k, i) => {
          const Icon = k.icon
          return (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg ${k.color} flex items-center justify-center mb-2`}><Icon className="w-4 h-4" /></div>
              <p className="text-2xl font-bold text-slate-900">{k.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
            </div>
          )
        })}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Requiere atención */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 text-sm">Requiere atención</h3>
              <button className="text-xs text-[#1a3a3a] font-medium hover:underline">Ver todos</button>
            </div>
            <div className="divide-y divide-slate-100">
              {attention.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Nada urgente.</p>
              ) : attention.map((a) => (
                <div
                  key={a.id}
                  onClick={() => onOpenDetail?.('activity', a)}
                  className="py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50/50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[a.priority]} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{a.name}</p>
                    <p className="text-xs text-slate-400">Proyecto: {a.project_name}</p>
                  </div>
                  <span className="text-xs text-slate-500 hidden sm:block">{a.responsible_name}</span>
                  <span className="text-xs text-slate-400">{fmtDate(a.due_date)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trabajo compartido table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Trabajo compartido</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left font-medium">Proyecto</th>
                    <th className="px-4 py-2.5 text-left font-medium">Actividad</th>
                    <th className="px-4 py-2.5 text-left font-medium">Responsable</th>
                    <th className="px-4 py-2.5 text-left font-medium">Prioridad</th>
                    <th className="px-4 py-2.5 text-left font-medium">Estado</th>
                    <th className="px-4 py-2.5 text-left font-medium">Vence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {activities.slice(0, 5).map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-600 uppercase font-medium">{a.project_name}</td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{a.name}</td>
                      <td className="px-4 py-3 text-slate-600">{a.responsible_name || '—'}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-slate-600"><span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[a.priority]}`} />{PRIORITY_LABELS[a.priority]}</span></td>
                      <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-md font-medium ${STATUS_COLORS[a.status]}`}>{STATUS_LABELS[a.status]}</span></td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(a.due_date)}</td>
                    </tr>
                  ))}
                  {activities.length === 0 && <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-400">Sin actividades aún.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <SidePanel title="Bloqueos críticos">
            {blocks.length === 0 ? <p className="text-xs text-slate-400 py-2">Sin bloqueos activos.</p> :
              blocks.slice(0, 3).map(b => (
                <div key={b.id} className="py-2">
                  <p className="text-sm font-medium text-slate-900 line-clamp-2">{b.description || 'Sin descripción'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{b.project_name || 'Sin proyecto'} · {fmtRelative(b.created_at)}</p>
                </div>
              ))}
          </SidePanel>

          <SidePanel title="Esperando a otros">
            {requests.length === 0 ? <p className="text-xs text-slate-400 py-2">Sin solicitudes pendientes.</p> :
              requests.slice(0, 3).map(r => (
                <div key={r.id} className="py-2">
                  <p className="text-sm font-medium text-slate-900 line-clamp-2">{r.message?.substring(0, 80) || 'Solicitud'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Enviado {fmtRelative(r.created_at)}</p>
                </div>
              ))}
          </SidePanel>

          <SidePanel title="Próximos check-ins">
            <p className="text-xs text-slate-400 py-2">Funcionalidad próximamente.</p>
          </SidePanel>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TRABAJO COMPARTIDO TAB
// ═══════════════════════════════════════════════════════════
const CompartidoTab = ({ token, onOpenModal, onOpenDetail, refreshKey, projects }) => {
  const [activities, setActivities] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [view, setView] = useState('lista')
  const [search, setSearch] = useState('')
  const [summary, setSummary] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [requests, setRequests] = useState([])
  const [dragOverCol, setDragOverCol] = useState(null)

  const jsonHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => {
    const h = { Authorization: `Bearer ${token}` }
    const url = selectedProject ? `/api/operacion/activities?projectId=${selectedProject}` : '/api/operacion/activities'
    fetch(url, { headers: h }).then(r => r.json()).then(d => setActivities(d.activities || []))
    fetch('/api/operacion/summary', { headers: h }).then(r => r.json()).then(setSummary)
    fetch('/api/operacion/blocks', { headers: h }).then(r => r.json()).then(d => setBlocks((d.blocks || []).filter(b => !b.resolved)))
    fetch('/api/operacion/requests', { headers: h }).then(r => r.json()).then(d => setRequests((d.requests || []).filter(r => r.status === 'pendiente')))
  }, [token, refreshKey, selectedProject])

  const updateActivity = async (id, updates) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
    try {
      await fetch(`/api/operacion/activities/${id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(updates) })
    } catch (err) { console.error(err) }
  }

  const resolveBlock = async (id) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    try {
      await fetch(`/api/operacion/blocks/${id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ resolved: true }) })
    } catch (err) { console.error(err) }
  }

  const answerRequest = async (id) => {
    setRequests(prev => prev.filter(r => r.id !== id))
    try {
      await fetch(`/api/operacion/requests/${id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ status: 'respondida' }) })
    } catch (err) { console.error(err) }
  }

  const filtered = activities.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()))

  // Scope blocks/requests to selected project
  const scopedBlocks = selectedProject ? blocks.filter(b => b.project_id === selectedProject) : blocks
  const scopedRequests = selectedProject ? requests.filter(r => r.project_id === selectedProject) : requests

  // Compute KPIs: when a project is selected, calculate locally from its activities/blocks/requests.
  // When "Todos" is active, use the org-wide summary from backend.
  const todayStr = new Date().toISOString().slice(0, 10)
  const in2Days = new Date(); in2Days.setDate(in2Days.getDate() + 2)
  const in2DaysStr = in2Days.toISOString().slice(0, 10)
  const kpis = selectedProject ? {
    requieren_atencion: activities.filter(a => ['alta', 'critica'].includes(a.priority) && ['en_curso', 'por_iniciar'].includes(a.status)).length,
    bloqueos_activos: scopedBlocks.length,
    esperando_respuesta: scopedRequests.length,
    vencimientos_proximos: activities.filter(a => a.due_date && a.due_date >= todayStr && a.due_date <= in2DaysStr && a.status !== 'completada').length,
  } : {
    requieren_atencion: summary?.requieren_atencion || 0,
    bloqueos_activos: summary?.bloqueos_activos || 0,
    esperando_respuesta: summary?.esperando_respuesta || 0,
    vencimientos_proximos: summary?.vencimientos_proximos || 0,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Trabajo Compartido</h2>
          <p className="text-sm text-slate-500 mt-1">Panel de seguimiento operativo para equipos transversales.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ActionBtn icon={Plus} label="Nueva actividad" onClick={() => onOpenModal('actividad')} />
          <ActionBtn icon={FolderPlus} label="Nuevo proyecto" onClick={() => onOpenModal('proyecto')} />
          <ActionBtn icon={AlertTriangle} label="Registrar bloqueo" onClick={() => onOpenModal('bloqueo')} />
          <ActionBtn icon={Send} label="Solicitar actualización" onClick={() => onOpenModal('solicitud')} />
        </div>
      </div>

      {/* KPIs (scoped to selected project if any) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiSimple label="Requieren atención" value={kpis.requieren_atencion} />
        <KpiSimple label="Bloqueos activos" value={kpis.bloqueos_activos} />
        <KpiSimple label="Esperando respuesta" value={kpis.esperando_respuesta} />
        <KpiSimple label="Vencimientos próximos" value={kpis.vencimientos_proximos} sub="Próx. 48h" />
      </div>

      {/* Project filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setSelectedProject(null)}
          className={`px-4 py-2 rounded-lg border text-sm transition-all ${!selectedProject ? 'bg-slate-100 border-slate-300 text-slate-900 font-medium' : 'bg-white border-slate-200 text-slate-500'}`}>
          Todos
        </button>
        {projects.slice(0, 4).map(p => (
          <button key={p.id} onClick={() => setSelectedProject(p.id)}
            className={`px-4 py-2 rounded-lg border text-sm transition-all text-left ${selectedProject === p.id ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900 text-xs">{p.name}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${p.blocks_count > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                {p.blocks_count > 0 ? 'EN RIESGO' : 'EN CONTROL'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{p.open_count} abiertas · {p.blocks_count} bloqueos</div>
          </button>
        ))}
      </div>

      {/* Activities section */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-slate-900 text-sm">Actividades <span className="text-slate-400 font-normal">({filtered.length})</span></h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm w-44 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20" />
            </div>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {[{ id: 'lista', icon: List, label: 'Lista' }, { id: 'tablero', icon: LayoutGrid, label: 'Tablero' }, { id: 'timeline', icon: GitBranch, label: 'Timeline' }].map(v => (
                <button key={v.id} onClick={() => setView(v.id)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${view === v.id ? 'bg-[#1a3a3a] text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                  <v.icon className="w-3 h-3" />{v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === 'lista' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left font-medium">Proyecto</th>
                  <th className="px-4 py-2.5 text-left font-medium">Actividad</th>
                  <th className="px-4 py-2.5 text-left font-medium">Responsable</th>
                  <th className="px-4 py-2.5 text-left font-medium">Prioridad</th>
                  <th className="px-4 py-2.5 text-left font-medium">Vencimiento</th>
                  <th className="px-4 py-2.5 text-left font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(a => (
                  <tr key={a.id} onClick={() => onOpenDetail?.('activity', a)} className="hover:bg-slate-50/50 cursor-pointer">
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">{a.project_name?.toUpperCase() || '—'}</td>
                    <td className="px-4 py-3 text-slate-900">{a.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-[9px] font-semibold">
                          {(a.responsible_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-slate-600">{a.responsible_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${PRIORITY_COLORS[a.priority]}`}>{PRIORITY_LABELS[a.priority]}</span></td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(a.due_date)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <StatusDropdown value={a.status} onChange={(v) => updateActivity(a.id, { status: v })} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan="6" className="px-4 py-10 text-center text-xs text-slate-400">Sin actividades.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {view === 'tablero' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
            {['por_iniciar', 'en_curso', 'en_espera', 'completada'].map(st => {
              const colActivities = filtered.filter(a => a.status === st)
              return (
                <div
                  key={st}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCol(st) }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOverCol(null)
                    const id = parseInt(e.dataTransfer.getData('activityId'))
                    if (!id) return
                    const act = activities.find(a => a.id === id)
                    if (act && act.status !== st) updateActivity(id, { status: st })
                  }}
                  className={`rounded-lg p-3 transition-colors ${dragOverCol === st ? 'bg-[#e8f0f0] ring-2 ring-[#1a3a3a]/30' : 'bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[st]}`} />
                      {STATUS_LABELS[st]}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium">{colActivities.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[40px]">
                    {colActivities.map(a => (
                      <div
                        key={a.id}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData('activityId', String(a.id)); e.dataTransfer.effectAllowed = 'move' }}
                        onClick={() => onOpenDetail?.('activity', a)}
                        className="bg-white border border-slate-200 rounded-lg p-2.5 cursor-pointer hover:border-[#1a3a3a]/30 hover:shadow-sm transition-all"
                      >
                        <p className="text-xs font-medium text-slate-900">{a.name}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{a.project_name || 'Sin proyecto'}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[a.priority]}`}>
                            <span className={`w-1 h-1 rounded-full ${PRIORITY_DOT[a.priority]}`} />
                            {PRIORITY_LABELS[a.priority]}
                          </span>
                          <span className="text-[10px] text-slate-400">{fmtDate(a.due_date)}</span>
                        </div>
                      </div>
                    ))}
                    {colActivities.length === 0 && (
                      <p className="text-[10px] text-slate-300 text-center py-4 italic">
                        {dragOverCol === st ? 'Suelta aqui' : 'Sin actividades'}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {view === 'timeline' && <TimelineView activities={filtered} updateActivity={updateActivity} />}
      </div>

      {/* Bottom blocks + requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Bloqueos críticos</h3>
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{blocks.length}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {blocks.slice(0, 3).map(b => (
              <div
                key={b.id}
                onClick={() => onOpenDetail?.('block', b)}
                className="py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50/50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">{b.project_name?.toUpperCase() || '—'}</p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">{b.description?.substring(0, 80) || 'Sin descripción'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Responsable: {b.responsible_name || '—'}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); resolveBlock(b.id) }}
                  title="Marcar como resuelto"
                  className="flex-shrink-0 w-7 h-7 rounded-lg border border-slate-200 hover:bg-green-50 hover:border-green-300 hover:text-green-600 text-slate-400 flex items-center justify-center transition-all"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ))}
            {blocks.length === 0 && <p className="text-xs text-slate-400 py-3">Sin bloqueos activos.</p>}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-slate-500" /> Esperando respuesta</h3>
            <span className="w-5 h-5 rounded-full bg-slate-300 text-white text-[10px] font-bold flex items-center justify-center">{requests.length}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {requests.slice(0, 3).map(r => (
              <div
                key={r.id}
                onClick={() => onOpenDetail?.('request', r)}
                className="py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50/50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{r.project_name || 'Solicitud'}</p>
                  {r.message && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.message}</p>}
                  <p className="text-[11px] text-slate-400 mt-0.5">Enviado {fmtRelative(r.created_at)} · Para: {r.responsible_name || '—'}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); answerRequest(r.id) }}
                  title="Marcar como respondida"
                  className="flex-shrink-0 w-7 h-7 rounded-lg border border-slate-200 hover:bg-green-50 hover:border-green-300 hover:text-green-600 text-slate-400 flex items-center justify-center transition-all"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ))}
            {requests.length === 0 && <p className="text-xs text-slate-400 py-3">Sin solicitudes.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// STATUS DROPDOWN (used in Lista view)
// ═══════════════════════════════════════════════════════════
const StatusDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[value]}`} />
        <span className="text-slate-700">{STATUS_LABELS[value]}</span>
        <ArrowUpDown className="w-3 h-3 text-slate-300" />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]">
          {Object.entries(STATUS_LABELS).map(([k, label]) => (
            <button
              key={k}
              onClick={() => { onChange(k); setOpen(false) }}
              className={`w-full px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-slate-50 text-left ${k === value ? 'bg-slate-50 font-medium' : ''}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[k]}`} />
              <span className="text-slate-700">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TIMELINE VIEW (simple gantt)
// ═══════════════════════════════════════════════════════════
const TimelineView = ({ activities, updateActivity }) => {
  const DAY_MS = 86400000
  const acts = activities.filter(a => a.due_date)

  if (acts.length === 0) {
    return <div className="p-10 text-center text-xs text-slate-400">Sin actividades con fecha de vencimiento para mostrar en el timeline.</div>
  }

  const allDates = acts.flatMap(a => [a.start_date, a.due_date].filter(Boolean).map(d => new Date(d).getTime()))
  const today = new Date(); today.setHours(0, 0, 0, 0)
  let minDate = new Date(Math.min(...allDates, today.getTime()))
  let maxDate = new Date(Math.max(...allDates, today.getTime()))
  // Pad a bit
  minDate = new Date(minDate.getTime() - 2 * DAY_MS)
  maxDate = new Date(maxDate.getTime() + 2 * DAY_MS)
  const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / DAY_MS))

  const pctFromDate = (d) => {
    const days = (new Date(d).getTime() - minDate.getTime()) / DAY_MS
    return Math.max(0, Math.min(100, (days / totalDays) * 100))
  }

  // Month markers
  const monthMarkers = []
  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  while (cursor <= maxDate) {
    monthMarkers.push(new Date(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }

  // Group by project
  const byProject = {}
  acts.forEach(a => {
    const key = a.project_name || 'Sin proyecto'
    if (!byProject[key]) byProject[key] = []
    byProject[key].push(a)
  })

  const todayPct = pctFromDate(today)

  const BAR_COLOR = {
    por_iniciar: 'bg-slate-400',
    en_curso: 'bg-blue-500',
    en_espera: 'bg-amber-500',
    bloqueada: 'bg-red-500',
    completada: 'bg-green-500',
  }

  return (
    <div className="p-5 overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Month header (mirrors bar layout: w-48 label + flex-1 timeline) */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-48 flex-shrink-0" />
          <div className="flex-1 relative h-7 border-b border-slate-200">
            {monthMarkers.map((m, i) => {
              const left = pctFromDate(m)
              return (
                <div key={i} className="absolute top-0 bottom-0 border-l border-slate-100 flex items-start pl-1" style={{ left: `${left}%` }}>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase whitespace-nowrap">
                    {m.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })}
                  </span>
                </div>
              )
            })}
            <div className="absolute -top-1 bottom-0 z-10 pointer-events-none" style={{ left: `${todayPct}%` }}>
              <div className="w-0.5 h-full bg-red-400" />
              <span className="absolute -top-2 left-1 text-[9px] font-bold text-red-500">HOY</span>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="space-y-5">
          {Object.entries(byProject).map(([project, list]) => (
            <div key={project}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{project}</p>
              <div className="space-y-1.5">
                {list.map(a => {
                  const start = a.start_date || a.due_date
                  const end = a.due_date
                  const left = pctFromDate(start)
                  const right = pctFromDate(end)
                  const width = Math.max(1.5, right - left)
                  return (
                    <div key={a.id} className="flex items-center gap-2 text-xs">
                      <div className="w-48 flex-shrink-0 pr-2 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[a.priority]}`} />
                        <span className="truncate text-slate-700" title={a.name}>{a.name}</span>
                      </div>
                      <div className="flex-1 relative h-6 bg-slate-50 rounded">
                        {/* Today line inside bar area */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-200 pointer-events-none" style={{ left: `${todayPct}%` }} />
                        <div
                          className={`absolute top-0.5 bottom-0.5 rounded ${BAR_COLOR[a.status] || 'bg-slate-400'} opacity-90 hover:opacity-100 transition-opacity flex items-center px-2 overflow-hidden z-[1]`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${a.name} · ${STATUS_LABELS[a.status]} · ${fmtDate(a.start_date)} -> ${fmtDate(a.due_date)}`}
                        >
                          <span className="text-[10px] text-white font-medium whitespace-nowrap">
                            {fmtDate(end)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-4 flex-wrap text-[10px] text-slate-500">
          {Object.entries(STATUS_LABELS).map(([k, label]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded ${BAR_COLOR[k]}`} />
              {label}
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="w-0.5 h-3 bg-red-400" />
            Hoy
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MI AGENDA TAB
// ═══════════════════════════════════════════════════════════
const AgendaTab = ({ token, onOpenModal, refreshKey }) => {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('semana')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('lista')

  useEffect(() => {
    fetch(`/api/operacion/personal?filter=${filter}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setItems(d.items || []))
  }, [token, refreshKey, filter])

  const filtered = items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mi agenda</h2>
          <p className="text-sm text-slate-500 mt-1">Pendientes, recordatorios y acciones personales de la operación.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ActionBtn icon={Plus} label="Nueva actividad" onClick={() => onOpenModal('personal')} />
          <ActionBtn icon={Bell} label="Nuevo recordatorio" onClick={() => onOpenModal('recordatorio')} />
          <ActionBtn icon={Repeat} label="Convertir en compartida" onClick={() => {
            const linkable = items.filter(i => i.type === 'personal')
            if (linkable.length === 0) { alert('No tienes actividades personales para convertir.'); return }
            onOpenModal({ type: 'convertir', item: null })
          }} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiSimple label="Pendientes de hoy" value={items.filter(i => i.status === 'pendiente').length} />
        <KpiSimple label="Recordatorios activos" value={0} />
        <KpiSimple label="Esperando respuesta" value={0} />
        <KpiSimple label="Vencimientos próximos" value={items.length} />
      </div>

      {/* Filters + view */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'hoy', label: 'Hoy' }, { id: 'semana', label: 'Esta semana' },
            { id: 'pendientes', label: 'Pendientes' }, { id: 'recordatorios', label: 'Recordatorios' },
            { id: 'seguimiento', label: 'Seguimiento' }, { id: 'vinculadas', label: 'Vinculadas' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter === f.id ? 'bg-[#1a3a3a] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm w-44 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20" />
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {[{ id: 'lista', icon: List }, { id: 'calendario', icon: CalendarClock }, { id: 'timeline', icon: GitBranch }].map(v => (
              <button key={v.id} onClick={() => setView(v.id)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${view === v.id ? 'bg-[#1a3a3a] text-white' : 'text-slate-500'}`}>
                <v.icon className="w-3 h-3" />{v.id.charAt(0).toUpperCase() + v.id.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left font-medium">Tipo</th>
                <th className="px-4 py-2.5 text-left font-medium">Actividad</th>
                <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
                <th className="px-4 py-2.5 text-left font-medium">Hora</th>
                <th className="px-4 py-2.5 text-left font-medium">Prioridad</th>
                <th className="px-4 py-2.5 text-left font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(i => (
                <tr key={i.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${
                      i.type === 'personal' ? 'bg-[#e8f0f0] text-[#1a3a3a]' :
                      i.type === 'vinculada' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                    }`}>{i.type === 'personal' ? '👤' : i.type === 'vinculada' ? '🔗' : '🔔'} {i.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-900 font-medium">{i.name}</p>
                    {i.project_name && <p className="text-xs text-slate-400">{i.project_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(i.date)}</td>
                  <td className="px-4 py-3 text-slate-600">{i.time?.substring(0, 5) || '—'}</td>
                  <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${PRIORITY_COLORS[i.priority]}`}>{PRIORITY_LABELS[i.priority]}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs"><span className={`w-1.5 h-1.5 rounded-full ${i.status === 'pendiente' ? 'bg-amber-500' : 'bg-green-500'}`} />{i.status === 'pendiente' ? 'Pendiente' : 'Completada'}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="6" className="px-4 py-10 text-center text-xs text-slate-400">Sin elementos.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">{filtered.length} de {items.length} elementos</div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// HISTORIAL TAB
// ═══════════════════════════════════════════════════════════
const HistorialTab = ({ token, refreshKey }) => {
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('todo')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`/api/operacion/history?type=${filter === 'todo' ? '' : filter}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setEvents(d.events || []))
    fetch('/api/operacion/history/stats', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setStats)
  }, [token, refreshKey, filter])

  const critical = events.filter(e => e.severity === 'critico').slice(0, 3)
  const filtered = events.filter(e => !search || e.entity_name?.toLowerCase().includes(search.toLowerCase()) || e.user_name?.toLowerCase().includes(search.toLowerCase()))

  const FILTERS = [
    { id: 'todo', label: 'Todo' }, { id: 'activity', label: 'Actividades' },
    { id: 'block', label: 'Bloqueos' }, { id: 'reminder', label: 'Recordatorios' },
    { id: 'request', label: 'Solicitudes' },
  ]

  const getIcon = (e) => {
    if (e.entity_type === 'block') return { icon: Ban, bg: 'bg-red-50 text-red-500' }
    if (e.entity_type === 'request') return { icon: Send, bg: 'bg-[#e8f0f0] text-[#1a3a3a]' }
    if (e.action === 'status_change') return { icon: CheckCircle2, bg: 'bg-blue-50 text-blue-500' }
    if (e.action === 'priority_change') return { icon: ArrowUpDown, bg: 'bg-blue-50 text-blue-500' }
    return { icon: CheckCircle2, bg: 'bg-blue-50 text-blue-500' }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Historial</h2>
        <p className="text-sm text-slate-500 mt-1">Trazabilidad reciente del seguimiento operativo y las actualizaciones del equipo</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiSimple icon={RefreshCw} label="Actualizaciones recientes" value={stats?.actualizaciones || 0} color="bg-blue-50 text-blue-500" />
        <KpiSimple icon={Ban} label="Bloqueos registrados" value={stats?.bloqueos || 0} color="bg-red-50 text-red-500" />
        <KpiSimple icon={ArrowUpDown} label="Cambios de estado" value={stats?.cambios || 0} color="bg-slate-100 text-slate-500" />
        <KpiSimple icon={Send} label="Solicitudes enviadas" value={stats?.solicitudes || 0} color="bg-[#e8f0f0] text-[#1a3a3a]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${filter === f.id ? 'bg-[#1a3a3a] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar actividad o persona..." className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20" />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {filtered.map(e => {
              const { icon: Icon, bg } = getIcon(e)
              return (
                <div key={e.id} className="p-4 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}><Icon className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900">{e.entity_name || e.description}</p>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${e.severity === 'critico' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                        {e.severity === 'critico' ? 'Crítico' : 'Normal'}
                      </span>
                    </div>
                    {e.description && <p className="text-xs text-slate-500 mt-0.5">{e.description}</p>}
                    <p className="text-xs text-slate-400 mt-1">{e.user_name || 'Sistema'} · {fmtRelative(e.created_at)}</p>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && <div className="p-10 text-center text-xs text-slate-400">Sin eventos.</div>}
          </div>
        </div>

        <div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Eventos críticos recientes</h3>
            <div className="divide-y divide-slate-100">
              {critical.length === 0 ? <p className="text-xs text-slate-400 py-3">Sin eventos críticos.</p> :
                critical.map(e => (
                  <div key={e.id} className="py-3">
                    <p className="text-sm font-medium text-slate-900">{e.entity_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmtRelative(e.created_at)}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════
const ActionBtn = ({ icon: Icon, label, onClick }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all">
    <Icon className="w-3.5 h-3.5" />{label}
  </button>
)

const SidePanel = ({ title, children }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5">
    <h3 className="font-semibold text-slate-900 text-sm mb-3">{title}</h3>
    <div className="divide-y divide-slate-100">{children}</div>
  </div>
)

const KpiSimple = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {Icon && <div className={`w-8 h-8 rounded-lg ${color || 'bg-slate-100 text-slate-500'} flex items-center justify-center`}><Icon className="w-4 h-4" /></div>}
    </div>
  </div>
)

// ═══════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════
const ModalShell = ({ title, subtitle, onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative bg-white rounded-xl border border-slate-200 shadow-xl w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
      <div className="p-6 border-b border-slate-100 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
)

const inputCls = "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 transition-all"
const labelCls = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"

const PriorityPicker = ({ value, onChange, extended = false }) => {
  const opts = extended ? ['baja', 'media', 'alta', 'critica'] : ['baja', 'media', 'alta']
  return (
    <div className="grid grid-cols-4 gap-0 border border-slate-200 rounded-lg overflow-hidden">
      {opts.map(p => (
        <button key={p} type="button" onClick={() => onChange(p)}
          className={`py-2 text-xs font-medium capitalize transition-all ${value === p ? 'bg-amber-50 text-amber-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
          {p}
        </button>
      ))}
    </div>
  )
}

// Nueva actividad (compartida)
const ActivityModal = ({ token, users, projects, onClose, onSuccess }) => {
  const [form, setForm] = useState({ projectId: '', name: '', responsibleId: '', startDate: '', dueDate: '', priority: 'media' })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.name || !form.projectId || !form.responsibleId || !form.dueDate) return alert('Completa los campos requeridos')
    setSaving(true)
    const res = await fetch('/api/operacion/activities', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) })
    setSaving(false)
    if (res.ok) { onSuccess(); onClose() } else alert('Error al crear')
  }

  return (
    <ModalShell title="Nueva actividad" subtitle="Cree una actividad operativa dentro de un proyecto en curso." onClose={onClose} wide>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div><label className={labelCls}>Proyecto *</label>
            <Select
              value={form.projectId}
              onChange={(v) => setForm({ ...form, projectId: v })}
              options={projects.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Seleccionar proyecto"
              searchable
            />
          </div>
          <div><label className={labelCls}>Nombre de la actividad *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Validación fiscal Perú" className={inputCls} />
          </div>
          <div><label className={labelCls}>Responsable *</label>
            <Select
              value={form.responsibleId}
              onChange={(v) => setForm({ ...form, responsibleId: v })}
              options={users.map(u => ({ value: u.id, label: u.name }))}
              placeholder="Seleccionar responsable"
              searchable
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Fecha inicio</label>
              <DatePicker value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
            </div>
            <div><label className={labelCls}>Fecha límite *</label>
              <DatePicker value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
            </div>
          </div>
          <div><label className={labelCls}>Prioridad</label><PriorityPicker value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} extended /></div>
        </div>
        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase mb-3">Resumen</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Prioridad</span><span className="font-medium capitalize">{form.priority}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Estado</span><span className="font-medium">Por iniciar</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tipo</span><span className="font-medium">Operativa</span></div>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase mb-3">Qué ocurrirá</p>
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex gap-2"><ChevronRight className="w-3 h-3 mt-0.5" />Aparecerá en Trabajo compartido</li>
              <li className="flex gap-2"><ChevronRight className="w-3 h-3 mt-0.5" />Visible en Tablero y Timeline</li>
              <li className="flex gap-2"><ChevronRight className="w-3 h-3 mt-0.5" />Disponible para seguimiento</li>
              <li className="flex gap-2"><ChevronRight className="w-3 h-3 mt-0.5" />El responsable podrá ser notificado</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancelar</button>
        <button className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Guardar borrador</button>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#1a3a3a] text-white rounded-lg text-sm font-semibold hover:bg-[#224a4a] disabled:opacity-50">
          <Plus className="w-4 h-4" />{saving ? 'Creando...' : 'Crear actividad'}
        </button>
      </div>
    </ModalShell>
  )
}

// Nuevo proyecto
const ProjectModal = ({ token, users, onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: '', area: '', responsibleId: '', objective: '', closeDate: '' })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.name) return alert('Nombre requerido')
    setSaving(true)
    const res = await fetch('/api/operacion/projects', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) })
    setSaving(false)
    if (res.ok) { onSuccess(); onClose() } else alert('Error')
  }

  return (
    <ModalShell title="Nuevo proyecto" subtitle="Cree un nuevo proyecto operativo dentro del workspace." onClose={onClose}>
      <div className="space-y-4">
        <div><label className={labelCls}>Nombre del proyecto</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Expansión Regional 2027" className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Área</label>
            <Select
              value={form.area}
              onChange={(v) => setForm({ ...form, area: v })}
              options={['Operaciones', 'Tecnología', 'Ventas', 'Marketing', 'Legal', 'Recursos Humanos', 'Finanzas'].map(a => ({ value: a, label: a }))}
              placeholder="Seleccionar área"
            />
          </div>
          <div><label className={labelCls}>Responsable principal</label>
            <Select
              value={form.responsibleId}
              onChange={(v) => setForm({ ...form, responsibleId: v })}
              options={users.map(u => ({ value: u.id, label: u.name }))}
              placeholder="Seleccionar responsable"
              searchable
            />
          </div>
        </div>
        <div><label className={labelCls}>Objetivo</label><textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} rows={3} placeholder="Describa el objetivo principal..." className={inputCls} /></div>
        <div><label className={labelCls}>Fecha estimada de cierre</label>
          <DatePicker value={form.closeDate} onChange={(v) => setForm({ ...form, closeDate: v })} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancelar</button>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#1a3a3a] text-white rounded-lg text-sm font-semibold hover:bg-[#224a4a] disabled:opacity-50">
          <FolderPlus className="w-4 h-4" />{saving ? 'Creando...' : 'Crear proyecto'}
        </button>
      </div>
    </ModalShell>
  )
}

// Registrar bloqueo
const BlockModal = ({ token, users, projects, onClose, onSuccess }) => {
  const [form, setForm] = useState({ projectId: '', activityId: '', responsibleId: '', urgency: 'media', description: '' })
  const [activities, setActivities] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (form.projectId) fetch(`/api/operacion/activities?projectId=${form.projectId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setActivities(d.activities || []))
  }, [form.projectId, token])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/operacion/blocks', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) })
    setSaving(false)
    if (res.ok) { onSuccess(); onClose() } else alert('Error')
  }

  return (
    <ModalShell title="Registrar bloqueo" subtitle="Documente un bloqueo operativo para que el equipo pueda darle seguimiento." onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Proyecto</label>
            <Select
              value={form.projectId}
              onChange={(v) => setForm({ ...form, projectId: v })}
              options={projects.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Seleccionar proyecto"
              searchable
            />
          </div>
          <div><label className={labelCls}>Actividad relacionada</label>
            <Select
              value={form.activityId}
              onChange={(v) => setForm({ ...form, activityId: v })}
              options={activities.map(a => ({ value: a.id, label: a.name }))}
              placeholder="Seleccionar actividad"
              disabled={!form.projectId}
            />
          </div>
          <div><label className={labelCls}>Responsable involucrado</label>
            <Select
              value={form.responsibleId}
              onChange={(v) => setForm({ ...form, responsibleId: v })}
              options={users.map(u => ({ value: u.id, label: u.name }))}
              placeholder="Seleccionar responsable"
              searchable
            />
          </div>
          <div><label className={labelCls}>Nivel de urgencia</label>
            <Select
              value={form.urgency}
              onChange={(v) => setForm({ ...form, urgency: v })}
              options={[{ value: 'baja', label: 'Baja' }, { value: 'media', label: 'Media' }, { value: 'alta', label: 'Alta' }, { value: 'critica', label: 'Crítica' }]}
            />
          </div>
        </div>
        <div><label className={labelCls}>Descripción del bloqueo</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Describa el bloqueo, su impacto y contexto relevante..." className={inputCls} /></div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancelar</button>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
          <AlertTriangle className="w-4 h-4" />{saving ? 'Registrando...' : 'Registrar bloqueo'}
        </button>
      </div>
    </ModalShell>
  )
}

// Solicitar actualización
const RequestModal = ({ token, users, projects, onClose, onSuccess }) => {
  const [form, setForm] = useState({ projectId: '', activityId: '', responsibleId: '', message: '' })
  const [activities, setActivities] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (form.projectId) fetch(`/api/operacion/activities?projectId=${form.projectId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setActivities(d.activities || []))
  }, [form.projectId, token])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/operacion/requests', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) })
    setSaving(false)
    if (res.ok) { onSuccess(); onClose() } else alert('Error')
  }

  return (
    <ModalShell title="Solicitar actualización" subtitle="Solicite seguimiento o respuesta a un responsable del equipo." onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Proyecto</label>
            <Select
              value={form.projectId}
              onChange={(v) => setForm({ ...form, projectId: v })}
              options={projects.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Seleccionar proyecto"
              searchable
            />
          </div>
          <div><label className={labelCls}>Actividad</label>
            <Select
              value={form.activityId}
              onChange={(v) => setForm({ ...form, activityId: v })}
              options={activities.map(a => ({ value: a.id, label: a.name }))}
              placeholder="Seleccionar actividad"
              disabled={!form.projectId}
            />
          </div>
        </div>
        <div><label className={labelCls}>Responsable</label>
          <Select
            value={form.responsibleId}
            onChange={(v) => setForm({ ...form, responsibleId: v })}
            options={users.map(u => ({ value: u.id, label: u.name }))}
            placeholder="Seleccionar responsable"
            searchable
          />
        </div>
        <div><label className={labelCls}>Mensaje o solicitud</label><textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} placeholder="Escriba qué información necesita o qué seguimiento requiere..." className={inputCls} /></div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancelar</button>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#1a3a3a] text-white rounded-lg text-sm font-semibold hover:bg-[#224a4a] disabled:opacity-50">
          <Send className="w-4 h-4" />{saving ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </div>
    </ModalShell>
  )
}

// Nueva actividad personal
const PersonalModal = ({ token, onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: '', date: '', time: '', priority: 'media', type: 'personal', description: '' })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.name) return alert('Nombre requerido')
    setSaving(true)
    const res = await fetch('/api/operacion/personal', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) })
    setSaving(false)
    if (res.ok) { onSuccess(); onClose() } else alert('Error')
  }

  return (
    <ModalShell title="Nueva actividad personal" subtitle="Agregue una actividad a su agenda personal." onClose={onClose}>
      <div className="space-y-4">
        <div><label className={labelCls}>Nombre de la actividad *</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Revisar propuesta de presupuesto" className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Fecha *</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Hora</label><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Prioridad *</label><PriorityPicker value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} /></div>
        <div><label className={labelCls}>Tipo</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
            <option value="personal">Personal</option><option value="seguimiento">Seguimiento</option>
          </select>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancelar</button>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#1a3a3a] text-white rounded-lg text-sm font-semibold hover:bg-[#224a4a] disabled:opacity-50">
          {saving ? 'Creando...' : 'Crear actividad'}
        </button>
      </div>
    </ModalShell>
  )
}

// Nuevo recordatorio
const ReminderModal = ({ token, onClose, onSuccess }) => {
  const [form, setForm] = useState({ title: '', date: '', time: '', repeatRule: 'no_repetir', description: '' })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.title) return alert('Título requerido')
    setSaving(true)
    const res = await fetch('/api/operacion/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) })
    setSaving(false)
    if (res.ok) { onSuccess(); onClose() } else alert('Error')
  }

  return (
    <ModalShell title="Nuevo recordatorio" subtitle="Programe un recordatorio para no perder de vista tareas importantes." onClose={onClose}>
      <div className="space-y-4">
        <div><label className={labelCls}>Título del recordatorio *</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Enviar reporte semanal" className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Fecha *</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Hora *</label><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Repetir</label>
          <select value={form.repeatRule} onChange={(e) => setForm({ ...form, repeatRule: e.target.value })} className={inputCls}>
            <option value="no_repetir">No repetir</option><option value="diario">Diario</option><option value="semanal">Semanal</option><option value="mensual">Mensual</option>
          </select>
        </div>
        <div><label className={labelCls}>Descripción</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Notas opcionales..." className={inputCls} /></div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancelar</button>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#1a3a3a] text-white rounded-lg text-sm font-semibold hover:bg-[#224a4a] disabled:opacity-50">
          {saving ? 'Creando...' : 'Crear recordatorio'}
        </button>
      </div>
    </ModalShell>
  )
}

// Convertir en compartida
const ConvertModal = ({ token, users, projects, item, onClose, onSuccess }) => {
  const [form, setForm] = useState({ itemId: '', projectId: '', responsibleId: '', priority: 'media' })
  const [personalItems, setPersonalItems] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/operacion/personal', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => {
      setPersonalItems((d.items || []).filter(i => i.type === 'personal'))
    })
  }, [token])

  const save = async () => {
    if (!form.itemId || !form.projectId) return alert('Campos requeridos')
    setSaving(true)
    const res = await fetch(`/api/operacion/personal/${form.itemId}/convert`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ projectId: form.projectId, responsibleId: form.responsibleId, priority: form.priority }),
    })
    setSaving(false)
    if (res.ok) { onSuccess(); onClose() } else alert('Error')
  }

  return (
    <ModalShell title="Convertir en actividad compartida" subtitle="Vincule una actividad personal a un proyecto y asígnela a un responsable." onClose={onClose}>
      <div className="space-y-4">
        <div><label className={labelCls}>Actividad a convertir *</label>
          <select value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })} className={inputCls}>
            <option value="">Seleccionar actividad</option>
            {personalItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Proyecto destino *</label>
          <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className={inputCls}>
            <option value="">Seleccionar proyecto</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Responsable *</label>
          <select value={form.responsibleId} onChange={(e) => setForm({ ...form, responsibleId: e.target.value })} className={inputCls}>
            <option value="">Seleccionar responsable</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Prioridad</label><PriorityPicker value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} /></div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancelar</button>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#1a3a3a] text-white rounded-lg text-sm font-semibold hover:bg-[#224a4a] disabled:opacity-50">
          {saving ? 'Convirtiendo...' : 'Convertir'}
        </button>
      </div>
    </ModalShell>
  )
}

// ═══════════════════════════════════════════════════════════
// DETAIL VIEWS (full-page, replace tabs)
// ═══════════════════════════════════════════════════════════

const BackLink = ({ onBack }) => (
  <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
    <ArrowLeft className="w-4 h-4" />
    Volver a Trabajo compartido
  </button>
)

const HistoryTimeline = ({ events, loading }) => {
  const getIcon = (e) => {
    if (e.entity_type === 'block') return Ban
    if (e.entity_type === 'request') return Send
    if (e.action === 'status_change') return ArrowUpDown
    if (e.action === 'resolved') return CheckCircle2
    if (e.action === 'created') return Plus
    return Clock
  }
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-[#1a3a3a]" /> Historial de seguimiento
      </h3>
      {loading ? (
        <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-5 w-5 border-2 border-[#1a3a3a] border-t-transparent" /></div>
      ) : events.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">Sin eventos registrados.</p>
      ) : (
        <ol className="relative">
          {events.map((e, i) => {
            const Icon = getIcon(e)
            const isLast = i === events.length - 1
            return (
              <li key={e.id} className="relative pl-10 pb-4">
                {!isLast && <span className="absolute left-4 top-8 bottom-0 w-px bg-slate-200" />}
                <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-[#e8f0f0] flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-[#1a3a3a]" />
                </div>
                <p className="text-sm text-slate-900 font-medium">{e.description || e.action}</p>
                <p className="text-xs text-slate-400 mt-0.5">{fmtRelative(e.created_at)} · {e.user_name || 'Sistema'}</p>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

const MetaItem = ({ icon: Icon, label, value, onClick }) => (
  <div className={`flex items-start gap-3 ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`} onClick={onClick}>
    <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900 truncate">{value || '—'}</p>
    </div>
  </div>
)

// ─── ACTIVITY DETAIL ───
const ActivityDetail = ({ token, data, onBack, onOpenDetail }) => {
  const [activity, setActivity] = useState(data)
  const [events, setEvents] = useState([])
  const [blocks, setBlocks] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const jsonHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const fetchAll = () => {
    setLoading(true)
    const h = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch(`/api/operacion/history?type=activity&entityId=${data.id}`, { headers: h }).then(r => r.json()).then(d => setEvents(d.events || [])),
      fetch('/api/operacion/blocks', { headers: h }).then(r => r.json()).then(d => setBlocks((d.blocks || []).filter(b => b.activity_id === data.id))),
      fetch('/api/operacion/requests', { headers: h }).then(r => r.json()).then(d => setRequests((d.requests || []).filter(r => r.activity_id === data.id))),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [data.id])

  const patch = async (updates) => {
    setSaving(true)
    const prev = activity
    setActivity({ ...activity, ...updates })
    try {
      const res = await fetch(`/api/operacion/activities/${data.id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(updates) })
      if (res.ok) fetchAll()
      else setActivity(prev)
    } catch (err) { setActivity(prev) }
    setSaving(false)
  }

  const statusStyle = STATUS_COLORS[activity.status] || 'bg-slate-100 text-slate-600'
  const statusDot = STATUS_DOT[activity.status] || 'bg-slate-400'

  return (
    <div className="space-y-5 max-w-4xl">
      <BackLink onBack={onBack} />

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900">{activity.name}</h1>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
            {STATUS_LABELS[activity.status]}
          </span>
          <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${PRIORITY_COLORS[activity.priority]}`}>{PRIORITY_LABELS[activity.priority]}</span>
        </div>
        {activity.project_name && (
          <p className="flex items-center gap-1.5 text-sm text-slate-500 mt-1.5">
            <Folder className="w-3.5 h-3.5" />{activity.project_name}
          </p>
        )}
      </div>

      {/* Metadata + description */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <MetaItem icon={UserIcon} label="Responsable" value={activity.responsible_name} />
          <MetaItem icon={CalendarClock} label="Vencimiento" value={fmtDate(activity.due_date)} />
          <MetaItem icon={Clock} label="Fecha inicio" value={fmtDate(activity.start_date)} />
          <MetaItem icon={ArrowUpDown} label="Estado" value={STATUS_LABELS[activity.status]} />
        </div>
        <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
          <span className="text-xs text-slate-500">Cambiar estado:</span>
          <StatusDropdown value={activity.status} onChange={(v) => patch({ status: v })} />
        </div>
        {activity.description && (
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-[#1a3a3a]" /> Descripcion
            </h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{activity.description}</p>
          </div>
        )}
      </div>

      {/* Related blocks */}
      {blocks.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-3">
            <Ban className="w-4 h-4 text-red-500" /> Bloqueos relacionados <span className="text-slate-400 font-normal">({blocks.length})</span>
          </h3>
          <div className="divide-y divide-slate-100">
            {blocks.map(b => (
              <div key={b.id} onClick={() => onOpenDetail('block', b)} className="py-3 cursor-pointer hover:bg-slate-50/50 -mx-2 px-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${b.resolved ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{b.resolved ? 'RESUELTO' : b.urgency?.toUpperCase() || 'ACTIVO'}</span>
                  <p className="text-sm font-medium text-slate-900 truncate">{b.description?.substring(0, 80) || 'Sin descripcion'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related requests */}
      {requests.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-3">
            <Send className="w-4 h-4 text-[#1a3a3a]" /> Solicitudes relacionadas <span className="text-slate-400 font-normal">({requests.length})</span>
          </h3>
          <div className="divide-y divide-slate-100">
            {requests.map(r => (
              <div key={r.id} onClick={() => onOpenDetail('request', r)} className="py-3 cursor-pointer hover:bg-slate-50/50 -mx-2 px-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${r.status === 'respondida' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{r.status?.toUpperCase() || 'PENDIENTE'}</span>
                  <p className="text-sm text-slate-900 truncate">{r.message?.substring(0, 80) || 'Sin mensaje'}</p>
                </div>
                <p className="text-xs text-slate-400 mt-1">Para: {r.responsible_name || '—'} · {fmtRelative(r.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <HistoryTimeline events={events} loading={loading} />
    </div>
  )
}

// ─── BLOCK DETAIL ───
const BlockDetail = ({ token, data, onBack, onOpenDetail }) => {
  const [block, setBlock] = useState(data)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const jsonHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => {
    setLoading(true)
    fetch(`/api/operacion/history?type=block&entityId=${data.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setEvents(d.events || [])).finally(() => setLoading(false))
  }, [data.id])

  const toggleResolved = async () => {
    setSaving(true)
    const next = !block.resolved
    setBlock({ ...block, resolved: next })
    try {
      const res = await fetch(`/api/operacion/blocks/${data.id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ resolved: next }) })
      if (res.ok) {
        // Refetch events
        const h = await fetch(`/api/operacion/history?type=block&entityId=${data.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
        setEvents(h.events || [])
      }
    } catch (err) { setBlock({ ...block, resolved: !next }) }
    setSaving(false)
  }

  const URGENCY_STYLE = {
    critica: { label: 'CRÍTICA', cls: 'bg-red-100 text-red-700' },
    alta: { label: 'ALTA', cls: 'bg-red-50 text-red-600' },
    media: { label: 'MEDIA', cls: 'bg-amber-50 text-amber-600' },
    baja: { label: 'BAJA', cls: 'bg-slate-100 text-slate-600' },
  }
  const u = URGENCY_STYLE[block.urgency] || URGENCY_STYLE.media

  return (
    <div className="space-y-5 max-w-4xl">
      <BackLink onBack={onBack} />

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          {block.project_name || 'Bloqueo'}
        </p>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{block.description?.split('\n')[0]?.substring(0, 80) || 'Bloqueo sin título'}</h1>
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${block.resolved ? 'bg-green-50 text-green-700' : u.cls}`}>
              {block.resolved ? 'RESUELTO' : u.label}
            </span>
          </div>
          <button
            onClick={toggleResolved}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${block.resolved
              ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
              : 'border-transparent bg-green-600 text-white hover:bg-green-700'
              } ${saving ? 'opacity-50' : ''}`}
          >
            <Check className="w-4 h-4" />
            {block.resolved ? 'Reabrir' : 'Marcar resuelto'}
          </button>
        </div>
        <p className="text-sm text-slate-500 mt-1.5">Detalle del bloqueo operativo registrado en el equipo.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <MetaItem icon={FileText} label="Actividad" value={block.activity_name} />
          <MetaItem icon={UserIcon} label="Responsable" value={block.responsible_name} />
          <MetaItem icon={Clock} label="Registrado" value={fmtRelative(block.created_at)} />
          <MetaItem icon={Folder} label="Proyecto" value={block.project_name} />
        </div>
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Descripcion del bloqueo</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{block.description || 'Sin descripcion'}</p>
        </div>
      </div>

      <HistoryTimeline events={events} loading={loading} />
    </div>
  )
}

// ─── REQUEST DETAIL ───
const RequestDetail = ({ token, data, onBack, onOpenDetail }) => {
  const [request, setRequest] = useState(data)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const jsonHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => {
    setLoading(true)
    fetch(`/api/operacion/history?type=request&entityId=${data.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setEvents(d.events || [])).finally(() => setLoading(false))
  }, [data.id])

  const markAnswered = async () => {
    setSaving(true)
    setRequest({ ...request, status: 'respondida' })
    try {
      await fetch(`/api/operacion/requests/${data.id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ status: 'respondida' }) })
      const h = await fetch(`/api/operacion/history?type=request&entityId=${data.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
      setEvents(h.events || [])
    } catch (err) { setRequest({ ...request, status: 'pendiente' }) }
    setSaving(false)
  }

  const isPending = request.status === 'pendiente' || !request.status
  const statusChip = isPending
    ? { label: 'PENDIENTE', cls: 'bg-amber-50 text-amber-700' }
    : { label: 'RESPONDIDA', cls: 'bg-green-50 text-green-700' }

  return (
    <div className="space-y-5 max-w-4xl">
      <BackLink onBack={onBack} />

      <div>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{request.project_name || 'Solicitud'}</h1>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusChip.cls}`}>
              {statusChip.label}
            </span>
          </div>
          {isPending && (
            <button
              onClick={markAnswered}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#1a3a3a] text-white hover:bg-[#224a4a] transition-all ${saving ? 'opacity-50' : ''}`}
            >
              <Check className="w-4 h-4" />
              Marcar como respondida
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1.5">Detalle de la solicitud de actualizacion enviada al equipo.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <MetaItem icon={FileText} label="Actividad" value={request.activity_name} />
          <MetaItem icon={UserIcon} label="Responsable" value={request.responsible_name} />
          <MetaItem icon={Clock} label="Fecha de solicitud" value={fmtRelative(request.created_at)} />
          <MetaItem icon={Folder} label="Proyecto" value={request.project_name} />
        </div>
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Mensaje de la solicitud</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{request.message || 'Sin mensaje'}</p>
        </div>
        {request.sender_name && (
          <p className="text-xs text-slate-400">Enviada por: <span className="font-medium text-slate-600">{request.sender_name}</span></p>
        )}
      </div>

      <HistoryTimeline events={events} loading={loading} />
    </div>
  )
}

export default OperacionPage
