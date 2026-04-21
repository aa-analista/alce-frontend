import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  LayoutGrid, SlidersHorizontal, Users, Check, X as XIcon,
  BookOpen, FileText, Target, MessageSquare, Bot
} from 'lucide-react'

// Per-agent display metadata (category + icon for header)
const AGENT_META = {
  agente: { category: 'Con integraciones', Icon: MessageSquare, params: { idioma: 'Español', tono: 'Profesional', fuente: 'Documentos internos', respuesta: '500 palabras' } },
  documentos: { category: 'Con archivos', Icon: FileText, params: { idioma: 'Español', tono: 'Formal', fuente: 'Plantillas internas', respuesta: '1000 palabras' } },
  accountability: { category: 'Con prompt', Icon: Target, params: { idioma: 'Español', tono: 'Directo', fuente: 'Reglas del equipo', respuesta: '300 palabras' } },
  conocimiento: { category: 'Con base de datos', Icon: BookOpen, params: { idioma: 'Español', tono: 'Profesional', fuente: 'Base de conocimiento', respuesta: '500 palabras' } },
}

const ADMIN_TABS = [
  { id: 'resumen', label: 'Resumen', icon: LayoutGrid },
  { id: 'config', label: 'Configuracion', icon: SlidersHorizontal },
  { id: 'asign', label: 'Asignacion', icon: Users },
]
const ADMIN_IDS = ADMIN_TABS.map(t => t.id)

