import { useState, useEffect, useRef } from 'react'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'
import { useLocation } from 'react-router-dom'
import {
  Search, Bell, HelpCircle, Building2, Menu, X, ChevronLeft,
  AlertTriangle, UserPlus, Blocks, Clock, Loader2
} from 'lucide-react'

const NOTIF_ICONS = {
  operacion: AlertTriangle,
  equipo: UserPlus,
  modulos: Blocks,
  actividad: Clock,
}

const Layout = ({ children, userModules = [] }) => {
  const { user, token } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const [notifTab, setNotifTab] = useState('all')
  const notifRef = useRef(null)

  const roleLabel = { super_admin: 'Super Admin', admin: 'Administrador', user: 'Usuario' }
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'AD'
  const unreadCount = notifs.filter(n => !n.is_read).length

  // Fetch notification count on mount
  useEffect(() => { fetchNotifications() }, [])

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Close notif dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchNotifications = async () => {
    setLoadingNotifs(true)
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setNotifs(data.notifications || []) }
    } catch (err) { console.error(err) }
    setLoadingNotifs(false)
  }

  const handleBellClick = () => { setShowNotifs(!showNotifs); if (!showNotifs) fetchNotifications() }

  const markAllRead = async () => {
    try { await fetch('/api/notifications/read-all', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); setNotifs(prev => prev.map(n => ({ ...n, is_read: true }))) } catch (err) { console.error(err) }
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const diff = Math.floor((new Date() - new Date(dateStr)) / 60000)
    if (diff < 1) return 'Ahora'
    if (diff < 60) return `Hace ${diff} min`
    if (diff < 1440) return `Hace ${Math.floor(diff / 60)} h`
    return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  const filteredNotifs = notifTab === 'unread' ? notifs.filter(n => !n.is_read) : notifs

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex relative">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} userModules={userModules} />
        {/* Toggle button — rendered outside sidebar to avoid overflow clipping */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-12 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all shadow-sm z-50"
        >
          <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-56 animate-in slide-in-from-left duration-200">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} userModules={userModules} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-14 flex items-center px-4 sm:px-5 flex-shrink-0 gap-3">
          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
            <Menu className="w-5 h-5" />
          </button>

          {/* Search — full width */}
          <div id="tour-search" className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Buscar en el workspace..." className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/10 focus:border-[#1a3a3a]/30 transition-all" />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Org badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-600">{user?.orgName || 'ALCE'}</span>
            </div>

            {/* Notifications */}
            <div id="tour-notifications" className="relative" ref={notifRef}>
              <button onClick={handleBellClick} className="relative p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 text-sm">Notificaciones</h3>
                      {unreadCount > 0 && <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadCount} nuevas</span>}
                    </div>
                    {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-slate-500 hover:text-slate-700 font-medium">Marcar todas como leidas</button>}
                  </div>
                  <div className="flex border-b border-slate-100">
                    {['all', 'unread'].map(tab => (
                      <button key={tab} onClick={() => setNotifTab(tab)}
                        className={`flex-1 py-2 text-xs font-medium border-b-2 transition-all ${notifTab === tab ? 'border-[#1a3a3a] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                        {tab === 'all' ? 'Todas' : 'No leidas'}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {loadingNotifs ? (
                      <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 text-[#1a3a3a] animate-spin" /></div>
                    ) : filteredNotifs.length === 0 ? (
                      <div className="py-10 text-center"><Bell className="w-6 h-6 text-slate-200 mx-auto mb-2" /><p className="text-xs text-slate-400">No hay notificaciones</p></div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {filteredNotifs.map((n) => {
                          const Icon = NOTIF_ICONS[n.category] || Bell
                          return (
                            <div key={n.id} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
                              <div className="w-8 h-8 rounded-lg bg-[#e8f0f0] flex items-center justify-center flex-shrink-0 mt-0.5"><Icon className="w-4 h-4 text-[#1a3a3a]" /></div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${n.is_read ? 'text-slate-600' : 'font-semibold text-slate-900'}`}>{n.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                                <p className="text-[10px] text-slate-300 mt-1">{formatTime(n.created_at)}{n.category && <span> · <span className="capitalize">{n.category}</span></span>}</p>
                              </div>
                              {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#1a3a3a] flex-shrink-0 mt-2" />}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-100 px-4 py-2.5 text-center">
                    <button className="text-xs font-medium text-slate-500 hover:text-slate-700">Ver todas las notificaciones</button>
                  </div>
                </div>
              )}
            </div>

            {/* Help */}
            <button className="hidden sm:block p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* User */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-slate-700 leading-tight">{user?.name || 'Usuario'}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{roleLabel[user?.role] || user?.role}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-[#1a3a3a] text-white flex items-center justify-center font-semibold text-[10px]">{initials}</div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
