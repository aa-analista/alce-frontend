import { useState, useEffect } from 'react'
import { handleUpdate } from '../utils/api'
import { Save, Bot, History, Clock, RefreshCw, Eye, Zap } from 'lucide-react'
import { useAssistant } from '../context/AssistantContext'
import AgentAdminPanel from './AgentAdminPanel'

const AgenteModule = () => {
  const [agentId, setAgentId] = useState('AGENTE_001')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [activePrompt, setActivePrompt] = useState(null)
  const [loadingActive, setLoadingActive] = useState(false)
  const { lastAction } = useAssistant()

  // Listen to Voice Assistant actions
  useEffect(() => {
    if (lastAction?.action === 'fill_prompt' && lastAction?.data?.promptText) {
      setPrompt(lastAction.data.promptText)
    }
  }, [lastAction])

  // Fetch active prompt
  const fetchActivePrompt = async () => {
    setLoadingActive(true)
    try {
      const res = await fetch(`/api/n8n/webhook/prompt-read?agent_id=${encodeURIComponent(agentId)}`)
      if (res.ok) {
        const data = await res.json()
        setActivePrompt(Array.isArray(data) ? data[0] || null : data)
      }
    } catch (err) {
      console.error('Error fetching active prompt:', err)
    }
    setLoadingActive(false)
  }

  // Fetch prompt history
  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/n8n/webhook/prompt-history?agent_id=${encodeURIComponent(agentId)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setHistory(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    }
    setLoadingHistory(false)
  }

  // Load data on mount and when agentId changes
  useEffect(() => {
    fetchActivePrompt()
    fetchHistory()
  }, [agentId])

  const onUpdate = async () => {
    setLoading(true)
    const result = await handleUpdate('/api/n8n/webhook/prompt-save', {
      agent_id: agentId,
      prompt: prompt,
      source: 'ALCE-Dashboard'
    })
    setLoading(false)
    setStatus(result.success ? 'success' : 'error')
    if (result.success) {
      setPrompt('')
      fetchActivePrompt()
      fetchHistory()
    }
    setTimeout(() => setStatus(null), 3000)
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <AgentAdminPanel moduleId="agente" />

      {/* Active Prompt Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 rounded-xl shadow-sm text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-indigo-200" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-indigo-100">Prompt Activo</h3>
          </div>
          {activePrompt && (
            <span className="text-xs bg-white/15 px-3 py-1 rounded-md font-medium">
              {formatDate(activePrompt.updated_at)}
            </span>
          )}
        </div>
        {loadingActive ? (
          <div className="flex items-center space-x-2 text-indigo-200 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>Cargando prompt activo...</span>
          </div>
        ) : activePrompt ? (
          <pre className="bg-white/10 rounded-lg p-4 text-sm font-mono whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed text-white/90">
            {activePrompt.prompt}
          </pre>
        ) : (
          <p className="text-indigo-200 text-sm">No hay un prompt activo para este agente.</p>
        )}
      </div>

      {/* Editor Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Bot className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Prompting del Sistema</h2>
            <p className="text-sm text-slate-500">Define el comportamiento y la identidad de tu asistente virtual.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">ID del Agente</label>
              <input
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 outline-none transition-all text-sm"
                placeholder="Ej: AGENTE_001"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">System Prompt</label>
            <div className="rounded-lg border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:border-indigo-500/40 transition-all">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Editor</span>
                <span className="text-xs text-slate-400">{prompt.length} chars</span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-72 p-4 bg-white focus:outline-none text-slate-700 font-mono text-sm leading-relaxed resize-none"
                placeholder="Escribe aqui las instrucciones para el agente..."
              ></textarea>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              onClick={onUpdate}
              disabled={loading}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                loading ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              }`}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Actualizar Agente</span>
                </>
              )}
            </button>
          </div>
        </div>

        {status && (
          <div className={`mt-4 p-3 rounded-lg text-center text-sm font-medium ${
            status === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {status === 'success' ? 'Prompt enviado a N8N!' : 'Error al conectar con el webhook.'}
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <History className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900 text-sm">Historial de Prompts</h2>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md">
              {history.length}
            </span>
          </div>
          <button
            onClick={fetchHistory}
            disabled={loadingHistory}
            className="flex items-center space-x-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {loadingHistory && history.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent mx-auto mb-3"></div>
            <p className="text-sm">Cargando historial...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <History className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay prompts registrados para este agente.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map((item) => (
              <div key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <div
                  className="px-5 py-3.5 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-1 h-8 rounded-full bg-indigo-200 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 truncate max-w-md">
                        {item.prompt?.substring(0, 80)}{item.prompt?.length > 80 ? '...' : ''}
                      </p>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="flex items-center space-x-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(item.updated_at)}</span>
                        </span>
                        {item.source && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            {item.source}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setPrompt(item.prompt)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group"
                    title="Usar este prompt"
                  >
                    <Eye className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                  </button>
                </div>

                {/* Expanded Content */}
                {expandedId === item.id && (
                  <div className="px-5 pb-4">
                    <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {item.prompt}
                    </pre>
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

export default AgenteModule
