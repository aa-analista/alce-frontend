import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Wand2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// ─────────────────────────────────────────────────────────────────────────
// HTML wrapper que carga el bundle de OpenUI desde CDN y renderiza el code.
// Basado en el plugin oficial de Thesys para Open WebUI.
// ─────────────────────────────────────────────────────────────────────────
const OPENUI_CDN = 'https://cdn.jsdelivr.net/npm/@openuidev/browser-bundle'

function buildOpenUIHtml(code, title = 'Respuesta') {
  const safeTitle = (title || '').replace(/[&<>"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[c]))
  const codeJson = JSON.stringify(code)
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<link rel="stylesheet" href="${OPENUI_CDN}/dist/openui-styles.css">
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { background: transparent; }
  body { padding: 4px; overflow: visible; font-family: system-ui, -apple-system, sans-serif; }
  #openui-root { width: 100%; }
  .openui-loading { padding: 32px; color: #888; text-align: center; font-size: 14px; }
  .openui-error { padding: 16px; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; font-size: 13px; }
  .openui-error strong { display: block; margin-bottom: 4px; }
</style>
</head>
<body>
<div id="openui-root"><div class="openui-loading">Cargando componentes…</div></div>
<script>
  // Reportar altura al parent para auto-resize del iframe
  var _rhLast = 0, _rhRaf = 0;
  function reportHeight() {
    var saved = document.body.style.cssText;
    document.body.style.setProperty('height', 'auto', 'important');
    document.body.style.setProperty('overflow', 'visible', 'important');
    var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    document.body.style.cssText = saved;
    if (h === _rhLast) return;
    _rhLast = h;
    parent.postMessage({ type: 'iframe:height', height: h }, '*');
  }
  window.addEventListener('load', function() {
    reportHeight();
    setTimeout(reportHeight, 200);
    setTimeout(reportHeight, 800);
    setTimeout(reportHeight, 2000);
  });
  new ResizeObserver(function() {
    cancelAnimationFrame(_rhRaf);
    _rhRaf = requestAnimationFrame(reportHeight);
  }).observe(document.body);
  new MutationObserver(function() {
    cancelAnimationFrame(_rhRaf);
    _rhRaf = requestAnimationFrame(reportHeight);
  }).observe(document.body, { childList: true, subtree: true });

  function sendPrompt(text) {
    try { parent.postMessage({ type: 'input:prompt:submit', text: text }, '*'); } catch(e) {}
  }
  function openLink(url) { try { parent.window.open(url, '_blank'); } catch(e) { window.open(url, '_blank'); } }

  // Cargar el bundle de OpenUI y renderizar
  var s = document.createElement('script');
  s.src = '${OPENUI_CDN}/dist/openui-bundle.min.js';
  s.onload = function() {
    try {
      var OpenUI = window.__OpenUI;
      if (!OpenUI || !OpenUI.Renderer || !OpenUI.openuiChatLibrary) {
        throw new Error('OpenUI bundle cargado pero faltan exports');
      }
      var code = ${codeJson};
      var container = document.getElementById('openui-root');
      container.innerHTML = '';
      var root = OpenUI.createRoot(container);
      function handleAction(event) {
        if (event.type === 'open_url') {
          openLink(event.params && event.params.url ? event.params.url : '');
          return;
        }
        var prompt = event.humanFriendlyMessage || (event.params && event.params.message) || '';
        if (event.formState && Object.keys(event.formState).length > 0) {
          var formDataStr = Object.entries(event.formState)
            .map(function(entry) { return entry[0] + ': ' + JSON.stringify(entry[1]); })
            .join('\\n');
          prompt = prompt
            ? prompt + '\\n\\nForm data:\\n' + formDataStr
            : 'Form submission' + (event.formName ? ' (' + event.formName + ')' : '') + ':\\n' + formDataStr;
        }
        if (!prompt && event.type) {
          prompt = 'User action: ' + event.type + (event.params ? '\\n' + JSON.stringify(event.params) : '');
        }
        if (prompt) sendPrompt(prompt);
      }
      root.render(OpenUI.React.createElement(OpenUI.Renderer, {
        response: code,
        library: OpenUI.openuiChatLibrary,
        isStreaming: false,
        onAction: handleAction
      }));
      setTimeout(reportHeight, 500);
    } catch(err) {
      var el = document.getElementById('openui-root');
      el.innerHTML = '<div class="openui-error"><strong>Error al renderizar OpenUI</strong>' + (err.message || String(err)) + '</div>';
      reportHeight();
    }
  };
  s.onerror = function() {
    var el = document.getElementById('openui-root');
    el.innerHTML = '<div class="openui-error"><strong>No se pudo cargar el bundle de OpenUI</strong>' + s.src + '</div>';
    reportHeight();
  };
  document.body.appendChild(s);
</script>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────
// Iframe que renderiza la respuesta de OpenUI y se autoajusta de alto
// ─────────────────────────────────────────────────────────────────────────
function OpenUIIframe({ code, title }) {
  const iframeRef = useRef(null)
  const [height, setHeight] = useState(120)

  useEffect(() => {
    const handler = (e) => {
      if (e.source !== iframeRef.current?.contentWindow) return
      if (e.data?.type === 'iframe:height' && typeof e.data.height === 'number') {
        setHeight(Math.min(Math.max(e.data.height + 8, 100), 1600))
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  return (
    <iframe
      ref={iframeRef}
      srcDoc={buildOpenUIHtml(code, title)}
      title={title || 'OpenUI'}
      sandbox="allow-scripts allow-same-origin allow-popups"
      style={{ width: '100%', height: `${height}px`, border: 'none', background: 'transparent' }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Módulo principal: chat con OpenUI Lang
// ─────────────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Hazme una tabla con los top 5 lenguajes de programación más usados',
  'Gráfica de barras de ingresos mensuales 2026',
  'Formulario de contacto con nombre, email y mensaje',
  'Cards comparativas de 3 planes de suscripción (free / pro / enterprise)',
]

export default function OpenUIModule() {
  const { token } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)

  // Auto-scroll al fondo cuando llega un mensaje
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(async (text) => {
    const trimmed = String(text || '').trim()
    if (!trimmed || loading) return

    setError('')
    const next = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/openui/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar respuesta')
      setMessages([...next, { role: 'assistant', content: data.code, title: data.title }])
    } catch (err) {
      setError(err.message)
      setMessages([...next, { role: 'assistant', content: '', title: '', error: err.message }])
    } finally {
      setLoading(false)
    }
  }, [messages, loading, token])

  // Escuchar mensajes del iframe (follow-ups, form submits)
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'input:prompt:submit' && typeof e.data.text === 'string') {
        sendMessage(e.data.text)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [sendMessage])

  const onSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const clearChat = () => {
    setMessages([])
    setError('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center text-white">
          <Wand2 className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">OpenUI</h2>
          <p className="text-xs text-slate-500">Genera UI interactiva con IA: tablas, gráficas, formularios, cards…</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Nuevo chat
          </button>
        )}
      </div>

      {/* Mensajes / placeholder */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-xl p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--brand-primary)]/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-[var(--brand-primary)]" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">¿Qué quieres visualizar?</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md">
              Pídele algo y la IA te genera UI interactiva en vivo. Puedes hacer click en los componentes para iterar.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
              {m.role === 'user' ? (
                <div className="max-w-[80%] bg-[var(--brand-primary)] text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm">
                  {m.content}
                </div>
              ) : m.error ? (
                <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">No se pudo generar la respuesta</p>
                    <p className="text-xs text-red-500 mt-0.5">{m.error}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                  {m.title && (
                    <div className="px-3 py-1.5 bg-white border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {m.title}
                    </div>
                  )}
                  <OpenUIIframe code={m.content} title={m.title} />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--brand-primary)] border-t-transparent" />
            Generando UI…
          </div>
        )}

        {error && !loading && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2 flex-shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSubmit(e)
            }
          }}
          rows={2}
          placeholder="Escribe lo que quieres visualizar… (Enter para enviar, Shift+Enter salto de línea)"
          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]/40 resize-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[var(--brand-primary)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  )
}
