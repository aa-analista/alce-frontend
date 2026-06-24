import { useState } from 'react'
import {
  Home, Sparkles, BarChart3, Users, Bot, Activity, Settings, LogOut,
  MessageSquare, FileText, Clock, Database, ChevronDown, Blocks, DollarSign,
  UserPlus, CalendarCheck, FileSignature, Wand2, Palette, ClipboardList, Mic, LifeBuoy, Mail
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useNavigate, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ICON_CATALOG } from '../lib/agentIcons.jsx'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Label overrides — usamos esto para renombrar módulos sin tocar la DB.
// Útil para evitar nombres confusos (ej: hay un tab "Diseño" en Ajustes
// que NO es lo mismo que el módulo "Diseño" de Open Design).
const MODULE_LABEL_OVERRIDES = {
  'design': 'Estudio Creativo',
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
  // ── Módulos integrados (Efra) ──
  'gestion-equipo': CalendarCheck,
  'contratos': FileSignature,
  'propuestas': ClipboardList,
  'reuniones': Mic,
  'soporte': LifeBuoy,
  'zoho': Database,
  // ── Herramientas ──
  'openui': Wand2,
  'design': Palette,
}

// Fixed nav items (always or admin-only)
const FIXED_ITEMS = [
  { id: 'home', path: '/home', label: 'Inicio', icon: Home, alwaysShow: true },
  { id: 'clientes', path: '/clientes', label: 'Clientes', icon: UserPlus, superAdminOnly: true },
  { id: 'usuarios', path: '/usuarios', label: 'Equipo', icon: Users, adminOnly: true },
  { id: 'gastos', path: '/gastos', label: 'Gastos', icon: DollarSign, adminOnly: true },
  { id: 'propuestas', path: '/propuestas', label: 'Propuestas', icon: ClipboardList, alwaysShow: true },
  { id: 'reuniones', path: '/reuniones', label: 'Reuniones', icon: Mic, alwaysShow: true },
  { id: 'soporte', path: '/soporte', label: 'Soporte', icon: LifeBuoy, alwaysShow: true },
  { id: 'correos', path: '/correos', label: 'Resumen Correos', icon: Mail, alwaysShow: true },
  { id: 'zoho', path: '/zoho', label: 'Zoho CRM', icon: Database, adminOnly: true },
]

