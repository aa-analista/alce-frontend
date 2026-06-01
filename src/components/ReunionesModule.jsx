/**
 * Procesador de Transcripciones de Reuniones (visión "Accountability Partner").
 * Pegas la transcripción → eliges FORMATO de salida (minuta, WhatsApp, presentación,
 * pendientes, personalizado) y MODELO (auto/económico/calidad) → la IA lo genera.
 */
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Mic, Loader2, Copy, CheckCircle2, FileText, ListChecks, Users, ArrowRight,
  AlertTriangle, Wand2, RotateCcw, MessageCircle, Presentation, ClipboardList,
  Settings2, Zap, Sparkles, FileStack
} from 'lucide-react'

const NAVY = 'var(--brand-primary, #101C44)'

const PRIORIDAD_CSS = {
  alta:  'bg-red-50 text-red-700 border-red-200',
  media: 'bg-amber-50 text-amber-700 border-amber-200',
  baja:  'bg-slate-100 text-slate-600 border-slate-200',
}

const FORMATOS = [
  { id: 'minuta',       label: 'Minuta completa', icon: FileText,      desc: 'Resumen + decisiones + pendientes + próximos pasos' },
  { id: 'whatsapp',     label: 'Mensaje WhatsApp', icon: MessageCircle, desc: 'Update listo para mandar a un grupo' },
  { id: 'presentacion', label: 'Presentación',     icon: Presentation,  desc: 'Bullets organizados para diapositivas' },
  { id: 'pendientes',   label: 'Solo pendientes',  icon: ClipboardList, desc: 'Únicamente la lista de acciones' },
  { id: 'custom',       label: 'Personalizado',    icon: Settings2,     desc: 'Tú le dices exactamente qué hacer' },
]

const MODELOS = [
  { id: 'auto',      label: 'Auto', icon: Sparkles, desc: 'Elige el modelo según la longitud (recomendado)' },
  { id: 'economico', label: 'Económico', icon: Zap, desc: 'gpt-4o-mini — más barato' },
  { id: 'calidad',   label: 'Máxima calidad', icon: Wand2, desc: 'gpt-4o — mejor síntesis' },
]

