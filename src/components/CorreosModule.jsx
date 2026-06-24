import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGoogleOAuth } from '../hooks/useGoogleOAuth'
import { Mail, Send, Loader2, Link2, Sparkles, Inbox, RefreshCw, Unlink, AlertTriangle } from 'lucide-react'

const SCOPE = 'https://www.googleapis.com/auth/gmail.modify'

const SUGERENCIAS = [
  'Resúmeme mis correos',
  '¿Hay algo urgente?',
  '¿Tengo correos de algún cliente?',
  '¿Qué no he leído?',
]

const FASES = ['Leyendo tus correos…', 'Analizando prioridades…', 'Redactando respuesta…']

// Render seguro (sin HTML crudo): respeta saltos de línea, viñetas ("-", "•", "1.", "2)")
// y **negritas**. Descarta líneas vacías y equilibra "**" sobrantes.
function renderBold(text, keyBase) {
  const opens = (text.match(/\*\*/g) || []).length
  const safe = opens % 2 ? text.replace(/\*\*(?=[^*]*$)/, '') : text
  return safe.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p, j) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={`${keyBase}-${j}`}>{p.slice(2, -2)}</strong>
      : <span key={`${keyBase}-${j}`}>{p}</span>
  )
}

function renderRich(text) {
  return String(text).split('\n').filter((l) => l.trim() !== '').map((line, i) => {
    const isBullet = /^\s*[-•*]\s+/.test(line)
    const numMatch = line.match(/^\s*(\d+)[.)]\s+/)
    const bullet = isBullet || !!numMatch
    const clean = line.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '')
    const marker = numMatch ? `${numMatch[1]}.` : '•'
    return (
      <p key={i} className={bullet ? 'flex gap-2' : ''}>
        {bullet && <span className="text-[var(--brand-primary)] mt-0.5">{marker}</span>}
        <span>{renderBold(clean, i)}</span>
      </p>
    )
  })
}

