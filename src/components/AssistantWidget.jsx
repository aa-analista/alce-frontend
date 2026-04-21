import { useState, useEffect, useRef } from 'react'
import { Mic, Loader2, Volume2, VolumeX, X, Send, Sparkles, MessageSquare, ChevronDown, Check, Plus, SlidersHorizontal, ArrowUp } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAssistant } from '../context/AssistantContext'

const AI_MODELS = [
  { id: 'auto', name: 'Auto' },
  { id: 'gpt-4o', name: 'GPT-4o', badge: 'Latest' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', badge: 'Fast' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
]

const CONTEXT_PAGES = [
  { path: '/home', icon: '🏠', name: 'Dashboard' },
  { path: '/agente', icon: '🤖', name: 'Agente' },
  { path: '/documentos', icon: '📄', name: 'Documentos' },
  { path: '/accountability', icon: '✅', name: 'Accountability' },
  { path: '/marketplace', icon: '🛒', name: 'Marketplace' },
  { path: '/usuarios', icon: '👥', name: 'Usuarios' },
  { path: '/conocimiento', icon: '📚', name: 'Base de Conocimiento' },
  { path: '/ajustes', icon: '⚙️', name: 'Ajustes' },
  { path: '/google-drive', icon: '📁', name: 'Google Drive' },
  { path: '/google-gmail', icon: '✉️', name: 'Gmail' },
  { path: '/google-calendar', icon: '📅', name: 'Google Calendar' },
  { path: '/google-maps', icon: '📍', name: 'Google Maps' },
]

const AssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: 'Hola! Soy tu asistente de ALCE. En que te ayudo?' }
  ])

  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const [selectedModel, setSelectedModel] = useState('auto')
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)

  const { token } = useAuth()
  const location = useLocation()
  const { dispatchAction, isProcessing, setIsProcessing } = useAssistant()

  const [selectedContext, setSelectedContext] = useState(location.pathname)
  const [isContextSlashOpen, setIsContextSlashOpen] = useState(false)
  const [contextSearchTerm, setContextSearchTerm] = useState('')
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true)

  useEffect(() => {
    setSelectedContext(location.pathname)
  }, [location.pathname])

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setSelectedImage(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image/') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onloadend = () => setSelectedImage(reader.result)
          reader.readAsDataURL(file)
          e.preventDefault()
          break
        }
      }
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatHistory, isProcessing, isListening])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      stopSpeaking()
    }
  }, [])

  const speak = (text) => {
    setIsSpeaking(true)
    import('../utils/speech.js').then(({ speakText }) => {
      speakText(text, token, { onEnd: () => setIsSpeaking(false) })
    })
  }

  const stopSpeaking = () => {
    import('../utils/speech.js').then(({ stopSpeech }) => {
      stopSpeech()
      setIsSpeaking(false)
    })
  }

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputText
    if (!textToSend.trim() && !selectedImage) return

    if (isSpeaking) stopSpeaking()

    const updatedHistory = [...chatHistory, { role: 'user', content: textToSend, image: selectedImage }]
    setChatHistory(updatedHistory)
    setInputText('')
    setSelectedImage(null)
    setIsProcessing(true)

    try {
      let contextData = {}

      const res = await fetch('/api/ai/assistant/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          history: updatedHistory,
          route: selectedContext || 'General',
          contextData,
          model: selectedModel
        })
      })

      if (res.ok) {
        const payload = await res.json()

        if (payload.action && payload.data) {
          dispatchAction(payload.action, payload.data)
        }

        if (payload.text) {
          setChatHistory(prev => [...prev, { role: 'assistant', content: payload.text }])
          if (isVoiceEnabled) speak(payload.text)
        } else if (payload.action) {
          setChatHistory(prev => [...prev, { role: 'assistant', content: `[Accion ejecutada: ${payload.action}]` }])
        }
      } else {
        setChatHistory(prev => [...prev, { role: 'assistant', content: 'Ups, hubo un error de conexion.' }])
      }
    } catch (err) {
      console.error(err)
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Ocurrio un error inesperado al procesar tu solicitud.' }])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleContextSelect = (ctxPath) => {
    setSelectedContext(ctxPath)

    const cursorPosition = inputRef.current?.selectionStart || inputText.length;
    const textBeforeCursor = inputText.slice(0, cursorPosition);
    const textAfterCursor = inputText.slice(cursorPosition);

    const match = textBeforeCursor.match(/(?:^|\s)([/@])([^\s]*)$/);
    if (match) {
      const startIdx = textBeforeCursor.lastIndexOf(match[1]);
      const newText = textBeforeCursor.slice(0, startIdx) + textAfterCursor;
      setInputText(newText)
    }

    setIsContextSlashOpen(false)
    setTimeout(() => { if (inputRef.current) inputRef.current.focus() }, 0)
  }

  const toggleListen = async () => {
    if (isSpeaking) {
      stopSpeaking()
      return
    }

    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      setIsListening(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data)
        }

        mediaRecorder.onstop = async () => {
          setIsProcessing(true)
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const formData = new FormData()
          formData.append('audio', audioBlob, 'audio.webm')

          try {
            const transcribeRes = await fetch('/api/ai/assistant/transcribe', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData
            })

            if (!transcribeRes.ok) throw new Error('Error transcribiendo')

            const { text } = await transcribeRes.json()
            if (text && text.trim().length > 0) {
              await handleSendMessage(text)
            }
          } catch (err) {
            console.error(err)
            setChatHistory(prev => [...prev, { role: 'assistant', content: 'No pude escuchar bien tu audio.' }])
            setIsProcessing(false)
          }

          stream.getTracks().forEach(track => track.stop())
        }

        mediaRecorder.start()
        setIsListening(true)
      } catch (err) {
        console.error('Mic access denied:', err)
        setChatHistory(prev => [...prev, { role: 'assistant', content: 'Necesito permisos de microfono para escucharte.' }])
        setIsListening(false)
      }
    }
  }

  // Hide on Coach AI page (has its own full chat)
  if (location.pathname === '/coach-ai') return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[380px] h-[550px] max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in slide-in-from-bottom-5 fade-in duration-200">

          {/* Header */}
          <div className="bg-[#1a3a3a] px-5 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm leading-tight">Alce AI</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {selectedContext ? (
                    <div className="flex items-center gap-1 bg-white/15 px-1.5 py-0.5 rounded text-[10px] text-white/70">
                      <span>{CONTEXT_PAGES.find(p => p.path === selectedContext)?.name || selectedContext}</span>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedContext(null); }} className="hover:text-white transition-colors ml-0.5">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-white/50">Asistente</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-4 bg-slate-50 relative" ref={scrollRef}>
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`relative max-w-[85%] px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed break-words ${
                    msg.role === 'user'
                      ? 'bg-[#1a3a3a] text-white rounded-tr-sm'
                      : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.image && (
                    <img src={msg.image} alt="Attachment" className="max-w-full rounded-lg mb-2 border border-black/10" />
                  )}
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Status indicators */}
            {(isListening || isProcessing || isSpeaking) && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 max-w-[85%] bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl rounded-tl-sm shadow-sm text-[13px] text-slate-600">
                  {isListening ? (
                    <>
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce delay-75"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce delay-150"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce delay-300"></span>
                      </div>
                      <span className="ml-1 font-medium text-red-500">Escuchando...</span>
                    </>
                  ) : isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1a3a3a]" />
                      Procesando...
                    </>
                  ) : isSpeaking ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 animate-pulse text-green-500" />
                      <button onClick={stopSpeaking} className="ml-1 text-slate-400 hover:text-slate-700 underline underline-offset-2">
                        Pausar voz
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100 flex flex-col shrink-0 relative z-20">
            {/* Page Link Menu */}
            {isContextSlashOpen && (
              <div className="absolute bottom-full left-3 mb-2 w-[220px] bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                <div className="px-3 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Vincular pagina
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {CONTEXT_PAGES.filter(p => p.name.toLowerCase().includes(contextSearchTerm.toLowerCase())).map(p => (
                    <button
                      key={p.path}
                      onClick={(e) => { e.preventDefault(); handleContextSelect(p.path); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <span className="text-base shrink-0">{p.icon}</span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                  {CONTEXT_PAGES.filter(p => p.name.toLowerCase().includes(contextSearchTerm.toLowerCase())).length === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-slate-400">
                      Sin resultados
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Model Dropdown */}
            {isModelDropdownOpen && (
              <div className="absolute bottom-full left-3 mb-2 w-[200px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden py-1 z-50">
                {AI_MODELS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => { setSelectedModel(model.id); setIsModelDropdownOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      {model.id === 'auto' && <Sparkles className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />}
                      {(model.id !== 'auto') && <div className="w-3.5 h-3.5" />}
                      <span className={selectedModel === model.id ? 'font-medium text-slate-900' : ''}>{model.name}</span>
                      {model.badge && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded leading-none">{model.badge}</span>
                      )}
                    </div>
                    {selectedModel === model.id && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 bg-slate-50 rounded-xl flex flex-col overflow-hidden border border-slate-200 focus-within:border-[#1a3a3a]/30 focus-within:bg-white transition-all">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />

              {selectedImage && (
                <div className="px-3 pt-3">
                  <div className="relative inline-block w-14 h-14 rounded-lg border border-slate-200 overflow-hidden">
                    <img src={selectedImage} alt="Preview" className="object-cover w-full h-full" />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 p-0.5 rounded-full text-white transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              )}

              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => {
                  const val = e.target.value
                  setInputText(val)
                  const cursorPosition = e.target.selectionStart || val.length;
                  const textBeforeCursor = val.slice(0, cursorPosition);
                  const match = textBeforeCursor.match(/(?:^|\s)([/@])([^\s]*)$/);
                  if (match) {
                    setIsContextSlashOpen(true)
                    setContextSearchTerm(match[2])
                  } else {
                    setIsContextSlashOpen(false)
                  }
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Escribe tu mensaje..."
                className="w-full bg-transparent border-0 focus:ring-0 resize-none max-h-28 min-h-[40px] py-2.5 px-3.5 text-sm text-slate-800 placeholder-slate-400"
                rows={1}
                disabled={isProcessing || isListening}
              />

              <div className="flex items-center justify-between px-3 pb-2.5 pt-0.5">
                <div className="flex items-center gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-slate-600 transition-colors"><Plus className="w-4 h-4" /></button>
                  <button onClick={() => setIsVoiceEnabled(!isVoiceEnabled)} className={`transition-colors ${isVoiceEnabled ? 'text-[#1a3a3a]' : 'text-slate-400 hover:text-slate-600'}`}>
                    {isVoiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-slate-400" />
                    {AI_MODELS.find(m => m.id === selectedModel)?.name}
                  </button>

                  <button
                    onClick={toggleListen}
                    disabled={isProcessing}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      isListening ? 'bg-red-50 text-red-500' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim() || isProcessing}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#1a3a3a] text-white disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative w-14 h-14 bg-[#1a3a3a] flex items-center justify-center rounded-full shadow-lg shadow-[#1a3a3a]/25 hover:bg-[#224a4a] hover:shadow-[#1a3a3a]/35 transition-all duration-200 hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5 text-white relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </button>
      )}

    </div>
  )
}

export default AssistantWidget