const fmtFecha = (d) => {
  if (!d) return null
  try { return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

export default function ReunionesModule() {
  const { token } = useAuth()
  const [texto, setTexto] = useState('')
  const [formato, setFormato] = useState('minuta')
  const [instrucciones, setInstrucciones] = useState('')
  const [modelo, setModelo] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [estimacion, setEstimacion] = useState(null)
  const estTimer = useRef(null)

  // Estimación en vivo (debounced) cuando cambia el texto o el modelo
  useEffect(() => {
    if (texto.trim().length < 50) { setEstimacion(null); return }
    clearTimeout(estTimer.current)
    estTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/reuniones/estimar', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ transcripcion: texto, modelo }),
        })
        if (res.ok) setEstimacion(await res.json())
      } catch {}
    }, 500)
    return () => clearTimeout(estTimer.current)
  }, [texto, modelo, token])

  const procesar = async () => {
    if (texto.trim().length < 50) { setError('Pega una transcripción más larga (mínimo 50 caracteres).'); return }
    if (formato === 'custom' && !instrucciones.trim()) { setError('Escribe qué quieres que haga la IA.'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/reuniones/procesar', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transcripcion: texto, formato, instrucciones, modelo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar')
      setResult(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const copiarTexto = async (str) => {
    try { await navigator.clipboard.writeText(str); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  const copiarMinuta = () => {
    if (!result) return
    const L = []
    L.push(`# ${result.titulo}\n`)
    if (result.resumen) L.push(`## Resumen\n${result.resumen}\n`)
    if (result.participantes?.length) L.push(`## Participantes\n${result.participantes.map(p => `- ${p}`).join('\n')}\n`)
    if (result.temas?.length) L.push(`## Temas\n${result.temas.map(t => `- ${t}`).join('\n')}\n`)
    if (result.decisiones?.length) L.push(`## Decisiones\n${result.decisiones.map(d => `- ${d}`).join('\n')}\n`)
    if (result.pendientes?.length) {
      L.push(`## Pendientes`)
      result.pendientes.forEach(p => {
        const meta = [p.responsable, fmtFecha(p.fecha_sugerida), p.prioridad].filter(Boolean).join(' · ')
        L.push(`- [ ] ${p.tarea}${meta ? ` (${meta})` : ''}`)
      })
      L.push('')
    }
    if (result.proximos_pasos?.length) L.push(`## Próximos pasos\n${result.proximos_pasos.map(s => `- ${s}`).join('\n')}\n`)
    copiarTexto(L.join('\n'))
  }

  const reset = () => { setResult(null); setError('') }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white" style={{ background: NAVY }}>
            <Mic className="w-5 h-5" />
          </span>
          Asistente de Reuniones
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pega una transcripción y elige qué quieres: minuta, mensaje de WhatsApp, presentación o lo que necesites.
        </p>
      </div>

      {!result && (
        <>
          {/* Selector de formato */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">¿Qué quieres generar?</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {FORMATOS.map(f => {
                const Icon = f.icon
                const active = formato === f.id
                return (
                  <button key={f.id} onClick={() => setFormato(f.id)} title={f.desc}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${active ? 'shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                    style={active ? { borderColor: NAVY, background: 'var(--brand-primary-soft, #f0f4f9)' } : {}}>
                    <Icon className="w-4 h-4 mb-1.5" style={{ color: active ? NAVY : '#94a3b8' }} />
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">{f.label}</p>
                  </button>
                )
              })}
            </div>
            {formato === 'custom' && (
              <input value={instrucciones} onChange={e => setInstrucciones(e.target.value)}
                placeholder="Ej: Hazme un correo formal para el cliente con los acuerdos…"
                className="mt-2 w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#101C44)]/15" />
            )}
          </div>

          {/* Textarea */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">Transcripción</label>
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={12}
              placeholder="Pega aquí el texto de la transcripción (de Gemini, Zoom, Meet, Otter, etc.)…"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#101C44)]/15 resize-y leading-relaxed" />

            {/* Modelo + estimación */}
            <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Modelo:</span>
                <div className="inline-flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 gap-0.5">
                  {MODELOS.map(m => (
                    <button key={m.id} onClick={() => setModelo(m.id)} title={m.desc}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${modelo === m.id ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {estimacion && estimacion.model && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />
                  {estimacion.model} · ~{estimacion.input_tokens.toLocaleString('es-MX')} tokens · ≈ ${estimacion.costo_usd} USD
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <span className="text-xs text-slate-400">{texto.length.toLocaleString('es-MX')} caracteres</span>
              <div className="flex gap-2">
                {texto && (
                  <button onClick={() => { setTexto(''); setEstimacion(null) }} className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Limpiar
                  </button>
                )}
                <button onClick={procesar} disabled={loading || texto.trim().length < 50}
                  className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 flex items-center gap-2" style={{ background: NAVY }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {loading ? 'Generando…' : 'Generar con IA'}
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
          </div>
        </>
      )}

      {/* RESULTADO */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{result.titulo}</h3>
              {result.usado && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {result.usado.modelo} · {result.usado.tokens?.toLocaleString('es-MX')} tokens · ${result.usado.costo_usd} USD
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {result.tipo === 'texto' ? (
                <>
                  <button onClick={() => copiarTexto(result.contenido)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg">
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  {result.formato === 'whatsapp' && (
                    <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(result.contenido)}`, '_blank', 'noopener')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg">
                      <MessageCircle className="w-3.5 h-3.5" /> Enviar por WhatsApp
                    </button>
                  )}
                </>
              ) : (
                <button onClick={copiarMinuta} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg">
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar todo'}
                </button>
              )}
              <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg" style={{ background: NAVY }}>
                <Mic className="w-3.5 h-3.5" /> Nueva
              </button>
            </div>
          </div>

          {/* Texto plano (whatsapp / presentación / custom) */}
          {result.tipo === 'texto' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <pre className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">{result.contenido}</pre>
            </div>
          )}

          {/* Estructurado: pendientes (siempre que existan) */}
          {result.tipo === 'estructurado' && (
            <>
              {result.resumen && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-center gap-2 mb-2"><FileText className="w-4 h-4" style={{ color: NAVY }} /><h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">Resumen</h4></div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.resumen}</p>
                  {result.participantes?.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {result.participantes.map((p, i) => <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{p}</span>)}
                    </div>
                  )}
                </div>
              )}

              {result.pendientes?.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 overflow-hidden" style={{ borderColor: NAVY }}>
                  <div className="px-5 py-3 flex items-center gap-2 text-white" style={{ background: NAVY }}>
                    <ClipboardList className="w-4 h-4" /><h4 className="text-sm font-bold uppercase tracking-wide">Pendientes ({result.pendientes.length})</h4>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {result.pendientes.map((p, i) => (
                      <div key={i} className="px-5 py-3 flex items-start gap-3">
                        <div className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.tarea}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {p.responsable && <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" /> {p.responsable}</span>}
                            {p.fecha_sugerida && <span className="text-[11px] text-slate-500 dark:text-slate-400">📅 {fmtFecha(p.fecha_sugerida)}</span>}
                            {p.prioridad && <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${PRIORIDAD_CSS[p.prioridad] || PRIORIDAD_CSS.media}`}>{p.prioridad}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(result.decisiones?.length > 0 || result.temas?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.decisiones?.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                      <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">Decisiones</h4></div>
                      <ul className="space-y-2">{result.decisiones.map((d, i) => <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2"><span className="text-emerald-500 mt-1">✓</span> {d}</li>)}</ul>
                    </div>
                  )}
                  {result.temas?.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                      <div className="flex items-center gap-2 mb-3"><ListChecks className="w-4 h-4" style={{ color: NAVY }} /><h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">Temas</h4></div>
                      <ul className="space-y-2">{result.temas.map((t, i) => <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: NAVY }} /> {t}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}

              {result.proximos_pasos?.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-center gap-2 mb-3"><ArrowRight className="w-4 h-4" style={{ color: NAVY }} /><h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">Próximos pasos</h4></div>
                  <ol className="space-y-2">{result.proximos_pasos.map((s, i) => <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2.5"><span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0" style={{ background: NAVY }}>{i + 1}</span> {s}</li>)}</ol>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
