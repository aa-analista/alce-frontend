import { useState } from 'react'
import {
  Home, Sparkles, BarChart3, Users, Bot, Activity, Settings, LogOut,
  MessageSquare, FileText, Clock, Database, ChevronDown, Blocks, DollarSign
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useNavigate, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Icon map for all module IDs
const MODULE_ICONS = {
  'coach-ai': Sparkles,
  'operacion': BarChart3,
  'actividad': Activity,
  'agente': MessageSquare,
  'documentos': FileText,
  'accountability': Clock,
  'conocimiento': Database,
}

// Fixed nav items (always or admin-only)
const FIXED_ITEMS = [
  { id: 'home', path: '/home', label: 'Inicio', icon: Home, alwaysShow: true },
  { id: 'usuarios', path: '/usuarios', label: 'Equipo', icon: Users, adminOnly: true },
  { id: 'gastos', path: '/gastos', label: 'Gastos', icon: DollarSign, adminOnly: true },
]

const CORE_IDS = ['coach-ai', 'operacion', 'actividad']

const Sidebar = ({ collapsed, onToggle, userModules = [] }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const currentPath = location.pathname
  const [agentsOpen, setAgentsOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar_agents_open')
    return stored === null ? true : stored === 'true'
  })

  const handleLogout = () => { logout(); navigate('/login') }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const fixedVisible = FIXED_ITEMS.filter(item => {
    if (item.alwaysShow) return true
    if (item.adminOnly) return isAdmin
    return false
  })

  const visibleModules = userModules.filter(m => m.type === 'module' || !m.type)
  const coreModuleItems = visibleModules
    .filter(m => CORE_IDS.includes(m.id))
    .map(m => ({ id: m.id, path: `/${m.id}`, label: m.name, icon: MODULE_ICONS[m.id] || Blocks }))
  const agentModuleItems = visibleModules
    .filter(m => !CORE_IDS.includes(m.id))
    .map(m => ({ id: m.id, path: `/${m.id}`, label: m.name, icon: MODULE_ICONS[m.id] || Blocks }))

  const showAgentsGroup = isAdmin || agentModuleItems.length > 0
  const isMarketplaceActive = currentPath === '/marketplace'

  const toggleAgents = () => {
    const next = !agentsOpen
    setAgentsOpen(next)
    localStorage.setItem('sidebar_agents_open', String(next))
  }

  return (
    <aside className={cn(
      "h-full bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out relative",
      collapsed ? "w-[68px]" : "w-56"
    )}>
      {/* Logo */}
      <div className="p-4 pb-2 flex items-center gap-2.5 min-h-[56px]">
        <div className="w-9 h-9 bg-[#1a3a3a] rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <div className={cn(
          "min-w-0 transition-all duration-300 overflow-hidden whitespace-nowrap",
          collapsed ? "w-0 opacity-0" : "w-24 opacity-100"
        )}>
          <span className="text-sm font-bold text-slate-900 tracking-tight block">Alce AI</span>
          <p className="text-[9px] text-slate-400 font-medium uppercase tracking-[0.15em] leading-none">Plataforma B2B</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 mt-4 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {/* Inicio */}
        {fixedVisible.filter(i => i.id === 'home').map(item => (
          <SidebarLink key={item.id} item={item} isActive={currentPath === item.path} collapsed={collapsed} />
        ))}

        {/* Core modules */}
        {coreModuleItems.map(item => (
          <SidebarLink key={item.id} item={item} isActive={currentPath === item.path} collapsed={collapsed} />
        ))}

        {/* Agentes group */}
        {showAgentsGroup && (
          <div className="pt-0.5">
            <div className={cn(
              "flex items-center rounded-lg group overflow-hidden whitespace-nowrap transition-colors",
              isMarketplaceActive
                ? "bg-[#1a3a3a] text-white font-medium"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}>
              {isAdmin ? (
                <NavLink
                  to="/marketplace"
                  id="nav-marketplace"
                  title="Agentes"
                  className={cn(
                    "flex-1 flex items-center gap-2.5 overflow-hidden whitespace-nowrap",
                    collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2 text-[13px]"
                  )}
                >
                  <Bot className={cn(
                    "w-[18px] h-[18px] flex-shrink-0",
                    isMarketplaceActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                  <span className={cn(
                    "transition-all duration-300 overflow-hidden",
                    collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}>Agentes</span>
                </NavLink>
              ) : (
                <button
                  onClick={toggleAgents}
                  title="Agentes"
                  className={cn(
                    "flex-1 flex items-center gap-2.5 overflow-hidden whitespace-nowrap",
                    collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2 text-[13px]"
                  )}
                >
                  <Bot className="w-[18px] h-[18px] text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
                  <span className={cn(
                    "transition-all duration-300 overflow-hidden",
                    collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}>Agentes</span>
                </button>
              )}
              {!collapsed && (
                <button
                  onClick={toggleAgents}
                  title={agentsOpen ? 'Contraer' : 'Expandir'}
                  className={cn(
                    "p-2 transition-colors",
                    isMarketplaceActive ? "text-white/70 hover:text-white" : "text-slate-400 hover:text-slate-700"
                  )}
                >
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", agentsOpen ? "rotate-0" : "-rotate-90")} />
                </button>
              )}
            </div>

            {/* Submenu */}
            {!collapsed && agentsOpen && (
              <div className="mt-0.5 ml-4 pl-3 border-l border-slate-100 space-y-0.5">
                {agentModuleItems.length === 0 ? (
                  <p className="px-3 py-1.5 text-[11px] text-slate-400 italic">Sin agentes activos</p>
                ) : (
                  agentModuleItems.map(item => (
                    <SidebarLink key={item.id} item={item} isActive={currentPath === item.path} collapsed={false} submenu />
                  ))
                )}
              </div>
            )}

            {/* Collapsed-mode submenu items (shown as icons) */}
            {collapsed && agentModuleItems.map(item => (
              <SidebarLink key={item.id} item={item} isActive={currentPath === item.path} collapsed={true} />
            ))}
          </div>
        )}

        {/* Admin items (Equipo) */}
        {fixedVisible.filter(i => i.adminOnly).map(item => (
          <SidebarLink key={item.id} item={item} isActive={currentPath === item.path} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-slate-100">
        <NavLink
          to="/ajustes"
          title="Configuracion"
          className={({ isActive }) => cn(
            "flex items-center gap-2.5 w-full rounded-lg group transition-colors duration-150 overflow-hidden whitespace-nowrap",
            collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2 text-[13px]",
            isActive ? "text-slate-900 bg-slate-50 font-medium" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          )}
        >
          <Settings className="w-[18px] h-[18px] text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
          <span className={cn("transition-all duration-300 overflow-hidden", collapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>Configuracion</span>
        </NavLink>
        <button
          onClick={handleLogout}
          title="Cerrar Sesion"
          className={cn(
            "flex items-center gap-2.5 text-slate-400 hover:text-red-500 transition-colors w-full rounded-lg hover:bg-red-50 mt-0.5 overflow-hidden whitespace-nowrap",
            collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2 text-[13px]"
          )}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          <span className={cn("transition-all duration-300 overflow-hidden", collapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>Cerrar Sesion</span>
        </button>
      </div>
    </aside>
  )
}

const SidebarLink = ({ item, isActive, collapsed, submenu = false }) => {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      id={`nav-${item.id}`}
      title={item.label}
      className={cn(
        "w-full flex items-center gap-2.5 rounded-lg transition-colors duration-150 group overflow-hidden whitespace-nowrap",
        collapsed ? "justify-center px-2 py-2.5" : (submenu ? "px-2.5 py-1.5 text-[12.5px]" : "px-3 py-2 text-[13px]"),
        isActive
          ? "bg-[#1a3a3a] text-white font-medium"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon className={cn(
        "flex-shrink-0",
        submenu ? "w-4 h-4" : "w-[18px] h-[18px]",
        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
      )} />
      <span className={cn(
        "transition-all duration-300 overflow-hidden",
        collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
      )}>{item.label}</span>
    </NavLink>
  )
}

export default Sidebar
