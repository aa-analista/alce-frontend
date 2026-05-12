import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus, Mail, Phone, Building2, Calendar, Clock, MessageSquare,
  Search, RefreshCw, Filter, X, ChevronRight, Globe, FileText, Save,
  CheckCircle2, AlertCircle, Briefcase, Users, Shield, MapPin, Lock, Unlock
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useAuth } from '../context/AuthContext'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const STATUS_OPTIONS = [
  { value: 'new',       label: 'Nuevo',      tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'contacted', label: 'Contactado', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'qualified', label: 'Calificado', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'converted', label: 'Convertido', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'lost',      label: 'Perdido',    tone: 'bg-slate-100 text-slate-600 border-slate-200' },
]

const SERVICE_LABELS = {
  'diagnostico-madurez-ia':       'Diagnostico de Madurez IA',
  'rediseno-procesos-toolkit-ia': 'Rediseno de Procesos + Toolkit IA',
  'blueprint-roadmap-adopcion-ia':'Blueprint / Roadmap de Adopcion IA',
  'acompanamiento-implementacion':'Acompanamiento de Implementacion',
  'agente-consultoria-ai-native': 'Agente de Consultoria AI-Native',
  'accountability-partner':       'Accountability Partner',
  'suite-agentes-entrevistadores':'Suite de Agentes Entrevistadores',
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatDateShort(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

function formatPreferredDate(iso) {
  if (!iso) return null
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function StatusBadge({ status }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0]
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      opt.tone
    )}>
      {opt.label}
    </span>
  )
}

const ClientesModule = () => {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const [tab, setTab] = useState('potential')
  const activeTab = !isSuperAdmin && tab === 'current' ? 'potential' : tab

  if (!isSuperAdmin) {
    return (
      <div className="p-6 sm:p-8 max-w-2xl mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <UserPlus className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-900">Acceso restringido</p>
          <p className="text-xs text-slate-500 mt-1">Esta seccion sólo está disponible para super administradores.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-[var(--brand-primary)]" />
          Clientes
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {activeTab === 'potential'
            ? 'Solicitudes recibidas desde el formulario de contacto del sitio web.'
            : 'Organizaciones registradas en la plataforma con sus dueños y equipos.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setTab('potential')}
          className={cn(TAB_CLASS, activeTab === 'potential' ? TAB_ACTIVE : TAB_IDLE)}
        >
          <UserPlus className="w-4 h-4" />
          Clientes potenciales
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setTab('current')}
            className={cn(TAB_CLASS, activeTab === 'current' ? TAB_ACTIVE : TAB_IDLE)}
          >
            <Briefcase className="w-4 h-4" />
            Clientes actuales
          </button>
        )}
      </div>

      {activeTab === 'potential' && <PotentialClientsTab />}
      {activeTab === 'current' && isSuperAdmin && <CurrentClientsTab />}
    </div>
  )
}

const TAB_CLASS = 'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors'
const TAB_ACTIVE = 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
const TAB_IDLE = 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'