const AgentAdminPanel = ({
  moduleId,
  extraTabs = [],
  activeTab: activeTabProp,
  onTabChange,
  defaultTab,
  children,
}) => {
  const { token, user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const isControlled = activeTabProp !== undefined
  const [internalTab, setInternalTab] = useState(defaultTab || 'resumen')
  const tab = isControlled ? activeTabProp : internalTab
  const setTab = (id) => {
    if (isControlled) onTabChange?.(id)
    else setInternalTab(id)
  }
  const [agent, setAgent] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [adminOnly, setAdminOnly] = useState(false)

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return }
    Promise.all([fetchAgent(), fetchUsers()]).then(() => setLoading(false))
  }, [moduleId])

  const fetchAgent = async () => {
    try {
      const res = await fetch('/api/modules/org', { headers })
      if (res.ok) {
        const data = await res.json()
        setAgent(data.modules.find(m => m.id === moduleId) || null)
      }
    } catch (err) { console.error(err) }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers })
      if (res.ok) { const data = await res.json(); setUsers(data.users || []) }
    } catch (err) { console.error(err) }
  }

  const toggleActive = async () => {
    if (!agent) return
    setToggling(true)
    try {
      const res = await fetch('/api/modules/org', {
        method: 'PUT', headers,
        body: JSON.stringify({ moduleId, active: !agent.active })
      })
      if (res.ok) setAgent({ ...agent, active: !agent.active })
    } catch (err) { console.error(err) }
    setToggling(false)
  }

  const toggleUserAssignment = async (userId, currentlyAssigned) => {
    try {
      await fetch(`/api/modules/user/${userId}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ moduleId, assigned: !currentlyAssigned })
      })
      setUsers(users.map(u => u.id === userId ? {
        ...u,
        modules: currentlyAssigned
          ? (u.modules || []).filter(m => m !== moduleId)
          : [...(u.modules || []), moduleId]
      } : u))
    } catch (err) { console.error(err) }
  }

  if (!isAdmin) return <>{children}</>

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex justify-center">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#1a3a3a] border-t-transparent" />
      </div>
    )
  }

  if (!agent) return <>{children}</>

  const allTabs = [...ADMIN_TABS, ...extraTabs]
  const isAdminTabActive = ADMIN_IDS.includes(tab)

  const meta = AGENT_META[moduleId] || { category: 'General', Icon: Bot, params: { idioma: 'Español', tono: 'Profesional', fuente: 'Documentos internos', respuesta: '500 palabras' } }
  const { Icon, category, params } = meta
  const assignedUsers = users.filter(u => (u.modules || []).includes(moduleId))
  const assignedCount = assignedUsers.length

  const status = !agent.active ? 'inactive' : (assignedCount === 0 ? 'needs-config' : 'active')
  const STATUS = {
    active: { label: 'Activo', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    inactive: { label: 'Inactivo', cls: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
    'needs-config': { label: 'Requiere configuracion', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  }
  const statusMeta = STATUS[status]

  return (
    <div className="space-y-5">
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[#e8f0f0] flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-[#1a3a3a]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900">Administracion del agente</h3>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusMeta.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                {statusMeta.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Habilite, configure y asigne este agente a su equipo.</p>
          </div>
        </div>
        <button
          onClick={toggleActive}
          disabled={toggling}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${agent.active
            ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
            : 'border-transparent bg-[#1a3a3a] text-white hover:bg-[#224a4a]'
            } ${toggling ? 'opacity-50' : ''}`}
        >
          {agent.active ? 'Desactivar' : 'Activar'}
        </button>
      </div>

      {/* Tabs */}
      <div className="px-5 border-b border-slate-100 flex gap-6 overflow-x-auto">
        {allTabs.map(t => {
          const TIcon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 py-3 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${active
                ? 'border-[#1a3a3a] text-slate-900 font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              <TIcon className="w-4 h-4" />
              {t.label}
              {t.badge > 0 && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${active ? 'bg-[#e8f0f0] text-[#1a3a3a]' : 'bg-slate-100 text-slate-500'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {isAdminTabActive && (
      <div className="p-5">
        {tab === 'resumen' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <InfoCard label="Estado" value={statusMeta.label} />
              <InfoCard label="Categoria" value={category} />
              <InfoCard label="Usuarios asignados" value={`${assignedCount} miembros`} />
              <InfoCard label="Archivos cargados" value="0 de 1" />
              <InfoCard label="Prompt personalizado" value="Si" />
              <InfoCard label="Solo administrador" value={adminOnly ? 'Si' : 'No'} />
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-900">¿Que hace este agente?</h4>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{agent.description}</p>
              <div className="border-t border-slate-200 mt-4 pt-4">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Checklist de habilitacion</p>
                <ul className="space-y-1.5">
                  <ChecklistItem checked={agent.active} label="Agente activado" />
                  <ChecklistItem checked={true} label="Configuracion basica completa" />
                  <ChecklistItem checked={assignedCount > 0} label="Al menos un usuario asignado" />
                  <ChecklistItem checked={true} label="Prompt personalizado" />
                </ul>
              </div>
            </div>
          </div>
        )}

        {tab === 'config' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Parametros del agente</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ReadonlyField label="Idioma" value={params.idioma} />
                <ReadonlyField label="Tono" value={params.tono} />
                <ReadonlyField label="Fuente Principal" value={params.fuente} />
                <ReadonlyField label="Respuesta Maxima" value={params.respuesta} />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Solo administrador</p>
                <p className="text-xs text-slate-500 mt-0.5">Si se activa, ningun usuario del equipo podra ver este agente.</p>
              </div>
              <Switch on={adminOnly} onClick={() => setAdminOnly(!adminOnly)} />
            </div>
          </div>
        )}

        {tab === 'asign' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-slate-500">Decida que miembros del equipo pueden usar este agente.</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Solo administrador</span>
                <Switch on={adminOnly} onClick={() => setAdminOnly(!adminOnly)} />
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
              {users.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-slate-400">No hay usuarios en la organizacion</div>
              )}
              {users.map(u => {
                const assigned = (u.modules || []).includes(moduleId)
                const initials = u.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
                const roleLabel = u.role === 'super_admin' ? 'Super administrador' : u.role === 'admin' ? 'Administrador' : 'Usuario'
                return (
                  <div key={u.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{u.name}</p>
                        <p className="text-xs text-slate-500">{roleLabel}</p>
                      </div>
                    </div>
                    <Switch
                      on={assigned}
                      onClick={() => toggleUserAssignment(u.id, assigned)}
                      disabled={!agent.active}
                    />
                  </div>
                )
              })}
            </div>
            {!agent.active && (
              <p className="text-xs text-amber-600">Active el agente para asignar usuarios.</p>
            )}
          </div>
        )}
      </div>
      )}
    </div>
    {!isAdminTabActive && children}
    </div>
  )
}

const InfoCard = ({ label, value }) => (
  <div className="bg-slate-50 rounded-lg p-3">
    <p className="text-[11px] text-slate-500">{label}</p>
    <p className="font-semibold text-slate-900 mt-1 text-sm">{value}</p>
  </div>
)

const ChecklistItem = ({ checked, label }) => (
  <li className="flex items-center gap-2 text-sm text-slate-700">
    {checked
      ? <Check className="w-4 h-4 text-emerald-500" />
      : <XIcon className="w-4 h-4 text-slate-300" />}
    {label}
  </li>
)

const ReadonlyField = ({ label, value }) => (
  <div>
    <label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>
    <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">{value}</div>
  </div>
)

const Switch = ({ on, onClick, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${on ? 'bg-[#1a3a3a]' : 'bg-slate-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${on ? 'translate-x-4' : 'translate-x-0'}`} />
  </button>
)

export default AgentAdminPanel
