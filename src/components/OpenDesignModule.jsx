import { useState, useRef } from 'react'
import { Palette, ExternalLink, RefreshCw } from 'lucide-react'

// Mientras no haya DNS propio, usamos nip.io que auto-resuelve a la IP del
// server y permite a Caddy emitir SSL real (sin warnings). Mañana cuando
// configures design.alcealce.com → 5.78.149.23 cambia esto.
const DESIGN_URL = 'https://design.5-78-149-23.nip.io'

export default function OpenDesignModule() {
  const iframeRef = useRef(null)
  const [iframeKey, setIframeKey] = useState(0)

  // Detectar mixed content: si la página está en HTTPS y el target es HTTP,
  // el browser bloqueará el iframe.
  const isMixedContent =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    DESIGN_URL.startsWith('http://')

  const refresh = () => setIframeKey((k) => k + 1)

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center text-white">
          <Palette className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900">Estudio Creativo</h2>
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

      {/* Mixed content fallback (HTTP open-design en HTTPS dashboard) */}
      {isMixedContent ? (
        <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-xl p-8">
          <div className="max-w-lg text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand-primary)] flex items-center justify-center text-white mx-auto mb-4">
              <Palette className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Open Design está listo</h3>
            <p className="text-sm text-slate-600 mb-5">
              El dashboard está en HTTPS y Open Design corre por HTTP. Ábrelo en una pestaña nueva mientras configuramos el dominio.
            </p>
            <a
              href={DESIGN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--brand-primary)] text-white rounded-xl font-semibold text-sm hover:opacity-90 shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir Open Design
            </a>
          </div>
        </div>
      ) : (
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