const CorreosModule = () => {
  const { token } = useAuth()
  const { connect, disconnect, connecting } = useGoogleOAuth()

  const [estado, setEstado] = useState('loading') // loading | disconnected | ready
  const [vinculado, setVinculado] = useState(false) // estaba conectado pero el token expiró
  const [mensajes, setMensajes] = useState([])      // [{ role, content }]
  const [input, setInput] = useState('')
  const [pensando, setPensando] = useState(false)
  const [fase, setFase] = useState(FASES[0])
  const [expirado, setExpirado] = useState(false)   // expiración a media conversación
  const [error, setError] = useState('')

  const enviandoRef = useRef(false)
  const faseTimer = useRef(null)
  const endRef = useRef(null)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/correos/estado', { headers: { Authorization: `Bearer ${token}` } })
        const d = await res.json()
        setVinculado(!!d.vinculado)
        setEstado(d.conectado ? 'ready' : 'disconnected')
      } catch {
        setEstado('disconnected')
      }
    }
    check()
    return () => { if (faseTimer.current) clearInterval(faseTimer.current) }
  }, [token])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes, pensando])

  const handleConnect = async () => {
    setError('')
    try {
      await connect('google-gmail', SCOPE)
      setExpirado(false)
      setVinculado(true)
      setEstado('ready')
    } catch {
      setError('No se pudo conectar Gmail. Intenta de nuevo.')
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect('google-gmail')
      setMensajes([])
      setExpirado(false)
      setVinculado(false)
      setEstado('disconnected')
    } catch {
      setError('No se pudo desconectar.')
    }
  }

  const nuevaConversacion = () => { setMensajes([]); setInput(''); setError('') }

  const enviar = async (texto) => {
    const msg = (texto ?? input).trim()
    if (!msg || enviandoRef.current) return
    enviandoRef.current = true
    const historialPrevio = mensajes.slice(-8)
    setInput('')
    setMensajes((m) => [...m, { role: 'user', content: msg }])
    setPensando(true)
    setFase(FASES[0])
    let i = 0
    faseTimer.current = setInterval(() => { i = (i + 1) % FASES.length; setFase(FASES[i]) }, 2500)
    try {
      const res = await fetch('/api/correos/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mensaje: msg, history: historialPrevio }),
      })
      const d = await res.json()
      if (!res.ok) {
        // Expiración: NO expulsamos del chat; mostramos banner de reconexión y conservamos la conversación.
        if (d.code === 'GMAIL_EXPIRED' || d.code === 'NO_GMAIL') setExpirado(true)
        throw new Error(d.error || 'No se pudo responder')
      }
      setMensajes((m) => [...m, { role: 'assistant', content: d.respuesta }])
    } catch (e) {
      setMensajes((m) => [...m, { role: 'assistant', content: `⚠️ ${e.message}` }])
    } finally {
      if (faseTimer.current) { clearInterval(faseTimer.current); faseTimer.current = null }
      enviandoRef.current = false
      setPensando(false)
    }
  }

  const onSubmit = (e) => { e.preventDefault(); enviar() }

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
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Asistente de Correos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
            {vinculado
              ? 'Tu sesión de Gmail expiró. Reconéctala para seguir usando el asistente.'
              : 'Conecta tu Gmail y háblale a tu bandeja: pídele un resumen, que te diga qué es urgente, o pregúntale lo que quieras sobre tus correos.'}
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting === 'google-gmail'}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--brand-primary)] hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
          >
            <Link2 className="w-4 h-4" />
            {connecting === 'google-gmail' ? 'Conectando…' : (vinculado ? 'Reconectar Gmail' : 'Conectar Gmail')}
          </button>
          {error && <p className="text-xs text-red-500 dark:text-red-400 mt-4">{error}</p>}
        </div>
      </div>
    )
  }

  // ── Chatbot ──
  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--brand-primary)]/10 rounded-lg">
            <Mail className="w-5 h-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Asistente de Correos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Háblale a tu bandeja de Gmail.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mensajes.length > 0 && (
            <button
              onClick={nuevaConversacion}
              disabled={pensando}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 rounded-lg transition-all disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Nueva
            </button>
          )}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
            <Inbox className="w-3 h-3" /> Conectado
          </span>
          <button
            onClick={handleDisconnect}
            disabled={connecting === 'google-gmail'}
            title="Desconectar Gmail"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto py-5 space-y-4" role="log" aria-live="polite" aria-relevant="additions">
        {mensajes.length === 0 && (
          <div className="text-center mt-6">
            <div className="w-14 h-14 bg-[var(--brand-primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7 text-[var(--brand-primary)]" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">¿Qué quieres saber de tus correos?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">Escríbeme o elige una sugerencia.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  disabled={pensando}
                  className="px-3.5 py-2 rounded-full text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed space-y-1 ${
              m.role === 'user'
                ? 'bg-[var(--brand-primary)] text-white rounded-br-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm'
            }`}>
              {m.role === 'assistant' ? renderRich(m.content) : m.content}
            </div>
          </div>
        ))}

        {pensando && (
          <div className="flex justify-start" role="status">
            <span className="sr-only">{fase}</span>
            <div className="bg-slate-100 dark:bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2" aria-hidden="true">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{fase}</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Banner de reconexión (expiración a media conversación, sin perder el chat) */}
      {expirado && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Tu conexión de Gmail expiró.</span>
          <button onClick={handleConnect} className="font-semibold underline hover:no-underline">Reconectar</button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={onSubmit} className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pídele algo… ej. resúmeme los correos de hoy"
          aria-label="Escribe tu pregunta sobre tus correos"
          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
        />
        <button
          type="submit"
          disabled={!input.trim() || pensando}
          aria-label={pensando ? 'Enviando' : 'Enviar mensaje'}
          className="p-3 rounded-xl bg-[var(--brand-primary)] text-white hover:opacity-90 transition-all disabled:opacity-40"
        >
          {pensando ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Send className="w-5 h-5" aria-hidden="true" />}
        </button>
      </form>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 text-center">
        Analiza tus 20 correos más recientes del INBOX · Próximamente: envío a WhatsApp.
      </p>
    </div>
  )
}

export default CorreosModule
