import { useState, useEffect, useRef } from 'react'
import { Palette, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react'

// Mientras no haya DNS, usamos IP+puerto directo. Cuando configures
// design.alcealce.com → 5.78.149.23 cambia esto a 'https://design.alcealce.com'
const DESIGN_URL = 'http://5.78.149.23:7456'

export default function OpenDesignModule() {
  const iframeRef = useRef(null)
  const [iframeKey, setIframeKey] = useState(0)
  const [reachable, setReachable] = useState(null) // null = probing, true/false = result
  const [loading, setLoading] = useState(true)

  // Detectar mixed content: si la página está en HTTPS y el target es HTTP,
  // el browser bloqueará el iframe y el fetch — no intentamos siquiera.
  const isMixedContent =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    DESIGN_URL.startsWith('http://')

  // Probe el endpoint /api/health para detectar si el servicio responde
  useEffect(() => {
    if (isMixedContent) {
      setReachable(false)
      setLoading(false)
      return
    }
    let cancelled = false
    const probe = async () => {
      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 6000)
        const res = await fetch(`${DESIGN_URL}/api/health`, {
          signal: ctrl.signal,
          mode: 'cors',
        })
        clearTimeout(t)
        if (!cancelled) setReachable(res.ok)
      } catch {
        if (!cancelled) setReachable(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    probe()
    return () => { cancelled = true }
  }, [iframeKey, isMixedContent])

  const refresh = () => {
    setLoading(true)
    setReachable(null)
    setIframeKey((k) => k + 1)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center text-white">
          <Palette className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900">Diseño</h2>
          <p className="text-xs text-slate-500">
            Generador de prototipos, landings, decks e imágenes con IA — powered by open-design
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reiniciar
        </button>
        <a
          href={DESIGN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Abrir en pestaña
        </a>
      </div>

      {/* Estado */}
      {!isMixedContent && loading && reachable === null && (
        <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--brand-primary)] border-t-transparent mx-auto mb-3" />
            <p className="text-sm text-slate-500">Conectando con el servicio de diseño…</p>
          </div>
        </div>
      )}

      {isMixedContent && (
        <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-xl p-8">
          <div className="max-w-lg text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand-primary)] flex items-center justify-center text-white mx-auto mb-4">
              <Palette className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Open Design está listo
            </h3>
            <p className="text-sm text-slate-600 mb-5">
              Tu dashboard está en HTTPS y Open Design todavía corre por HTTP (puerto directo), así que el browser no permite embeber el iframe. Ábrelo en una pestaña nueva mientras configuramos el dominio.
            </p>
            <a
              href={DESIGN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--brand-primary)] text-white rounded-xl font-semibold text-sm hover:opacity-90 shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir Open Design ({DESIGN_URL.replace(/^https?:\/\//, '')})
            </a>
            <div className="mt-6 text-left text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="font-semibold mb-1">Cuando agregues el DNS:</p>
              <code className="block font-mono">design.alcealce.com   A   5.78.149.23</code>
              <p className="mt-2">Caddy auto-emite SSL y el iframe se carga embebido aquí mismo.</p>
            </div>
          </div>
        </div>
      )}

      {!isMixedContent && reachable === false && !loading && (
        <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-xl p-8">
          <div className="max-w-md text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              No se pudo conectar con {DESIGN_URL.replace(/^https?:\/\//, '')}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              El servicio está reiniciándose o el DNS aún no está propagado.
            </p>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg font-semibold text-sm hover:opacity-90"
            >
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        </div>
      )}

      {!isMixedContent && reachable === true && (
        <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={DESIGN_URL}
            title="Open Design"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads allow-modals"
            allow="clipboard-read; clipboard-write"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      )}
    </div>
  )
}