const CORE_IDS = ['coach-ai', 'operacion', 'actividad', 'contratos', 'propuestas', 'reuniones', 'soporte', 'zoho']

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

  const isSuperAdmin = user?.role === 'super_admin'
  const isAdmin = user?.role === 'admin' || isSuperAdmin

  const fixedVisible = FIXED_ITEMS.filter(item => {
    if (item.alwaysShow) return true
    if (item.superAdminOnly) return isSuperAdmin
    if (item.adminOnly) return isAdmin
    return false
  })

  // Pick a sidebar icon: override from agent config (lucide name) wins,
  // otherwise the hardcoded MODULE_ICONS by id, otherwise Blocks fallback.
  const iconFor = (m) => (m.icon && ICON_CATALOG[m.icon]) || MODULE_ICONS[m.id] || Blocks

  const visibleModules = userModules.filter(m => m.type === 'module' || !m.type)
  const labelFor = (m) => MODULE_LABEL_OVERRIDES[m.id] || m.name
  const coreModuleItems = visibleModules
    .filter(m => CORE_IDS.includes(m.id) && !isSuperAdmin)
    .map(m => ({ id: m.id, path: `/${m.id}`, label: labelFor(m), icon: iconFor(m) }))
  // Super_admin manages agents from /agentes — doesn't navigate to them via sidebar
  const agentModuleItems = isSuperAdmin ? [] : visibleModules
    .filter(m => !CORE_IDS.includes(m.id))
    .map(m => ({ id: m.id, path: `/${m.id}`, label: labelFor(m), icon: iconFor(m) }))

  const showAgentsGroup = isAdmin || agentModuleItems.length > 0
  const agentesTarget = isSuperAdmin ? '/agentes' : '/marketplace'
  const isAgentesActive = currentPath === agentesTarget

  const toggleAgents = () => {
    const next = !agentsOpen
    setAgentsOpen(next)
    localStorage.setItem('sidebar_agents_open', String(next))
  }

  return (
    <aside className={cn(
      "h-full bg-[var(--brand-sidebar-bg)] border-r border-slate-200 dark:border-slate-700 flex flex-col flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out relative",
      collapsed ? "w-[68px]" : "w-56"
    )}>
      {/* Logo */}
      <div className="p-4 pb-2 flex items-center gap-2.5 min-h-[56px]">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ background: user?.branding?.primaryColor || 'var(--brand-primary)' }}
        >
          {user?.branding?.logoUrl ? (
            <img src={user.branding.logoUrl} alt="logo" className="w-full h-full object-contain" />
          ) : (
            <svg
              className="w-4 h-4"
              style={{ color: user?.branding?.textOnPrimary || '#ffffff' }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          )}
        </div>
        <div className={cn(
          "min-w-0 transition-all duration-300 overflow-hidden",
          collapsed ? "w-0 opacity-0" : "flex-1 opacity-100"
        )}>
          <span
            className="text-sm font-bold text-slate-900 dark:text-white tracking-tight block truncate"
            title={user?.branding?.displayName || user?.orgName || 'Alce AI'}
          >
            {user?.branding?.displayName || user?.orgName || 'Alce AI'}
          </span>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-[0.15em] leading-none">Plataforma B2B</p>
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
              isAgentesActive
                ? "bg-[var(--brand-primary)] text-white font-medium"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 hover:text-slate-900 dark:hover:text-white"
            )}>
              {isAdmin ? (
                <NavLink
                  to={agentesTarget}
                  id="nav-agentes"
                  title="Agentes"
                  className={cn(
                    "flex-1 flex items-center gap-2.5 overflow-hidden whitespace-nowrap",
                    collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2 text-[13px]"
                  )}
                >
                  <Bot className={cn(
                    "w-[18px] h-[18px] flex-shrink-0",
                    isAgentesActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
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
              {!collapsed && agentModuleItems.length > 0 && (
                <button
                  onClick={toggleAgents}
                  title={agentsOpen ? 'Contraer' : 'Expandir'}
                  className={cn(
                    "p-2 transition-colors",
                    isAgentesActive ? "text-white/70 hover:text-white" : "text-slate-400 hover:text-slate-700"
                  )}
                >
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", agentsOpen ? "rotate-0" : "-rotate-90")} />
                </button>
              )}
            </div>

            {/* Submenu */}
            {!collapsed && agentsOpen && agentModuleItems.length > 0 && (
              <div className="mt-0.5 ml-4 pl-3 border-l border-slate-100 dark:border-slate-700 space-y-0.5">
                {agentModuleItems.map(item => (
                  <SidebarLink key={item.id} item={item} isActive={currentPath === item.path} collapsed={false} submenu />
                ))}
              </div>
            )}

            {/* Collapsed-mode submenu items (shown as icons) */}
            {collapsed && agentModuleItems.map(item => (
              <SidebarLink key={item.id} item={item} isActive={currentPath === item.path} collapsed={true} />
            ))}
          </div>
        )}

        {/* Admin items (Clientes, Equipo, Gastos) */}
        {fixedVisible.filter(i => i.id !== 'home').map(item => (
          <SidebarLink key={item.id} item={item} isActive={currentPath === item.path} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-slate-100 dark:border-slate-700">
        <NavLink
          to="/ajustes"
          title="Configuracion"
          className={({ isActive }) => cn(
            "flex items-center gap-2.5 w-full rounded-lg group transition-colors duration-150 overflow-hidden whitespace-nowrap",
            collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2 text-[13px]",
            isActive ? "text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700/40 font-medium" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/40"
          )}
        >
          <Settings className="w-[18px] h-[18px] text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-200 flex-shrink-0" />
          <span className={cn("transition-all duration-300 overflow-hidden", collapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>Configuracion</span>
        </NavLink>
        <button
          onClick={handleLogout}
          title="Cerrar Sesion"
          className={cn(
            "flex items-center gap-2.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors w-full rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 mt-0.5 overflow-hidden whitespace-nowrap",
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
          ? "bg-[var(--brand-primary)] text-white font-medium"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 hover:text-slate-900 dark:hover:text-white"
      )}
    >
      <Icon className={cn(
        "flex-shrink-0",
        submenu ? "w-4 h-4" : "w-[18px] h-[18px]",
        isActive ? "text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-200"
      )} />
      <span className={cn(
        "transition-all duration-300 overflow-hidden",
        collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
      )}>{item.label}</span>
    </NavLink>
  )
}

export default Sidebar
