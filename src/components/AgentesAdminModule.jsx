import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react'

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

function Toggle({ on, disabled, onChange }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      title={disabled ? 'Módulo core — siempre activo' : (on ? 'Apagar globalmente (todas las orgs)' : 'Encender globalmente (todas las orgs)')}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
        on ? 'bg-emerald-400' : 'bg-slate-200'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
        on ? 'translate-x-4' : 'translate-x-0.5'
      }`} />
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
    module_id: '', name: '', description: '', icon: '🤖', type: 'iframe', url: '',
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
    if (agent.is_core) return
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
        setNewAgent({ module_id: '', name: '', description: '', icon: '🤖', type: 'iframe', url: '' })
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
              <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-lg flex-shrink-0 select-none">
                {agent.icon || '🤖'}
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
                <Toggle on={agent.active} disabled={agent.is_core} onChange={() => toggleActive(agent)} />
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
              <FieldGroup label="Icono">
                <input
                  value={editingAgent.icon || ''}
                  onChange={e => setEditingAgent(a => ({ ...a, icon: e.target.value }))}
                  className={`${INPUT} w-16 text-center text-xl`}
                  placeholder="🤖"
                />
              </FieldGroup>
              <FieldGroup label="Nombre">
                <input
                  value={editingAgent.name || ''}
                  onChange={e => setEditingAgent(a => ({ ...a, name: e.target.value }))}
                  className={INPUT}
                />
              </FieldGroup>
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
              <FieldGroup label="Icono">
                <input
                  value={newAgent.icon}
                  onChange={e => setNewAgent(a => ({ ...a, icon: e.target.value }))}
                  className={`${INPUT} w-16 text-center text-xl`}
                  placeholder="🤖"
                />
              </FieldGroup>
              <FieldGroup label="Nombre">
                <input
                  value={newAgent.name}
                  onChange={e => setNewAgent(a => ({ ...a, name: e.target.value }))}
                  className={INPUT}
                  placeholder="Mi Herramienta"
                />
              </FieldGroup>
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
