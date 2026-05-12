import { useState, useEffect, useRef } from 'react'
import { Palette, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react'

const DESIGN_URL = 'https://design.alcealce.com'

export default function OpenDesignModule() {
  const iframeRef = useRef(null)
  const [iframeKey, setIframeKey] = useState(0)
  const [reachable, setReachable] = useState(null) // null = probing, true/false = result
  const [loading, setLoading] = useState(true)

  // Probe el endpoint /api/health (mismo origen del iframe) para detectar
  // si el subdominio resuelve y devuelve 200 antes de pintar el iframe completo
  useEffect(() => {
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
  }, [iframeKey])

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
      {loading && reachable === null && (
        <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--brand-primary)] border-t-transparent mx-auto mb-3" />
            <p className="text-sm text-slate-500">Conectando con el servicio de diseño…</p>
          </div>
        </div>
      )}

      {reachable === false && !loading && (
        <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-xl p-8">
          <div className="max-w-md text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              No se pudo conectar con design.alcealce.com
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Probablemente el DNS del subdominio aún no está apuntando al servidor, o el servicio está reiniciándose.
            </p>
            <div className="text-left text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
              <p className="font-semibold mb-1">DNS requerido:</p>
              <code className="block font-mono">design.alcealce.com   A   5.78.149.23</code>
            </div>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg font-semibold text-sm hover:opacity-90"
            >
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        </div>
      )}

      {reachable === true && (
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
