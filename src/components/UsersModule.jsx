import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Users, UserPlus, ChevronDown, ChevronUp, Mail, Lock, User,
  Blocks, ToggleLeft, ToggleRight, CheckCircle2, XCircle, RefreshCw, Phone,
  MessageSquare, FileText, Clock, Bell, Send, Sparkles, BarChart3, Activity,
  Pencil, Trash2, X, Save
} from 'lucide-react'

const MODULE_ICONS = {
  'coach-ai': Sparkles, operacion: BarChart3, actividad: Activity,
  agente: MessageSquare, documentos: FileText, accountability: Clock,
}

const UsersModule = () => {
  const { token } = useAuth()
  const [users, setUsers] = useState([])
  const [orgModules, setOrgModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedUser, setExpandedUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [notifForm, setNotifForm] = useState({ userId: null, title: '', message: '', category: 'general' })
  const [sendingNotif, setSendingNotif] = useState(false)
  const [notifSuccess, setNotifSuccess] = useState('')
  // Edit modal
  const [editModal, setEditModal] = useState(null) // user object or null
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const fetchUsers = async () => {
    try { const res = await fetch('/api/users', { headers }); if (res.ok) { const data = await res.json(); setUsers(data.users) } } catch (err) { console.error(err) }
  }
  const fetchOrgModules = async () => {
    try { const res = await fetch('/api/modules/org', { headers }); if (res.ok) { const data = await res.json(); setOrgModules(data.modules.filter(m => m.active)) } } catch (err) { console.error(err) }
  }
  useEffect(() => { Promise.all([fetchUsers(), fetchOrgModules()]).then(() => setLoading(false)) }, [])

  const handleCreateUser = async (e) => {
    e.preventDefault(); setFormError(''); setFormSuccess(''); setSaving(true)
    try {
      const res = await fetch('/api/users', { method: 'POST', headers, body: JSON.stringify(form) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error)
      setFormSuccess(`Usuario "${data.user.name}" creado`); setForm({ name: '', email: '', password: '', phone: '' }); fetchUsers()
      setTimeout(() => { setFormSuccess(''); setShowForm(false) }, 2000)
    } catch (err) { setFormError(err.message) }
    setSaving(false)
  }

  const toggleUserActive = async (userId, currentActive) => {
    try { await fetch(`/api/users/${userId}`, { method: 'PATCH', headers, body: JSON.stringify({ is_active: !currentActive }) }); fetchUsers() } catch (err) { console.error(err) }
  }
  const toggleUserModule = async (userId, moduleId, assigned) => {
    try { await fetch(`/api/modules/user/${userId}`, { method: 'PUT', headers, body: JSON.stringify({ moduleId, assigned: !assigned }) }); fetchUsers() } catch (err) { console.error(err) }
  }
  const sendNotification = async (userId) => {
    if (!notifForm.title.trim()) return; setSendingNotif(true)
    try {
      const res = await fetch('/api/notifications/send', { method: 'POST', headers, body: JSON.stringify({ userId, title: notifForm.title, message: notifForm.message, category: notifForm.category }) })
      if (res.ok) { setNotifSuccess('Notificacion enviada'); setNotifForm({ userId: null, title: '', message: '', category: 'general' }); setTimeout(() => setNotifSuccess(''), 3000) }
    } catch (err) { console.error(err) }
    setSendingNotif(false)
  }

  const openEditModal = (u) => {
    setEditModal(u)
    setEditForm({ name: u.name, email: u.email, phone: u.phone || '' })
    setEditError('')
  }

  const handleEditSave = async () => {
    setEditSaving(true); setEditError('')
    try {
      const res = await fetch(`/api/users/${editModal.id}`, { method: 'PATCH', headers, body: JSON.stringify(editForm) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error)
      setEditModal(null); fetchUsers()
    } catch (err) { setEditError(err.message) }
    setEditSaving(false)
  }

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Eliminar a "${userName}"? Esta accion no se puede deshacer.`)) return
    try { await fetch(`/api/users/${userId}`, { method: 'DELETE', headers }); fetchUsers(); setExpandedUser(null) } catch (err) { console.error(err) }
  }

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  const inputCls = "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 transition-all"

  if (loading) return <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1a3a3a] border-t-transparent" /></div>

  return (
    <div className="space-y-5">
      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setEditModal(null)} />
          <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md p-6 mx-4">
            <button onClick={() => setEditModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Pencil className="w-4 h-4 text-[#1a3a3a]" /> Editar Usuario</h3>
            {editError && <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs">{editError}</div>}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Telefono</label>
                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className={inputCls} placeholder="+52 1..." />
              </div>
            </div>
            <div className="flex items-center justify-between mt-5">
              <button onClick={() => handleDeleteUser(editModal.id, editModal.name)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-all">
                <Trash2 className="w-3 h-3" /> Eliminar
              </button>
              <button onClick={handleEditSave} disabled={editSaving} className="flex items-center gap-2 px-5 py-2 bg-[#1a3a3a] text-white rounded-lg font-semibold text-sm hover:bg-[#224a4a] transition-all disabled:opacity-50">
                {editSaving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <><Save className="w-4 h-4" /><span>Guardar</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-[#1a3a3a]" /> Equipo</h2>
          <p className="text-slate-500 text-sm mt-1">Administra empleados y asigna modulos.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchUsers(); fetchOrgModules() }} className="p-2 text-slate-400 hover:text-[#1a3a3a] hover:bg-[#e8f0f0] rounded-lg transition-all"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowForm(!showForm)} className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${showForm ? 'bg-slate-100 text-slate-600' : 'bg-[#1a3a3a] text-white hover:bg-[#224a4a] shadow-sm'}`}>
            <UserPlus className={`w-4 h-4 transition-transform ${showForm ? 'rotate-45' : ''}`} /><span>{showForm ? 'Cancelar' : 'Nuevo Usuario'}</span>
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-900 text-sm mb-5 flex items-center gap-2"><UserPlus className="w-4 h-4 text-[#1a3a3a]" /> Crear Nuevo Empleado</h3>
          {formError && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">{formError}</div>}
          {formSuccess && <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm">{formSuccess}</div>}
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</label><input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Nombre del empleado" /></div>
              <div className="space-y-1.5"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="empleado@email.com" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrasena</label><input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder="Min. 6 caracteres" /></div>
              <div className="space-y-1.5"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Telefono</label><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+52 1..." /></div>
            </div>
            <div className="flex justify-end pt-1">
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[#1a3a3a] text-white rounded-lg font-semibold text-sm hover:bg-[#224a4a] transition-all active:scale-[0.98] shadow-sm disabled:opacity-50">
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <><UserPlus className="w-4 h-4" /><span>Crear Empleado</span></>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3"><Users className="w-4 h-4 text-slate-400" /><h2 className="font-semibold text-slate-900 text-sm">Empleados</h2><span className="text-xs bg-[#e8f0f0] text-[#1a3a3a] font-semibold px-2 py-0.5 rounded-md">{users.filter(u => u.role === 'user').length}</span></div>
        </div>

        {users.filter(u => u.role === 'user').length === 0 ? (
          <div className="p-12 text-center text-slate-400"><Users className="w-8 h-8 mx-auto mb-3 opacity-30" /><p className="text-sm">No has creado empleados aun.</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.filter(u => u.role === 'user').map((user) => (
              <div key={user.id}>
                <div className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-xs text-white ${user.is_active ? 'bg-[#1a3a3a]' : 'bg-slate-300'}`}>
                      {user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}{user.phone && <span className="text-slate-300"> · {user.phone}</span>}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-1.5">
                      {(user.modules || []).map(modId => { const Icon = MODULE_ICONS[modId] || Blocks; return <Icon key={modId} className="w-4 h-4 text-slate-400" /> })}
                      {(!user.modules || user.modules.length === 0) && <span className="text-xs text-slate-300">Sin modulos</span>}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {user.is_active ? <><CheckCircle2 className="w-3 h-3" /> Activo</> : <><XCircle className="w-3 h-3" /> Inactivo</>}
                    </span>
                    {/* Edit button */}
                    <button onClick={(e) => { e.stopPropagation(); openEditModal(user) }} className="p-1.5 text-slate-400 hover:text-[#1a3a3a] hover:bg-[#e8f0f0] rounded-lg transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-slate-400 hidden sm:block">{formatDate(user.created_at)}</span>
                    {expandedUser === user.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {expandedUser === user.id && (
                  <div className="px-5 pb-4 bg-slate-50/30 space-y-3">
                    {/* Modules */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2"><Blocks className="w-4 h-4 text-[#1a3a3a]" /> Modulos Asignados</h4>
                        <button onClick={(e) => { e.stopPropagation(); toggleUserActive(user.id, user.is_active) }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${user.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                          {user.is_active ? <><ToggleRight className="w-4 h-4" /> Desactivar</> : <><ToggleLeft className="w-4 h-4" /> Activar</>}
                        </button>
                      </div>
                      {orgModules.length === 0 ? (
                        <p className="text-sm text-slate-400">No hay modulos activos. Activalos en Modulos.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {orgModules.map((mod) => {
                            const assigned = (user.modules || []).includes(mod.id)
                            const Icon = MODULE_ICONS[mod.id] || Blocks
                            return (
                              <button key={mod.id} onClick={(e) => { e.stopPropagation(); toggleUserModule(user.id, mod.id, assigned) }}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${assigned ? 'border-[#1a3a3a]/20 bg-[#e8f0f0]/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                <Icon className={`w-4 h-4 ${assigned ? 'text-[#1a3a3a]' : 'text-slate-400'}`} />
                                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{mod.name}</p></div>
                                <div className={`w-9 h-5 rounded-full flex items-center transition-colors ${assigned ? 'bg-[#1a3a3a] justify-end' : 'bg-slate-200 justify-start'}`}>
                                  <div className="w-4 h-4 rounded-full bg-white shadow mx-0.5" />
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Notification */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                      <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2 mb-3"><Bell className="w-4 h-4 text-[#1a3a3a]" /> Enviar Notificacion</h4>
                      {notifSuccess && <div className="mb-3 p-2 bg-green-50 border border-green-100 rounded-lg text-green-600 text-xs text-center">{notifSuccess}</div>}
                      <div className="space-y-2">
                        <input type="text" placeholder="Titulo de la notificacion" value={notifForm.userId === user.id ? notifForm.title : ''} onClick={(e) => { e.stopPropagation(); setNotifForm({ ...notifForm, userId: user.id }) }} onChange={(e) => { e.stopPropagation(); setNotifForm({ ...notifForm, userId: user.id, title: e.target.value }) }} className={inputCls} />
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                          <input type="text" placeholder="Mensaje (opcional)" value={notifForm.userId === user.id ? notifForm.message : ''} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setNotifForm({ ...notifForm, userId: user.id, message: e.target.value }) }} className={inputCls} />
                          <select value={notifForm.userId === user.id ? notifForm.category : 'general'} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setNotifForm({ ...notifForm, userId: user.id, category: e.target.value }) }}
                            className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 cursor-pointer">
                            <option value="general">General</option><option value="operacion">Operacion</option><option value="equipo">Equipo</option><option value="modulos">Modulos</option><option value="actividad">Actividad</option>
                          </select>
                          <button onClick={(e) => { e.stopPropagation(); sendNotification(user.id) }} disabled={sendingNotif || !(notifForm.userId === user.id && notifForm.title.trim())}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1a3a3a] text-white rounded-lg text-xs font-semibold hover:bg-[#224a4a] transition-all disabled:opacity-50">
                            <Send className="w-3 h-3" /> Enviar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default UsersModule
