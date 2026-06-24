import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGoogleOAuth } from '../hooks/useGoogleOAuth'
import {
  Mail, Sparkles, Send, AlertCircle, Loader2, Star, Link2,
  RefreshCw, Inbox, Tag, Bot
} from 'lucide-react'

const SCOPE = 'https://www.googleapis.com/auth/gmail.modify'

const CorreosModule = () => {
  const { token } = useAuth()
  const { connect, connecting } = useGoogleOAuth()

  const [estado, setEstado] = useState('loading') // loading | disconnected | ready
  const [generando, setGenerando] = useState(false)
  const [data, setData] = useState(null)          // { resumen, prioritarios, categorias, totalCorreos }
  const [error, setError] = useState('')

  // Chat ("háblale a tus correos")
  const [pregunta, setPregunta] = useState('')
  const [chat, setChat] = useState([])            // [{ role, content }]
  const [respondiendo, setRespondiendo] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/correos/estado', { headers: { Authorization: `Bearer ${token}` } })
        const d = await res.json()
        setEstado(d.conectado ? 'ready' : 'disconnected')
      } catch {
        setEstado('disconnected')
      }
    }
    check()
  }, [token])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat, respondiendo])

  const handleConnect = async () => {
    try {
      await connect('google-gmail', SCOPE)
      setEstado('ready')
    } catch (e) {
      setError('No se pudo conectar Gmail. Intenta de nuevo.')
    }
  }

  const generarResumen = async () => {
    setGenerando(true); setError(''); setData(null)
    try {
      const res = await fetch('/api/correos/resumen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      })
      const d = await res.json()
      if (!res.ok) {
        if (d.code === 'GMAIL_EXPIRED' || d.code === 'NO_GMAIL') setEstado('disconnected')
        throw new Error(d.error || 'No se pudo generar el resumen')
      }
      setData(d)
    } catch (e) {
      setError(e.message)
    }
    setGenerando(false)
  }

  const enviarPregunta = async (e) => {
    e.preventDefault()
    const q = pregunta.trim()
    if (!q || respondiendo) return
    setPregunta('')
    setChat((c) => [...c, { role: 'user', content: q }])
    setRespondiendo(true)
    try {
      const res = await fetch('/api/correos/resumen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pregunta: q }),
      })
      const d = await res.json()
      if (!res.ok) {
        if (d.code === 'GMAIL_EXPIRED' || d.code === 'NO_GMAIL') setEstado('disconnected')
        throw new Error(d.error || 'No se pudo responder')
      }
      setChat((c) => [...c, { role: 'assistant', content: d.respuesta || '(sin respuesta)' }])
    } catch (e) {
      setChat((c) => [...c, { role: 'assistant', content: `⚠️ ${e.message}` }])
    }
    setRespondiendo(false)
  }

  // ── Loading ──
  if (estado === 'loading') {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  // ── No conectado ──
  if (estado === 'disconnected') {
    return (
      <div className="max-w-xl mx-auto mt-10">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
          <div className="w-16 h-16 bg-[var(--brand-primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-[var(--brand-primary)]" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Resumen de Correos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
            Conecta tu Gmail y deja que la IA te dé un resumen ejecutivo, te priorice lo urgente y responda lo que le preguntes sobre tu bandeja.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting === 'google-gmail'}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--brand-primary)] hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
          >
            <Link2 className="w-4 h-4" />
            {connecting === 'google-gmail' ? 'Conectando…' : 'Conectar Gmail'}
          </button>
          {error && <p className="text-xs text-red-500 mt-4">{error}</p>}
        </div>
      </div>
    )
  }

  // ── Conectado ──
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--brand-primary)]/10 rounded-lg">
            <Mail className="w-5 h-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Resumen de Correos</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Tu asistente ejecutivo de bandeja de entrada.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
          <Inbox className="w-3 h-3" /> Gmail conectado
        </span>
      </div>

      {/* Acción principal */}
      <div className="bg-gradient-to-br from-[var(--brand-primary)]/5 to-transparent border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Genera un resumen inteligente de tus correos recientes.</p>
        <button
          onClick={generarResumen}
          disabled={generando}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:opacity-90 transition-all disabled:opacity-60 shadow-sm"
        >
          {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generando ? 'Analizando tu bandeja…' : 'Dame el resumen de mis correos'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Resultado */}
      {data && (
        <div className="space-y-4">
          {/* Resumen ejecutivo */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Resumen ejecutivo</h3>
              <span className="ml-auto text-xs text-slate-400">{data.totalCorreos} correos</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{data.resumen}</p>
          </div>

          {/* Prioritarios */}
          {data.prioritarios?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Prioritarios</h3>
              </div>
              <ul className="space-y-3">
                {data.prioritarios.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.asunto || '(Sin asunto)'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.remitente}</p>
                      {p.porque && <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{p.porque}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Categorías */}
          {data.categorias?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-[var(--brand-primary)]" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Categorías</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.categorias.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    {c.nombre}
                    {c.cantidad ? <span className="text-slate-400">· {c.cantidad}</span> : null}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat: háblale a tus correos */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <Bot className="w-4 h-4 text-[var(--brand-primary)]" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Pregúntale a tus correos</h3>
        </div>

        {chat.length > 0 && (
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[var(--brand-primary)] text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {respondiendo && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-700 px-3.5 py-2 rounded-2xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        <form onSubmit={enviarPregunta} className="p-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <input
            type="text"
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="Ej. ¿Hay algo urgente de un cliente hoy?"
            className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
          />
          <button
            type="submit"
            disabled={!pregunta.trim() || respondiendo}
            className="p-2.5 rounded-xl bg-[var(--brand-primary)] text-white hover:opacity-90 transition-all disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <RefreshCw className="w-3 h-3" /> Analiza tus 15 correos más recientes del INBOX. Próximamente: envío automático a WhatsApp.
      </p>
    </div>
  )
}

export default CorreosModule
