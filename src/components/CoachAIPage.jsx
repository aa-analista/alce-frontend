import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOutletContext } from 'react-router-dom'
import {
  Sparkles, Paperclip, AtSign, Mic, SlidersHorizontal, ArrowRight, ArrowLeft,
  BarChart3, Users, Blocks, Activity, FileText, Lightbulb, MessageSquare, Clock, Database,
  HelpCircle, Zap, BookOpen, ChevronRight, User, X, Loader2,
  Volume2, VolumeX, AudioLines, Check
} from 'lucide-react'
import VoiceChatModal from './VoiceChatModal'

const AI_MODELS = [
  { id: 'auto', name: 'Auto' },
  { id: 'gpt-4o', name: 'GPT-4o', badge: 'Latest' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', badge: 'Fast' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
]

// Icon map matching sidebar
const MODULE_ICONS = {
  'coach-ai': Sparkles, 'operacion': BarChart3, 'actividad': Activity,
  'agente': MessageSquare, 'documentos': FileText, 'accountability': Clock, 'conocimiento': Database,
}

const SUGGESTIONS = [
  { icon: Users, title: 'Resumir el estado del equipo', desc: 'Vision integral de cargas de trabajo y disponibilidad.', color: 'text-slate-600' },
  { icon: Blocks, title: 'Que modulos me conviene configurar primero?', desc: 'Priorizacion basada en sus objetivos de negocio.', color: 'text-slate-600' },
  { icon: BarChart3, title: 'Muestrame los pendientes criticos', desc: 'Identifique cuellos de botella que requieren atencion.', color: 'text-red-500' },
  { icon: BookOpen, title: 'Explicame como funciona Accountability Partner', desc: 'Metodologia de cumplimiento y seguimiento.', color: 'text-slate-600' },
  { icon: Activity, title: 'Resume la actividad reciente', desc: 'Sintesis de movimientos y eventos clave de la semana.', color: 'text-slate-600' },
  { icon: HelpCircle, title: 'Que requiere atencion esta semana?', desc: 'Prioridades inmediatas y acciones recomendadas.', color: 'text-slate-600' },
]

const CAPABILITIES = [
  { icon: Lightbulb, title: 'Resolucion de dudas operativas', desc: 'Acceso a manuales, procesos y documentacion.' },
  { icon: Zap, title: 'Resumenes estrategicos', desc: 'Sintetiza actividad en puntos clave de accion.' },
  { icon: HelpCircle, title: 'Guia de navegacion y modulos', desc: 'Orientacion interactiva dentro de Alce AI.' },
  { icon: FileText, title: 'Uso de contexto y fuentes internas', desc: 'Consultas enriquecidas con archivos y modulos.' },
]

const CoachAIPage = () => {
  const { token } = useAuth()
  const { flows } = useOutletContext()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeContext, setActiveContext] = useState(null)
  const [conversationId, setConversationId] = useState(null)
  const [conversations, setConversations] = useState([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [convPage, setConvPage] = useState(1)
  const [convTotalPages, setConvTotalPages] = useState(1)
  const [selectedImage, setSelectedImage] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [openingVoice, setOpeningVoice] = useState(false)
  const [selectedModel, setSelectedModel] = useState('auto')
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)

  const textareaRef = useRef(null)
  const messagesRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const isInChat = messages.length > 0

  useEffect(() => { fetchConversations(1) }, [])
  useEffect(() => { if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight }, [messages, loading])
  useEffect(() => { return () => { if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop(); stopSpeaking() } }, [])

  const fetchConversations = async (page = 1) => {
    setLoadingConversations(true)
    try {
      const res = await fetch(`/api/ai/assistant/conversations?page=${page}&pageSize=4`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
        setConvPage(data.page || 1)
        setConvTotalPages(data.totalPages || 1)
      }
    } catch (err) { console.error(err) }
    setLoadingConversations(false)
  }

  const loadConversation = async (convId) => {
    setConversationId(convId)
    try {
      const res = await fetch(`/api/ai/assistant/conversations/${convId}/messages`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setMessages(data.messages || []) }
    } catch (err) { console.error(err) }
  }

  const deleteConversation = async (convId, e) => {
    e.stopPropagation()
    try {
      await fetch(`/api/ai/assistant/conversations/${convId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      setConversations(prev => prev.filter(c => c.id !== convId))
    } catch (err) { console.error(err) }
  }

  const speak = (text) => {
    if (!text?.trim()) return
    setIsSpeaking(true)
    import('../utils/speech.js').then(({ speakText }) => {
      speakText(text, token, { onEnd: () => setIsSpeaking(false) })
    })
  }
  const stopSpeaking = () => { import('../utils/speech.js').then(({ stopSpeech }) => stopSpeech()); setIsSpeaking(false) }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) { const r = new FileReader(); r.onloadend = () => setSelectedImage(r.result); r.readAsDataURL(file) }
  }

  const handlePaste = (e) => {
    const items = e.clipboardData?.items; if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image/') !== -1) {
        const file = items[i].getAsFile()
        if (file) { const r = new FileReader(); r.onloadend = () => setSelectedImage(r.result); r.readAsDataURL(file); e.preventDefault(); break }
      }
    }
  }

  const sendMessage = async (text) => {
    const msg = text || input
    if (!msg.trim() && !selectedImage) return
    if (loading) return
    if (isSpeaking) stopSpeaking()

    setMessages(prev => [...prev, { role: 'user', content: msg.trim(), image: selectedImage }])
    setInput('')
    const img = selectedImage; setSelectedImage(null); setLoading(true)

    try {
      const res = await fetch('/api/ai/assistant/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg.trim(), conversationId, route: activeContext ? `/${activeContext.id}` : '/coach-ai', model: selectedModel, image: img || undefined }),
      })
      if (res.ok) {
        const payload = await res.json()
        if (payload.conversationId && !conversationId) setConversationId(payload.conversationId)
        if (payload.text) { setMessages(prev => [...prev, { role: 'assistant', content: payload.text }]); if (isVoiceEnabled) speak(payload.text) }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error al procesar tu consulta.' }])
      }
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexion.' }]) }
    finally { setLoading(false) }
  }

  const toggleListen = async () => {
    if (isSpeaking) { stopSpeaking(); return }
    if (isListening) { if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop(); setIsListening(false); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream); mediaRecorderRef.current = mr; audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        setLoading(true)
        const fd = new window.FormData(); fd.append('audio', new Blob(audioChunksRef.current, { type: 'audio/webm' }), 'audio.webm')
        try {
          const r = await fetch('/api/ai/assistant/transcribe', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
          if (r.ok) { const { text } = await r.json(); if (text?.trim()) await sendMessage(text) }
        } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'No pude escuchar bien tu audio.' }]) }
        setLoading(false); stream.getTracks().forEach(t => t.stop())
      }
      mr.start(); setIsListening(true)
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'Necesito permisos de microfono.' }]) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }
  const resetChat = () => { setMessages([]); setInput(''); setActiveContext(null); setConversationId(null); setSelectedImage(null); fetchConversations(1) }

  // Voice chat modal — ensures a conversation exists, then opens modal with that id
  const openVoiceChat = async () => {
    if (openingVoice || voiceModalOpen) return
    setOpeningVoice(true)
    try {
      let convId = conversationId
      if (!convId) {
        const res = await fetch('/api/ai/assistant/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: 'Conversacion por voz' }),
        })
        if (res.ok) {
          const data = await res.json()
          convId = data.conversation.id
          setConversationId(convId)
        } else {
          throw new Error('No se pudo crear la conversacion')
        }
      }
      setVoiceModalOpen(true)
    } catch (err) {
      console.error(err)
      alert('No se pudo iniciar el modo voz')
    }
    setOpeningVoice(false)
  }

  const handleVoiceSaved = (savedMessages) => {
    // Append persisted voice messages into the current chat so the user sees them inline.
    if (Array.isArray(savedMessages) && savedMessages.length > 0) {
      setMessages((prev) => [
        ...prev,
        ...savedMessages.map((m) => ({
          role: m.role,
          content: m.content,
          voice: true,
        })),
      ])
    }
    fetchConversations(convPage)
  }

  // Dynamic context chips from user modules (only type=module)
  const contextChips = (flows || []).filter(m => m.type === 'module' || !m.type).map(m => ({
    id: m.id,
    label: m.name,
    icon: MODULE_ICONS[m.id] || Blocks,
  }))

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const diff = Math.floor((new Date() - new Date(dateStr)) / 60000)
    if (diff < 1) return 'Ahora'; if (diff < 60) return `Hace ${diff} min`; if (diff < 1440) return `Hace ${Math.floor(diff / 60)} h`
    return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  // ── Inline input bar (NOT a sub-component to avoid remount) ──
  const renderInputBar = (large) => {
    const CtxIcon = activeContext ? (MODULE_ICONS[activeContext.id] || Blocks) : null
    const currentModel = AI_MODELS.find(m => m.id === selectedModel)
    return (
      <div className={`relative bg-white border border-slate-200 rounded-xl focus-within:border-[#1a3a3a]/30 transition-all ${large ? '' : 'mx-auto max-w-3xl'}`}>
        {isModelDropdownOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsModelDropdownOpen(false)} />
            <div className="absolute bottom-full right-3 mb-2 w-[220px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden py-1 z-40">
              {AI_MODELS.map(model => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => { setSelectedModel(model.id); setIsModelDropdownOpen(false) }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-600 hover:bg-[#e8f0f0] hover:text-[#1a3a3a] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    {model.id === 'auto' ? <Sparkles className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1a3a3a]" /> : <div className="w-3.5 h-3.5" />}
                    <span className={selectedModel === model.id ? 'font-medium text-slate-900' : ''}>{model.name}</span>
                    {model.badge && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded leading-none">{model.badge}</span>
                    )}
                  </div>
                  {selectedModel === model.id && <Check className="w-4 h-4 text-[#1a3a3a]" />}
                </button>
              ))}
            </div>
          </>
        )}
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />

        {/* Selected context chip + image preview */}
        {(activeContext || selectedImage) && (
          <div className="px-4 pt-3 flex items-center gap-2 flex-wrap">
            {activeContext && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1a3a3a] text-white text-xs font-medium rounded-lg">
                <CtxIcon className="w-3 h-3" />
                {activeContext.label}
                <button type="button" onClick={() => setActiveContext(null)} className="ml-0.5 hover:text-white/70 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedImage && (
              <div className="relative inline-block w-14 h-14 rounded-lg border border-slate-200 overflow-hidden">
                <img src={selectedImage} alt="" className="object-cover w-full h-full" />
                <button onClick={() => setSelectedImage(null)} className="absolute top-0.5 right-0.5 bg-black/60 p-0.5 rounded-full text-white"><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={large ? "Pregunte cualquier cosa sobre su operacion, equipo o plataforma..." : "Escriba su consulta..."}
          className={`w-full bg-transparent border-0 focus:ring-0 resize-none text-sm text-slate-800 placeholder-slate-400 outline-none ${large ? 'min-h-[80px] py-4 px-5' : 'min-h-[44px] max-h-32 py-3 px-4'}`}
          rows={large ? 3 : 1}
          disabled={loading || isListening}
        />
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} title="Adjuntar imagen" className="text-slate-400 hover:text-slate-600 transition-colors"><Paperclip className="w-4 h-4" /></button>
            <button type="button" onClick={toggleListen} title="Dictar mensaje" className={`transition-colors ${isListening ? 'text-red-500' : 'text-slate-400 hover:text-slate-600'}`}><Mic className="w-4 h-4" /></button>
            <button type="button" onClick={() => setIsVoiceEnabled(!isVoiceEnabled)} title={isVoiceEnabled ? 'Silenciar respuestas' : 'Leer respuestas en voz'} className={`transition-colors ${isVoiceEnabled ? 'text-[#1a3a3a]' : 'text-slate-400 hover:text-slate-600'}`}>
              {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={openVoiceChat}
              disabled={openingVoice}
              title="Agente de voz (conversacion en tiempo real)"
              className={`p-1 rounded-md transition-colors ${openingVoice ? 'opacity-60' : 'bg-[#e8f0f0] text-[#1a3a3a] hover:bg-[#d4e4e4]'}`}
            >
              {openingVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <AudioLines className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              title="Seleccionar modelo"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
            >
              <Sparkles className="w-3 h-3 text-slate-400" />
              {currentModel?.name}
              {currentModel?.badge && (
                <span className="text-[9px] bg-white text-slate-500 px-1 py-0.5 rounded leading-none">{currentModel.badge}</span>
              )}
            </button>
            <button type="button" onClick={() => sendMessage()} disabled={(!input.trim() && !selectedImage) || loading}
              className={`flex items-center gap-1.5 bg-[#1a3a3a] text-white rounded-lg font-semibold hover:bg-[#224a4a] transition-all disabled:opacity-40 ${large ? 'px-5 py-2 text-sm gap-2' : 'px-4 py-1.5 text-xs'}`}>
              Consultar <ArrowRight className={large ? 'w-4 h-4' : 'w-3 h-3'} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Chat View ──
  if (isInChat) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem-3rem)] relative">
        <button onClick={resetChat} className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1a3a3a] bg-white hover:bg-[#e8f0f0] rounded-lg border border-slate-200 shadow-sm transition-all">
          <ArrowLeft className="w-3 h-3" /> Regresar
        </button>
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5" ref={messagesRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 max-w-3xl mx-auto ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && <div className="w-7 h-7 rounded-lg bg-[#e8f0f0] flex items-center justify-center flex-shrink-0 mt-0.5"><Sparkles className="w-3.5 h-3.5 text-[#1a3a3a]" /></div>}
              <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed max-w-[80%] ${msg.role === 'user' ? 'bg-[#1a3a3a] text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                {msg.image && <img src={msg.image} alt="" className="max-w-full rounded-lg mb-2" />}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === 'user' && <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5"><User className="w-3.5 h-3.5 text-slate-600" /></div>}
            </div>
          ))}
          {(loading || isListening) && (
            <div className="flex gap-3 max-w-3xl mx-auto">
              <div className="w-7 h-7 rounded-lg bg-[#e8f0f0] flex items-center justify-center flex-shrink-0"><Sparkles className="w-3.5 h-3.5 text-[#1a3a3a]" /></div>
              <div className="px-4 py-3 rounded-xl bg-white border border-slate-200 rounded-tl-sm flex items-center gap-2 text-sm text-slate-500">
                {isListening ? <><span className="flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce"/><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce" style={{animationDelay:'0.15s'}}/><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce" style={{animationDelay:'0.3s'}}/></span><span className="text-red-500 font-medium ml-1">Escuchando...</span></> : <><div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"/><div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{animationDelay:'0.15s'}}/><div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{animationDelay:'0.3s'}}/></>}
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 bg-white p-4">{renderInputBar(false)}</div>
        {voiceModalOpen && (
          <VoiceChatModal
            conversationId={conversationId}
            onClose={() => setVoiceModalOpen(false)}
            onSaved={handleVoiceSaved}
          />
        )}
      </div>
    )
  }

  // ── Landing View ──
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-[#e8f0f0] rounded-xl mb-3"><Sparkles className="w-6 h-6 text-[#1a3a3a]" /></div>
        <h1 className="text-2xl font-bold text-slate-900">Coach AI</h1>
        <p className="text-sm text-slate-500 mt-1.5">Su asistente estrategico para la gestion y consulta de su espacio de trabajo</p>
      </div>

      {renderInputBar(true)}

      {contextChips.length > 0 && (
        <div className="flex items-center gap-2 justify-center flex-wrap">
          <span className="text-xs text-slate-400">Contexto rapido:</span>
          {contextChips.map((chip) => {
            const Icon = chip.icon
            const isActive = activeContext?.id === chip.id
            return (
              <button key={chip.id} onClick={() => setActiveContext(isActive ? null : chip)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isActive ? 'bg-[#1a3a3a] text-white border-[#1a3a3a]' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                <Icon className="w-3 h-3" /> {chip.label}
              </button>
            )
          })}
        </div>
      )}

      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Sugerencias Destacadas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUGGESTIONS.map((s, i) => { const Icon = s.icon; return (
            <button key={i} onClick={() => sendMessage(s.title)} className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl text-left hover:shadow-sm hover:border-slate-300 transition-all group">
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${s.color}`} />
              <div><p className="text-sm font-medium text-slate-900 group-hover:text-[#1a3a3a] transition-colors">{s.title}</p><p className="text-xs text-slate-400 mt-0.5">{s.desc}</p></div>
            </button>
          )})}
        </div>
      </div>

      {/* Titles row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 mb-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Lightbulb className="w-3 h-3" /> Capacidades</p>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Consultas Recientes</p>
          <div className="flex items-center gap-1.5">
            {loadingConversations && <Loader2 className="w-3 h-3 text-slate-300 animate-spin" />}
            {convTotalPages > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5">
                <button onClick={() => fetchConversations(convPage - 1)} disabled={convPage <= 1 || loadingConversations} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 transition-all text-sm font-medium">&lt;</button>
                <span className="text-xs text-slate-500 font-medium tabular-nums px-1">{convPage}/{convTotalPages}</span>
                <button onClick={() => fetchConversations(convPage + 1)} disabled={convPage >= convTotalPages || loadingConversations} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 transition-all text-sm font-medium">&gt;</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Cards row — paired by index so they align */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
        {Array.from({ length: Math.max(CAPABILITIES.length, conversations.length) }).map((_, i) => {
          const cap = CAPABILITIES[i]
          const conv = conversations[i]
          return [
            // Left card (capability)
            cap ? (
              <div key={`cap-${i}`} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl min-h-[68px]">
                {(() => { const Icon = cap.icon; return <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" /> })()}
                <div><p className="text-sm font-medium text-slate-900">{cap.title}</p><p className="text-xs text-slate-400 mt-0.5">{cap.desc}</p></div>
              </div>
            ) : <div key={`cap-${i}`} />,
            // Right card (conversation)
            conv ? (
              <div key={`conv-${conv.id}`} onClick={() => loadConversation(conv.id)}
                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl text-left hover:shadow-sm transition-all cursor-pointer group min-h-[68px]">
                <Sparkles className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700 group-hover:text-[#1a3a3a] transition-colors truncate">{conv.title}</p><p className="text-xs text-slate-400">{formatTime(conv.updated_at)}</p></div>
                <button onClick={(e) => deleteConversation(conv.id, e)} className="p-1 text-slate-300 hover:text-red-500 rounded transition-all opacity-0 group-hover:opacity-100 flex-shrink-0" title="Eliminar">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : <div key={`conv-${i}`} />,
          ]
        }).flat()}
        {conversations.length === 0 && !loadingConversations && CAPABILITIES.length > 0 && (
          <><div /><p className="text-xs text-slate-400 py-4 text-center">No hay conversaciones aun.</p></>
        )}
      </div>
      {voiceModalOpen && (
        <VoiceChatModal
          conversationId={conversationId}
          onClose={() => setVoiceModalOpen(false)}
          onSaved={handleVoiceSaved}
        />
      )}
    </div>
  )
}

export default CoachAIPage