// ─────────────────────────────────────────────────────────────────────
// Tab 1 — Clientes potenciales (existing logic, untouched)
// ─────────────────────────────────────────────────────────────────────
const PotentialClientsTab = () => {
  const { token } = useAuth()
  const [clients, setClients] = useState([])
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [savingStatus, setSavingStatus] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (search.trim()) params.set('q', search.trim())
      const res = await fetch(`/api/potential-clients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Error al cargar clientes')
      const data = await res.json()
      setClients(data.clients || [])
      setStats(data.stats || [])
    } catch (e) {
      setError(e.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [token, statusFilter, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setNotesDraft(selected?.notes || '') }, [selected?.id])

  const total = stats.reduce((acc, s) => acc + (s.count || 0), 0)
  const countFor = (status) => stats.find((s) => s.status === status)?.count || 0

  async function changeStatus(id, status) {
    setSavingStatus(true)
    try {
      const res = await fetch(`/api/potential-clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error('No se pudo cambiar el estado')
      const { client } = await res.json()
      setClients((prev) => prev.map((c) => (c.id === id ? client : c)))
      if (selected?.id === id) setSelected(client)
      load()
    } catch (e) {
      alert(e.message)
    } finally {
      setSavingStatus(false)
    }
  }

  async function saveNotes() {
    if (!selected) return
    setSavingNotes(true)
    try {
      const res = await fetch(`/api/potential-clients/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: notesDraft })
      })
      if (!res.ok) throw new Error('No se pudieron guardar las notas')
      const { client } = await res.json()
      setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)))
      setSelected(client)
    } catch (e) {
      alert(e.message)
    } finally {
      setSavingNotes(false)
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex justify-end mb-4">
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        <button
          onClick={() => setStatusFilter('')}
          className={cn(
            'rounded-xl border p-3 text-left transition-all',
            !statusFilter ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
          )}
        >
          <div className={cn('text-xs font-medium uppercase tracking-wider', !statusFilter ? 'text-white/70' : 'text-slate-500')}>
            Total
          </div>
          <div className="text-2xl font-bold mt-1">{total}</div>
        </button>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              'rounded-xl border p-3 text-left transition-all',
              statusFilter === opt.value ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
            )}
          >
            <div className={cn('text-xs font-medium uppercase tracking-wider', statusFilter === opt.value ? 'text-white/70' : 'text-slate-500')}>
              {opt.label}
            </div>
            <div className="text-2xl font-bold mt-1">{countFor(opt.value)}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, empresa o mensaje..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {statusFilter && (
          <button
            onClick={() => setStatusFilter('')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <Filter className="w-4 h-4" />
            {STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label}
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <UserPlus className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm">No hay clientes potenciales con estos filtros.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {clients.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelected(c)}
                  className="w-full px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-bold flex items-center justify-center flex-shrink-0 uppercase">
                    {c.name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 truncate">{c.name}</span>
                      <StatusBadge status={c.status} />
                      {c.service && SERVICE_LABELS[c.service] && (
                        <span className="text-xs text-slate-500 truncate">
                          • {SERVICE_LABELS[c.service]}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3" />{c.email}
                      </span>
                      {c.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />{c.phone}
                        </span>
                      )}
                      {c.company && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{c.company}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 line-clamp-1">{c.message}</p>
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                    <span className="text-xs text-slate-400">{formatDate(c.created_at)}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setSelected(null)}
            className="flex-1 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">{selected.name}</h2>
                <p className="text-sm text-slate-500">Recibido {formatDate(selected.created_at)}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Estado</label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((opt) => {
                    const active = selected.status === opt.value
                    return (
                      <button
                        key={opt.value}
                        disabled={savingStatus}
                        onClick={() => changeStatus(selected.id, opt.value)}
                        className={cn(
                          'px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                          active ? opt.tone + ' shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50',
                          savingStatus && 'opacity-50 cursor-wait'
                        )}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contacto</h3>
                <a
                  href={`mailto:${selected.email}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-sm text-slate-900 truncate">{selected.email}</span>
                </a>
                {selected.phone && (
                  <a
                    href={`tel:${selected.phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-sm text-slate-900">{selected.phone}</span>
                  </a>
                )}
                {selected.company && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                    <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-sm text-slate-900">{selected.company}</span>
                  </div>
                )}
              </div>

              {selected.service && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Servicio de interes</h3>
                  <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-sm text-emerald-800 font-medium">
                    {SERVICE_LABELS[selected.service] || selected.service}
                  </div>
                </div>
              )}

              {selected.preferred_date && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Fecha tentativa</h3>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                    <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-sm text-slate-900 capitalize">
                      {formatPreferredDate(selected.preferred_date)}
                    </span>
                    {selected.preferred_time && (
                      <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-600 tabular-nums">
                        <Clock className="w-3.5 h-3.5" />{selected.preferred_time?.slice(0, 5)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Mensaje
                </h3>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-800 whitespace-pre-wrap">
                  {selected.message}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Notas internas
                </h3>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={4}
                  placeholder="Notas privadas del equipo (no visibles para el cliente)..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20"
                />
                <button
                  onClick={saveNotes}
                  disabled={savingNotes || notesDraft === (selected.notes || '')}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-primary)] text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--brand-primary)] transition-colors"
                >
                  {savingNotes ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Guardar notas
                </button>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  <span>Origen: <span className="font-mono text-slate-500">{selected.source}</span></span>
                </div>
                {selected.ip_address && (
                  <div className="font-mono">IP: {selected.ip_address}</div>
                )}
                {selected.updated_at && selected.updated_at !== selected.created_at && (
                  <div className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Última actualización: {formatDate(selected.updated_at)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Tab 2 — Clientes actuales (organizaciones registradas)
// ─────────────────────────────────────────────────────────────────────
const CurrentClientsTab = () => {
  const { token } = useAuth()
  const [customers, setCustomers] = useState([])
  const [totals, setTotals] = useState({ organizations: 0, owners: 0, employees: 0, members: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [statusDraft, setStatusDraft] = useState({ status: 'active', reason: '' })
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')

  // Sincroniza el draft cuando se abre otra org
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selected) return
    setStatusDraft({
      status: selected.status || 'active',
      reason: selected.suspended_reason || '',
    })
    setStatusError('')
  }, [selected?.id])

  const saveStatus = async () => {
    if (!selected) return
    setSavingStatus(true)
    setStatusError('')
    try {
      const body = { status: statusDraft.status }
      if (statusDraft.status === 'suspended') body.suspended_reason = statusDraft.reason || null
      const res = await fetch(`/api/customers/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el estado')
      // Actualiza la lista y la org seleccionada
      const updatedOrg = {
        ...selected,
        status: data.organization.status,
        suspended_reason: data.organization.suspended_reason,
      }
      setCustomers((prev) => prev.map((c) => (c.id === selected.id ? { ...c, ...updatedOrg } : c)))
      setSelected(updatedOrg)
    } catch (e) {
      setStatusError(e.message)
    } finally {
      setSavingStatus(false)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      const res = await fetch(`/api/customers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Error al cargar clientes actuales')
      const data = await res.json()
      setCustomers(data.customers || [])
      setTotals(data.totals || { organizations: 0, owners: 0, employees: 0, members: 0 })
    } catch (e) {
      setError(e.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [token, search])

  useEffect(() => { load() }, [load])

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <StatCard label="Organizaciones" value={totals.organizations} accent />
        <StatCard label="Dueños"        value={totals.owners} />
        <StatCard label="Empleados"     value={totals.employees} />
        <StatCard label="Total miembros" value={totals.members} />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar organización por nombre, slug o país..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Briefcase className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm">No hay organizaciones registradas todavía.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {customers.map((org) => {
              const owner = org.owners?.[0]
              return (
                <li key={org.id}>
                  <button
                    onClick={() => setSelected(org)}
                    className="w-full px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-bold flex items-center justify-center flex-shrink-0 uppercase">
                      {org.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 truncate">{org.name}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-slate-50 text-slate-600 border-slate-200 uppercase tracking-wider">
                          {org.plan || 'free'}
                        </span>
                        {org.status === 'suspended' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-red-50 text-red-600 border-red-200 uppercase tracking-wider">
                            <Lock className="w-2.5 h-2.5" /> Suspendida
                          </span>
                        )}
                        {org.team_size_label && (
                          <span className="text-xs text-slate-500">• {org.team_size_label}</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        {owner ? (
                          <span className="inline-flex items-center gap-1">
                            <Shield className="w-3 h-3" />{owner.name}
                            <span className="text-slate-400">({owner.email})</span>
                          </span>
                        ) : (
                          <span className="italic text-slate-400">Sin dueño asignado</span>
                        )}
                        {org.country && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{org.country}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" />{org.members_count} {org.members_count === 1 ? 'miembro' : 'miembros'}
                        </span>
                        {org.owners_count > 1 && (
                          <span className="text-slate-400">+{org.owners_count - 1} dueños</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                      <span className="text-xs text-slate-400">{formatDateShort(org.created_at)}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setSelected(null)}
            className="flex-1 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-bold flex items-center justify-center flex-shrink-0 uppercase">
                  {selected.name?.[0] || '?'}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 truncate">{selected.name}</h2>
                  <p className="text-xs text-slate-500 font-mono truncate">{selected.slug}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-2">
                <MetaCell label="Plan" value={selected.plan || 'free'} />
                <MetaCell label="Tamaño equipo" value={selected.team_size_label || '—'} />
                <MetaCell label="País" value={selected.country || '—'} />
                <MetaCell label="Registrada" value={formatDateShort(selected.created_at)} />
              </div>

              {/* Estado de acceso */}
              <div className={cn(
                'rounded-lg border p-4 space-y-3',
                statusDraft.status === 'suspended'
                  ? 'bg-red-50/40 border-red-100'
                  : 'bg-slate-50 border-slate-100'
              )}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    {statusDraft.status === 'suspended' ? <Lock className="w-3.5 h-3.5 text-red-500" /> : <Unlock className="w-3.5 h-3.5 text-emerald-600" />}
                    Estado de acceso
                  </h3>
                  {selected.status === 'suspended' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 uppercase tracking-wider">
                      Suspendida
                    </span>
                  )}
                </div>
                <select
                  value={statusDraft.status}
                  onChange={(e) => setStatusDraft((d) => ({ ...d, status: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20"
                >
                  <option value="active">Activa — pueden iniciar sesión</option>
                  <option value="suspended">Suspendida — se les bloquea el login</option>
                </select>
                {statusDraft.status === 'suspended' && (
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Motivo (lo verá sólo el admin)
                    </label>
                    <textarea
                      value={statusDraft.reason}
                      onChange={(e) => setStatusDraft((d) => ({ ...d, reason: e.target.value }))}
                      rows={2}
                      placeholder="Ej. No has pagado el plan correspondiente al mes actual."
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Los empleados verán un mensaje genérico que les pide contactar a su administrador.
                    </p>
                  </div>
                )}
                {statusError && (
                  <div className="text-xs text-red-600 flex items-start gap-1.5">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    {statusError}
                  </div>
                )}
                <button
                  onClick={saveStatus}
                  disabled={
                    savingStatus ||
                    (statusDraft.status === (selected.status || 'active') &&
                      (statusDraft.reason || '') === (selected.suspended_reason || ''))
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-primary)] text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--brand-primary)] transition-colors"
                >
                  {savingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Guardar estado
                </button>
              </div>

              {/* Owners */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  {selected.owners?.length === 1 ? 'Dueño' : 'Dueños'} ({selected.owners?.length || 0})
                </h3>
                {selected.owners?.length > 0 ? (
                  <div className="space-y-2">
                    {selected.owners.map((o) => (
                      <MemberCard key={o.id} m={o} />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 italic">Sin dueño asignado.</div>
                )}
              </div>

              {/* Employees */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Empleados ({selected.employees?.length || 0})
                </h3>
                {selected.employees?.length > 0 ? (
                  <div className="space-y-2">
                    {selected.employees.map((e) => (
                      <MemberCard key={e.id} m={e} />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 italic">Sin empleados todavía.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const StatCard = ({ label, value, accent }) => (
  <div className={cn(
    'rounded-xl border p-3',
    accent ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white' : 'border-slate-200 bg-white'
  )}>
    <div className={cn('text-xs font-medium uppercase tracking-wider', accent ? 'text-white/70' : 'text-slate-500')}>
      {label}
    </div>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </div>
)

const MetaCell = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
    <div className="text-sm text-slate-900 mt-0.5 capitalize truncate">{value}</div>
  </div>
)

const MemberCard = ({ m }) => (
  <div className={cn(
    'flex items-start gap-3 p-3 rounded-lg border transition-colors',
    m.is_active ? 'bg-slate-50 border-slate-100' : 'bg-slate-50/50 border-slate-100 opacity-60'
  )}>
    <div className="w-9 h-9 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-bold flex items-center justify-center flex-shrink-0 uppercase text-sm">
      {m.name?.[0] || '?'}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm text-slate-900 truncate">{m.name}</span>
        {!m.is_active && (
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Inactivo</span>
        )}
      </div>
      <div className="text-xs text-slate-500 truncate">{m.email}</div>
      {m.phone && (
        <div className="text-xs text-slate-500 inline-flex items-center gap-1 mt-0.5">
          <Phone className="w-3 h-3" />{m.phone}
        </div>
      )}
    </div>
    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex-shrink-0">
      {formatDateShort(m.created_at)}
    </span>
  </div>
)

export default ClientesModule
