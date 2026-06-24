import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGoogleOAuth } from '../hooks/useGoogleOAuth'
import {
  Mail, Send, Loader2, Link2, Sparkles, Inbox, RefreshCw, Unlink, AlertTriangle,
  Calendar, Star, Clock, User, ChevronLeft, ChevronRight
} from 'lucide-react'

const SCOPE = 'https://www.googleapis.com/auth/gmail.modify'
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

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

  const [estado, setEstado] = useState('loading')
  const [vinculado, setVinculado] = useState(false)
  const [briefing, setBriefing] = useState(null)
  const [mensajes, setMensajes] = useState([])
  const [input, setInput] = useState('')
  const [pensando, setPensando] = useState(false)
  const [expirado, setExpirado] = useState(false)
  const [error, setError] = useState('')
  const [showCal, setShowCal] = useState(false)
  const [calRef, setCalRef] = useState(() => ({ y: 2026, m: 5 })) // fallback; se ajusta en mount
  const [modoRemitente, setModoRemitente] = useState(false)

  const enviandoRef = useRef(false)
  const endRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/correos/estado', { headers: { Authorization: `Bearer ${token}` } })
        const d = await res.json()
        setVinculado(!!d.vinculado)
        if (d.conectado) {
          setEstado('ready')
          cargarBriefing()
        } else setEstado('disconnected')
      } catch { setEstado('disconnected') }
    }
    init()
  }, [token])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes, pensando])

  const cargarBriefing = async () => {
    try {
      const res = await fetch('/api/correos/briefing', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setBriefing(await res.json())
    } catch { /* no bloquea el chat */ }
  }

  const handleConnect = async () => {
    setError('')
    try { await connect('google-gmail', SCOPE); setExpirado(false); setVinculado(true); setEstado('ready'); cargarBriefing() }
    catch { setError('No se pudo conectar Gmail. Intenta de nuevo.') }
  }
  const handleDisconnect = async () => {
    try { await disconnect('google-gmail'); setMensajes([]); setBriefing(null); setExpirado(false); setVinculado(false); setEstado('disconnected') }
    catch { setError('No se pudo desconectar.') }
  }
  const nuevaConversacion = () => { setMensajes([]); setInput(''); setError(''); setModoRemitente(false) }

  const setUltimoAsistente = (texto) => {
    setMensajes((m) => {
      const copy = [...m]
      for (let i = copy.length - 1; i >= 0; i--) { if (copy[i].role === 'assistant') { copy[i] = { role: 'assistant', content: texto }; break } }
      return copy
    })
  }

  const enviar = async (texto, filtro) => {
    const msg = (texto ?? input).trim()
    if (!msg || enviandoRef.current) return
    enviandoRef.current = true
    setModoRemitente(false)
    const historialPrevio = mensajes.slice(-8)
    setInput('')
    setMensajes((m) => [...m, { role: 'user', content: msg }, { role: 'assistant', content: '' }])
    setPensando(true)
    let acc = ''
    try {
      const res = await fetch('/api/correos/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mensaje: msg, history: historialPrevio, filtro: filtro || { tipo: 'todos' } }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        if (d.code === 'GMAIL_EXPIRED' || d.code === 'NO_GMAIL') setExpirado(true)
        throw new Error(d.error || 'No se pudo responder')
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop()
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data:')) continue
          try {
            const evt = JSON.parse(line.slice(5).trim())
            if (evt.delta) { acc += evt.delta; setUltimoAsistente(acc) }
            else if (evt.error) { acc += `\n⚠️ ${evt.error}`; setUltimoAsistente(acc) }
          } catch { /* fragmento incompleto */ }
        }
      }
      if (!acc) setUltimoAsistente('No pude generar una respuesta.')
    } catch (e) {
      setUltimoAsistente(`⚠️ ${e.message}`)
    } finally {
      enviandoRef.current = false
      setPensando(false)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (modoRemitente && input.trim()) {
      const nombre = input.trim()
      enviar(`Resúmeme los correos de ${nombre}`, { tipo: 'remitente', valor: nombre })
    } else enviar()
  }

  // ── Calendario (mes en curso por defecto) ──
  useEffect(() => {
    try { const now = new Date(); setCalRef({ y: now.getFullYear(), m: now.getMonth() }) } catch { /* keep fallback */ }
  }, [])

  const buildDias = () => {
    const first = new Date(calRef.y, calRef.m, 1)
    const startDow = (first.getDay() + 6) % 7 // L=0
    const numDays = new Date(calRef.y, calRef.m + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= numDays; d++) cells.push(d)
    return cells
  }
  const clickDia = (d) => {
    if (!d) return
    const fecha = `${calRef.y}-${String(calRef.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    setShowCal(false)
    enviar(`Resúmeme los correos del ${d} de ${MESES[calRef.m]}`, { tipo: 'fecha', valor: fecha })
  }
  const hoy = (() => { try { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() } } catch { return null } })()

  if (estado === 'loading') {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" /></div>
  }

  if (estado === 'disconnected') {
    return (
      <div className="max-w-xl mx-auto mt-10">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
          <div className="w-16 h-16 bg-[var(--brand-primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><Mail className="w-8 h-8 text-[var(--brand-primary)]" /></div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Asistente de Correos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
            {vinculado ? 'Tu sesión de Gmail expiró. Reconéctala para seguir.' : 'Conecta tu Gmail y háblale a tu bandeja: resúmenes, urgentes, por persona o por día.'}
          </p>
          <button onClick={handleConnect} disabled={connecting === 'google-gmail'} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--brand-primary)] hover:opacity-90 transition-all disabled:opacity-50 shadow-sm">
            <Link2 className="w-4 h-4" />{connecting === 'google-gmail' ? 'Conectando…' : (vinculado ? 'Reconectar Gmail' : 'Conectar Gmail')}
          </button>
          {error && <p className="text-xs text-red-500 dark:text-red-400 mt-4">{error}</p>}
        </div>
      </div>
    )
  }

  const chip = 'px-3.5 py-2 rounded-full text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors disabled:opacity-50'

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--brand-primary)]/10 rounded-lg"><Mail className="w-5 h-5 text-[var(--brand-primary)]" /></div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Asistente de Correos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Háblale a tu bandeja de Gmail.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mensajes.length > 0 && (
            <button onClick={nuevaConversacion} disabled={pensando} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 rounded-lg transition-all disabled:opacity-50"><RefreshCw className="w-3.5 h-3.5" /> Nueva</button>
          )}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"><Inbox className="w-3 h-3" /> Conectado</span>
          <button onClick={handleDisconnect} disabled={connecting === 'google-gmail'} title="Desconectar Gmail" className="flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><Unlink className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Briefing */}
      {briefing && (
        <div className="grid grid-cols-3 gap-3 mt-3">
          <button onClick={() => enviar('Resúmeme mis correos sin leer', { tipo: 'sin_leer' })} className="text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:border-[var(--brand-primary)] transition-colors">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Mail className="w-3.5 h-3.5" /> Sin leer</div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white">{briefing.sinLeer}</div>
          </button>
          <button onClick={() => enviar('¿Qué correos importantes no he leído? ¿Hay algo urgente?', { tipo: 'sin_leer' })} className="text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:border-[var(--brand-primary)] transition-colors">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><AlertTriangle className="w-3.5 h-3.5" /> Urgentes</div>
            <div className="text-2xl font-semibold text-red-600 dark:text-red-400">{briefing.urgentes}</div>
          </button>
          <button onClick={() => enviar('Resúmeme mis correos de esta semana', { tipo: 'semana' })} className="text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:border-[var(--brand-primary)] transition-colors">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Clock className="w-3.5 h-3.5" /> Esta semana</div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white">{briefing.estaSemana}</div>
          </button>
        </div>
      )}

      {/* Chips inteligentes */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button className={chip} disabled={pensando} onClick={() => enviar('Resúmeme los correos de hoy', { tipo: 'hoy' })}><Calendar className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />Hoy</button>
        <button className={chip} disabled={pensando} onClick={() => enviar('Resúmeme mis correos de esta semana', { tipo: 'semana' })}>Esta semana</button>
        <button className={chip} disabled={pensando} onClick={() => enviar('Resúmeme mis correos sin leer', { tipo: 'sin_leer' })}>Sin leer</button>
        <button className={chip} disabled={pensando} onClick={() => { setModoRemitente(true); setInput('') }}><User className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />Por remitente</button>
        <button className={chip} disabled={pensando} onClick={() => setShowCal((v) => !v)}><Calendar className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />Calendario</button>
        {briefing?.topRemitente && (
          <button className={chip} disabled={pensando} onClick={() => enviar(`Resúmeme los correos de ${briefing.topRemitente.nombre}`, { tipo: 'remitente', valor: briefing.topRemitente.nombre })}>
            <Star className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />{briefing.topRemitente.nombre} ({briefing.topRemitente.cantidad})
          </button>
        )}
      </div>

      {/* Calendario */}
      {showCal && (
        <div className="mt-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setCalRef((c) => ({ y: c.m === 0 ? c.y - 1 : c.y, m: c.m === 0 ? 11 : c.m - 1 }))} className="text-slate-400 hover:text-slate-700"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">{MESES[calRef.m]} {calRef.y}</span>
            <button onClick={() => setCalRef((c) => ({ y: c.m === 11 ? c.y + 1 : c.y, m: c.m === 11 ? 0 : c.m + 1 }))} className="text-slate-400 hover:text-slate-700"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
            {DIAS.map((d, i) => <div key={i} className="text-slate-400 py-1">{d}</div>)}
            {buildDias().map((d, i) => {
              const esHoy = hoy && d === hoy.d && calRef.m === hoy.m && calRef.y === hoy.y
              return (
                <button key={i} disabled={!d || pensando} onClick={() => clickDia(d)}
                  className={`py-1.5 rounded-md text-sm transition-colors ${!d ? 'invisible' : esHoy ? 'bg-[var(--brand-primary)] text-white font-medium' : 'text-slate-700 dark:text-slate-200 hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]'}`}>
                  {d || ''}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4" role="log" aria-live="polite" aria-relevant="additions">
        {mensajes.length === 0 && (
          <div className="text-center mt-4">
            <div className="w-14 h-14 bg-[var(--brand-primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-3"><Sparkles className="w-7 h-7 text-[var(--brand-primary)]" /></div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">¿Qué quieres saber de tus correos?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Usa las tarjetas, los filtros, el calendario o escríbeme.</p>
          </div>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed space-y-1 ${m.role === 'user' ? 'bg-[var(--brand-primary)] text-white rounded-br-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm'}`}>
              {m.role === 'assistant'
                ? (m.content ? renderRich(m.content) : <span className="inline-flex items-center gap-1.5 text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> escribiendo…</span>)
                : m.content}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {expirado && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Tu conexión de Gmail expiró.</span>
          <button onClick={handleConnect} className="font-semibold underline hover:no-underline">Reconectar</button>
        </div>
      )}

      <form onSubmit={onSubmit} className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={modoRemitente ? '¿De quién? ej. Martín' : 'Pídele algo… ej. resúmeme lo urgente'}
          aria-label="Escribe tu pregunta sobre tus correos"
          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30" />
        <button type="submit" disabled={!input.trim() || pensando} aria-label={pensando ? 'Enviando' : 'Enviar mensaje'} className="p-3 rounded-xl bg-[var(--brand-primary)] text-white hover:opacity-90 transition-all disabled:opacity-40">
          {pensando ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Send className="w-5 h-5" aria-hidden="true" />}
        </button>
      </form>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 text-center">Búsqueda real en tu Gmail · Próximamente: envío a WhatsApp.</p>
    </div>
  )
}

export default CorreosModule
