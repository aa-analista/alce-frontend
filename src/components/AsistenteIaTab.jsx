import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { Sparkles, Send, RotateCcw, User as UserIcon, Loader2 } from 'lucide-react'

/**
 * Pestaña "Asistente IA" — chat con el agente IA dentro de la plataforma.
 * Usa el mismo agente del bot WhatsApp (mismas tools), pero accesible desde la web.
 */

const SUGGESTIONS = [
  '¿Qué tengo hoy?',
  '¿Cómo va el equipo?',
  'Dame los detalles de las tareas de cada uno',
  '¿Qué bloqueos hay críticos?',
  'Asígnale a Lalo entregar el reporte mañana 10am, alta',
  'Recuérdame llamar a mamá el viernes 7pm',
]

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

// Markdown muy básico para **negritas**, *cursivas*, `código` y saltos de línea
function renderText(text) {
  if (!text) return null
  // Escape HTML primero
  let safe = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  safe = safe
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-[0.85em]">$1</code>')
    .replace(/\n/g, '<br/>')
  return <span dangerouslySetInnerHTML={{ __html: safe }} />
}

export default function AsistenteIaTab() {
  const { token, user } = useAuth()
  const [messages, setMessages] = useState([]) // [{role, content, time}]
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const sessionId = `web_user_${user?.id || 'unknown'}`

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    })
  }

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/assistant-ia/history?session_id=${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      const visible = (data.messages || []).filter(m => m.role === 'user' || m.role === 'assistant')
      setMessages(visible.map(m => ({ role: m.role, content: m.content, time: m.created_at })))
    } catch (e) {
      console.error('loadHistory:', e)
    } finally {
      setLoading(false)
      scrollToBottom()
    }
  }, [token, sessionId])

  useEffect(() => { loadHistory() }, [loadHistory])

  useEffect(() => { scrollToBottom() }, [messages, sending])

  const send = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || sending) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg, time: new Date().toISOString() }])
    setSending(true)
    try {
      const res = await fetch('/api/assistant-ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg, session_id: sessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error en el chat')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, time: new Date().toISOString() }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${e.message}`, time: new Date().toISOString() }])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const reset = async () => {
    if (!confirm('¿Borrar la conversación actual? Esto no afecta tus tareas, solo el historial del chat.')) return
    try {
      await fetch('/api/assistant-ia/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sessionId }),
      })
      setMessages([])
    } catch (e) { console.error(e) }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-[#1a3a3a]/5 to-blue-50/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a3a3a] to-blue-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Asistente IA</h3>
            <p className="text-[11px] text-slate-500">Mismo agente que WhatsApp · 21 herramientas disponibles</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Nueva conversación"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Nueva conversación
        </button>
      </div>

      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/30">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando conversación…
          </div>
        ) : messages.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-10">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#1a3a3a] to-blue-700 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h4 className="text-base font-semibold text-slate-900 mb-1">¡Hola, {user?.name?.split(' ')[0] || 'Efra'}!</h4>
            <p className="text-sm text-slate-500 mb-6">
              Soy tu asistente. Puedo consultar el estado del equipo, crear tareas, recordatorios, gestionar bloqueos y más.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1a3a3a] to-blue-700 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] ${m.role === 'user' ? 'order-1' : ''}`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                  }`}>
                    {renderText(m.content)}
                  </div>
                  <p className={`text-[10px] text-slate-400 mt-1 ${m.role === 'user' ? 'text-right' : ''}`}>
                    {fmtTime(m.time)}
                  </p>
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 order-2">
                    <UserIcon className="w-3.5 h-3.5 text-blue-700" />
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1a3a3a] to-blue-700 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2.5">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 bg-white p-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={sending}
            placeholder="Pregúntame algo… (Enter para enviar, Shift+Enter para nueva línea)"
            rows={1}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none max-h-32 disabled:opacity-50"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || sending}
            className="bg-[#1a3a3a] text-white rounded-xl px-4 py-2.5 hover:bg-[#0f2929] disabled:opacity-40 transition-colors flex items-center gap-1.5 text-sm font-medium"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 text-center">
          Las respuestas son generadas por IA. Confirma cambios importantes.
        </p>
      </div>
    </div>
  )
}
