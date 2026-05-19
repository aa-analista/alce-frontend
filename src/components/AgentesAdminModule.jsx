import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, X, Check, ChevronDown, Smile } from 'lucide-react'
import { ICON_CATALOG, renderAgentIcon } from '../lib/agentIcons.jsx'

function TypeBadge({ type }) {
  const map = {
    module:    { label: 'Módulo',   cls: 'bg-blue-50 text-blue-700 border-blue-100' },
    iframe:    { label: 'Iframe',   cls: 'bg-purple-50 text-purple-700 border-purple-100' },
    connector: { label: 'Conector', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  }
  const { label, cls } = map[type] || map.module
  return (
    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${cls}`}>{label}</span>
  )
}

function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [emojiMode, setEmojiMode] = useState(() => value && !ICON_CATALOG[value])
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const entries = Object.entries(ICON_CATALOG)
  const filtered = search
    ? entries.filter(([name]) => name.toLowerCase().includes(search.toLowerCase()))
    : entries

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-[38px] px-2 flex items-center justify-between gap-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center justify-center w-7 h-7 text-slate-700">
          {renderAgentIcon(value, { className: 'w-4 h-4', emojiClassName: 'text-lg leading-none' })}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
          {/* Mode switch */}
          <div className="flex items-center gap-1 mb-2 p-0.5 bg-slate-50 rounded-lg">
            <button
              type="button"
              onClick={() => setEmojiMode(false)}
              className={`flex-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                !emojiMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Iconos
            </button>
            <button
              type="button"
              onClick={() => setEmojiMode(true)}
              className={`flex-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                emojiMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="inline-flex items-center gap-1"><Smile className="w-3 h-3" /> Emoji</span>
            </button>
          </div>

          {emojiMode ? (
            <div>
              <input
                autoFocus
                value={ICON_CATALOG[value] ? '' : (value || '')}
                onChange={e => onChange(e.target.value)}
                placeholder="🤖"
                maxLength={4}
                className="w-full px-3 py-3 text-center text-2xl border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
              />
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">Pega cualquier emoji</p>
            </div>
          ) : (
            <>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar icono..."
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
              />
              <div className="grid grid-cols-6 gap-1 max-h-52 overflow-y-auto">
                {filtered.map(([name, Icon]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => { onChange(name); setOpen(false); setSearch('') }}
                    title={name}
                    className={`w-9 h-9 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors ${
                      value === name ? 'bg-[var(--brand-primary)]/10 ring-1 ring-[var(--brand-primary)]/30' : ''
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${value === name ? 'text-[var(--brand-primary)]' : 'text-slate-700'}`} />
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="col-span-6 text-center py-4 text-xs text-slate-400">Sin resultados</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={(e) => { e.stopPropagation(); onChange() }}
      title={on ? 'Apagar globalmente (todas las orgs)' : 'Encender globalmente (todas las orgs)'}
      className={`relative inline-flex items-center h-6 w-10 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
        on
          ? 'bg-emerald-500 hover:bg-emerald-600'
          : 'bg-slate-300 hover:bg-slate-400'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function FieldGroup({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

const INPUT = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"

export default function AgentesAdminModule() {
  const { token } = useAuth()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingAgent, setEditingAgent] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [newAgent, setNewAgent] = useState({
    module_id: '', name: '', description: '', icon: 'Bot', type: 'iframe', url: '',
  })

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/modules/agent-configs', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setAgents(data.agents || [])
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => { fetchAgents() }, [])

  const toggleActive = async (agent) => {
    const next = !agent.active
    const prev = agents
    setAgents(a => a.map(x => x.module_id === agent.module_id ? { ...x, active: next } : x))
    try {
      const res = await fetch(`/api/modules/agent-global/${agent.module_id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      if (!res.ok) setAgents(prev)
    } catch {
      setAgents(prev)
    }
  }

  const saveEdit = async () => {
    if (!editingAgent) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/modules/agent-config/${editingAgent.module_id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingAgent.name,
          description: editingAgent.description,
          icon: editingAgent.icon,
          url: editingAgent.url,
        }),
      })
      if (res.ok) {
        await fetchAgents()
        setEditingAgent(null)
      } else {
        const d = await res.json()
        setError(d.error || 'Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  const createAgent = async () => {
    if (!newAgent.module_id || !newAgent.name) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/modules/agent-config', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent),
      })
      if (res.ok) {
        await fetchAgents()
        setShowNew(false)
        setNewAgent({ module_id: '', name: '', description: '', icon: 'Bot', type: 'iframe', url: '' })
      } else {
        const d = await res.json()
        setError(d.error || 'Error al crear')
      }
    } finally {
      setSaving(false)
    }
  }

  const deleteAgent = async (moduleId) => {
    if (!window.confirm('¿Eliminar este agente personalizado? Esta acción no se puede deshacer.')) return
    try {
      await fetch(`/api/modules/agent-config/${moduleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      await fetchAgents()
    } catch (e) {
      console.error(e)
    }
  }

  const stats = {
    total: agents.length,
    activos: agents.filter(a => a.active).length,
    custom: agents.filter(a => a.is_custom).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--brand-primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Agentes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestiona los agentes y herramientas disponibles en la plataforma.
            <span className="text-slate-400"> Los cambios aplican a todas las organizaciones.</span>
          </p>
        </div>
        <button
          onClick={() => { setShowNew(true); setError(null) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-[var(--brand-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nuevo Agente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Activos', value: stats.activos },
          { label: 'Personalizados', value: stats.custom },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-2xl font-semibold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Agents list */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Catálogo de Agentes</p>
        </div>
        <div className="divide-y divide-slate-50">
          {agents.map(agent => (
            <div key={agent.module_id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/50 transition-colors">
              {/* Icon */}
              <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0 select-none">
                {renderAgentIcon(agent.icon, { className: 'w-4 h-4', emojiClassName: 'text-lg leading-none' })}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-900">{agent.name}</span>
                  <TypeBadge type={agent.type} />
                  {agent.is_core && (
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-slate-100 text-slate-500 uppercase tracking-wide">Core</span>
                  )}
                  {agent.is_custom && (
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-emerald-50 text-emerald-600 uppercase tracking-wide">Custom</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{agent.description || '—'}</p>
                <p className="text-[10px] text-slate-300 mt-0.5 font-mono">{agent.route}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Toggle on={agent.active} onChange={() => toggleActive(agent)} />
                <button
                  onClick={() => { setEditingAgent({ ...agent }); setError(null) }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {agent.is_custom && (
                  <button
                    onClick={() => deleteAgent(agent.module_id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {agents.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-400 text-center">No hay agentes configurados</p>
          )}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editingAgent && (
        <Modal title="Editar Agente" onClose={() => setEditingAgent(null)}>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-20">
                <FieldGroup label="Icono">
                  <IconPicker
                    value={editingAgent.icon || ''}
                    onChange={icon => setEditingAgent(a => ({ ...a, icon }))}
                  />
                </FieldGroup>
              </div>
              <div className="flex-1">
                <FieldGroup label="Nombre">
                  <input
                    value={editingAgent.name || ''}
                    onChange={e => setEditingAgent(a => ({ ...a, name: e.target.value }))}
                    className={INPUT}
                  />
                </FieldGroup>
              </div>
            </div>
            <FieldGroup label="Descripción">
              <textarea
                value={editingAgent.description || ''}
                onChange={e => setEditingAgent(a => ({ ...a, description: e.target.value }))}
                rows={2}
                className={`${INPUT} resize-none`}
              />
            </FieldGroup>
            <FieldGroup label="URL (para iframe)">
              <input
                value={editingAgent.url || ''}
                onChange={e => setEditingAgent(a => ({ ...a, url: e.target.value }))}
                placeholder="https://..."
                className={`${INPUT} font-mono`}
              />
            </FieldGroup>
          </div>
          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
          <ModalFooter
            onCancel={() => setEditingAgent(null)}
            onConfirm={saveEdit}
            saving={saving}
            confirmLabel="Guardar"
          />
        </Modal>
      )}

      {/* ── New Agent Modal ── */}
      {showNew && (
        <Modal title="Nuevo Agente" onClose={() => setShowNew(false)}>
          <div className="space-y-4">
            <FieldGroup label={<>ID / Ruta <span className="text-slate-400 font-normal">(ej: mi-herramienta)</span></>}>
              <input
                value={newAgent.module_id}
                onChange={e => setNewAgent(a => ({ ...a, module_id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                placeholder="mi-herramienta"
                className={`${INPUT} font-mono`}
              />
              {newAgent.module_id && (
                <p className="text-[10px] text-slate-400 mt-1">Ruta: /{newAgent.module_id}</p>
              )}
            </FieldGroup>
            <div className="flex gap-3">
              <div className="w-20">
                <FieldGroup label="Icono">
                  <IconPicker
                    value={newAgent.icon}
                    onChange={icon => setNewAgent(a => ({ ...a, icon }))}
                  />
                </FieldGroup>
              </div>
              <div className="flex-1">
                <FieldGroup label="Nombre">
                  <input
                    value={newAgent.name}
                    onChange={e => setNewAgent(a => ({ ...a, name: e.target.value }))}
                    className={INPUT}
                    placeholder="Mi Herramienta"
                  />
                </FieldGroup>
              </div>
            </div>
            <FieldGroup label="Descripción">
              <textarea
                value={newAgent.description}
                onChange={e => setNewAgent(a => ({ ...a, description: e.target.value }))}
                rows={2}
                className={`${INPUT} resize-none`}
              />
            </FieldGroup>
            <FieldGroup label="Tipo">
              <select
                value={newAgent.type}
                onChange={e => setNewAgent(a => ({ ...a, type: e.target.value }))}
                className={INPUT}
              >
                <option value="iframe">Iframe (URL externa)</option>
                <option value="module">Módulo interno</option>
              </select>
            </FieldGroup>
            {newAgent.type === 'iframe' && (
              <FieldGroup label="URL">
                <input
                  value={newAgent.url}
                  onChange={e => setNewAgent(a => ({ ...a, url: e.target.value }))}
                  placeholder="https://..."
                  className={`${INPUT} font-mono`}
                />
              </FieldGroup>
            )}
          </div>
          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
          <ModalFooter
            onCancel={() => setShowNew(false)}
            onConfirm={createAgent}
            saving={saving}
            confirmLabel="Crear Agente"
            confirmIcon={<Plus className="w-4 h-4" />}
            disabled={!newAgent.module_id || !newAgent.name}
          />
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

function ModalFooter({ onCancel, onConfirm, saving, confirmLabel, confirmIcon, disabled }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-50">
      <button
        onClick={onCancel}
        className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
      >
        Cancelar
      </button>
      <button
        onClick={onConfirm}
        disabled={saving || disabled}
        className="flex items-center gap-1.5 px-4 py-2 bg-[var(--brand-primary)] text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving
          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : (confirmIcon || <Check className="w-4 h-4" />)
        }
        {confirmLabel}
      </button>
    </div>
  )
}
