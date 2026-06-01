/**
 * Procesador de Transcripciones de Reuniones (visión "Accountability Partner").
 * Pegas la transcripción → la IA extrae resumen, temas, decisiones, pendientes y próximos pasos.
 */
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Mic, Sparkles, Loader2, Copy, CheckCircle2, FileText, ListChecks, Flag,
  ClipboardList, Users, ArrowRight, AlertTriangle, Wand2, RotateCcw
} from 'lucide-react'

const NAVY = 'var(--brand-primary, #101C44)'

const PRIORIDAD_CSS = {
  alta:  'bg-red-50 text-red-700 border-red-200',
  media: 'bg-amber-50 text-amber-700 border-amber-200',
  baja:  'bg-slate-100 text-slate-600 border-slate-200',
}

const fmtFecha = (d) => {
  if (!d) return null
  try { return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

export default function ReunionesModule() {
  const { token } = useAuth()
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const procesar = async () => {
    if (texto.trim().length < 50) { setError('Pega una transcripción más larga (mínimo 50 caracteres).'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/reuniones/procesar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transcripcion: texto }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar')
      setResult(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const copiarTodo = async () => {
    if (!result) return
    const lines = []
    lines.push(`# ${result.titulo}\n`)
    if (result.resumen) lines.push(`## Resumen\n${result.resumen}\n`)
    if (result.participantes?.length) lines.push(`## Participantes\n${result.participantes.map(p => `- ${p}`).join('\n')}\n`)
    if (result.temas?.length) lines.push(`## Temas\n${result.temas.map(t => `- ${t}`).join('\n')}\n`)
    if (result.decisiones?.length) lines.push(`## Decisiones\n${result.decisiones.map(d => `- ${d}`).join('\n')}\n`)
    if (result.pendientes?.length) {
      lines.push(`## Pendientes`)
      result.pendientes.forEach(p => {
        const meta = [p.responsable, fmtFecha(p.fecha_sugerida), p.prioridad].filter(Boolean).join(' · ')
        lines.push(`- [ ] ${p.tarea}${meta ? ` (${meta})` : ''}`)
      })
      lines.push('')
    }
    if (result.proximos_pasos?.length) lines.push(`## Próximos pasos\n${result.proximos_pasos.map(s => `- ${s}`).join('\n')}\n`)
    try { await navigator.clipboard.writeText(lines.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  const reset = () => { setTexto(''); setResult(null); setError('') }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white" style={{ background: NAVY }}>
              <Mic className="w-5 h-5" />
            </span>
            Asistente de Reuniones
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pega la transcripción de una reunión y la IA extrae resumen, decisiones y pendientes automáticamente.
          </p>
        </div>
      </div>

      {!result && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
            Transcripción de la reunión
          </label>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={14}
            placeholder="Pega aquí el texto de la transcripción (de Gemini, Zoom, Meet, Otter, etc.)…"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#101C44)]/15 focus:bg-white dark:focus:bg-slate-900 resize-y leading-relaxed"
          />
          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <span className="text-xs text-slate-400">{texto.length.toLocaleString('es-MX')} caracteres</span>
            <div className="flex gap-2">
              {texto && (
                <button onClick={reset} className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Limpiar
                </button>
              )}
              <button onClick={procesar} disabled={loading || texto.trim().length < 50}
                className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                style={{ background: NAVY }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {loading ? 'Analizando…' : 'Procesar con IA'}
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="space-y-4">
          {/* Acciones */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{result.titulo}</h3>
            <div className="flex gap-2">
              <button onClick={copiarTodo} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar todo'}
              </button>
              <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg" style={{ background: NAVY }}>
                <Mic className="w-3.5 h-3.5" /> Nueva reunión
              </button>
            </div>
          </div>

          {/* Resumen + participantes */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" style={{ color: NAVY }} />
              <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">Resumen</h4>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.resumen}</p>
            {result.participantes?.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                {result.participantes.map((p, i) => (
                  <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{p}</span>
                ))}
              </div>
            )}
          </div>

          {/* Pendientes — lo más importante */}
          {result.pendientes?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 overflow-hidden" style={{ borderColor: NAVY }}>
              <div className="px-5 py-3 flex items-center gap-2 text-white" style={{ background: NAVY }}>
                <ClipboardList className="w-4 h-4" />
                <h4 className="text-sm font-bold uppercase tracking-wide">Pendientes ({result.pendientes.length})</h4>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {result.pendientes.map((p, i) => (
                  <div key={i} className="px-5 py-3 flex items-start gap-3">
                    <div className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.tarea}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {p.responsable && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {p.responsable}
                          </span>
                        )}
                        {p.fecha_sugerida && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">📅 {fmtFecha(p.fecha_sugerida)}</span>
                        )}
                        {p.prioridad && (
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${PRIORIDAD_CSS[p.prioridad] || PRIORIDAD_CSS.media}`}>
                            {p.prioridad}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid: decisiones + temas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.decisiones?.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">Decisiones</h4>
                </div>
                <ul className="space-y-2">
                  {result.decisiones.map((d, i) => (
                    <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-500 mt-1">✓</span> {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.temas?.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="w-4 h-4" style={{ color: NAVY }} />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">Temas tratados</h4>
                </div>
                <ul className="space-y-2">
                  {result.temas.map((t, i) => (
                    <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: NAVY }} /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Próximos pasos */}
          {result.proximos_pasos?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="w-4 h-4" style={{ color: NAVY }} />
                <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">Próximos pasos</h4>
              </div>
              <ol className="space-y-2">
                {result.proximos_pasos.map((s, i) => (
                  <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0" style={{ background: NAVY }}>{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
