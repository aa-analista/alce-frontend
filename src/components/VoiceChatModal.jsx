import { useState, useEffect, useRef } from 'react'
import { AudioLines, Loader2, AlertCircle, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * VoiceChatModal — 1:1 voice conversation with Coach AI using OpenAI Realtime API.
 *
 * Flow:
 *   1. Request ephemeral token from backend (/ai/assistant/realtime-token)
 *      - Backend injects last 15 messages of `conversationId` as system context.
 *   2. Open WebRTC peer connection directly to OpenAI.
 *   3. Stream mic -> OpenAI STT -> model -> OpenAI TTS -> playback.
 *   4. Capture transcripts via data channel events.
 *   5. On close, POST accumulated transcript to /conversations/:id/voice-messages
 *      so it persists into the chat thread.
 */
const VoiceChatModal = ({ conversationId, onClose, onSaved }) => {
  const { token } = useAuth()
  const [state, setState] = useState('connecting') // connecting | active | error
  const [error, setError] = useState('')
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false)
  const [saving, setSaving] = useState(false)

  const pcRef = useRef(null)
  const audioElRef = useRef(null)
  const dataChannelRef = useRef(null)
  const micStreamRef = useRef(null)
  const transcriptRef = useRef([]) // [{ role, content }]
  const pendingUserTextRef = useRef('') // accumulates user audio transcription
  const pendingAssistantRef = useRef({}) // { [item_id]: text }
  const usageRef = useRef({
    input_tokens: 0, output_tokens: 0,
    input_audio_tokens: 0, output_audio_tokens: 0,
    input_text_tokens: 0, output_text_tokens: 0,
  })
  const sessionIdRef = useRef(null)
  const startedAtRef = useRef(null)

  useEffect(() => {
    // Local handles so cleanup always closes exactly the resources this run created,
    // even if start() is still mid-await when React StrictMode double-mounts us.
    let aborted = false
    let localPc = null
    let localMic = null
    let localDc = null

    const cleanupLocal = () => {
      try { localDc?.close() } catch {}
      try { localPc?.getSenders()?.forEach((s) => s.track?.stop()) } catch {}
      try { localPc?.close() } catch {}
      try { localMic?.getTracks().forEach((t) => t.stop()) } catch {}
    }

    const init = async () => {
      try {
        // 1. Ephemeral token
        const tokenRes = await fetch('/api/ai/assistant/realtime-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ conversationId }),
        })
        if (aborted) return
        const tokenData = await tokenRes.json()
        if (aborted) return
        if (!tokenRes.ok) throw new Error(tokenData.error || 'No se pudo iniciar sesion de voz')
        const ephemeralKey = tokenData?.client_secret?.value
        if (!ephemeralKey) throw new Error('Token ephemeral invalido')

        // 2. Peer connection
        localPc = new RTCPeerConnection()
        if (aborted) { cleanupLocal(); return }

        // 3. Remote audio playback
        const audioEl = document.createElement('audio')
        audioEl.autoplay = true
        audioElRef.current = audioEl
        localPc.ontrack = (e) => { audioEl.srcObject = e.streams[0] }

        // 4. Microphone
        localMic = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (aborted) { cleanupLocal(); return }
        localMic.getTracks().forEach((track) => localPc.addTrack(track, localMic))

        // 5. Data channel for events
        localDc = localPc.createDataChannel('oai-events')
        localDc.addEventListener('message', handleEvent)
        localDc.addEventListener('open', () => { if (!aborted) { setState('active'); startedAtRef.current = Date.now() } })

        // 6. Offer / answer
        const offer = await localPc.createOffer()
        if (aborted) { cleanupLocal(); return }
        await localPc.setLocalDescription(offer)
        if (aborted) { cleanupLocal(); return }

        const sdpRes = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
          method: 'POST',
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp',
          },
        })
        if (aborted) { cleanupLocal(); return }
        if (!sdpRes.ok) {
          const txt = await sdpRes.text().catch(() => '')
          throw new Error('No se pudo conectar con OpenAI: ' + (txt.substring(0, 200) || sdpRes.status))
        }
        const answerSdp = await sdpRes.text()
        if (aborted) { cleanupLocal(); return }
        await localPc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
        if (aborted) { cleanupLocal(); return }

        // Success — publish refs so finish() can access them for the persist step.
        pcRef.current = localPc
        dataChannelRef.current = localDc
        micStreamRef.current = localMic
      } catch (err) {
        if (aborted) return
        console.error('Voice chat start error:', err)
        setError(err.message || 'Error al iniciar modo voz')
        setState('error')
        cleanupLocal()
      }
    }

    init()

    return () => {
      aborted = true
      cleanupLocal()
      // Clear shared refs if they point to this run's instances
      if (pcRef.current === localPc) pcRef.current = null
      if (dataChannelRef.current === localDc) dataChannelRef.current = null
      if (micStreamRef.current === localMic) micStreamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEvent = (e) => {
    try {
      const ev = JSON.parse(e.data)

      // Capture session id for usage logging
      if (ev.type === 'session.created' || ev.type === 'session.updated') {
        sessionIdRef.current = ev.session?.id || sessionIdRef.current
      }

      // User final transcription
      if (ev.type === 'conversation.item.input_audio_transcription.completed') {
        const text = (ev.transcript || '').trim()
        if (text) transcriptRef.current.push({ role: 'user', content: text })
      }

      // Assistant text delta (accumulating)
      if (ev.type === 'response.audio_transcript.delta') {
        const id = ev.item_id || 'current'
        pendingAssistantRef.current[id] = (pendingAssistantRef.current[id] || '') + (ev.delta || '')
      }
      // Assistant text final
      if (ev.type === 'response.audio_transcript.done') {
        const id = ev.item_id || 'current'
        const text = (ev.transcript || pendingAssistantRef.current[id] || '').trim()
        delete pendingAssistantRef.current[id]
        if (text) transcriptRef.current.push({ role: 'assistant', content: text })
      }

      // Visual feedback when assistant speaks
      if (ev.type === 'response.audio.delta' || ev.type === 'output_audio_buffer.started') {
        setIsAssistantSpeaking(true)
      }
      if (ev.type === 'response.done' || ev.type === 'output_audio_buffer.stopped') {
        setIsAssistantSpeaking(false)
      }

      // Accumulate usage from response.done events — this is the source of truth for billing
      if (ev.type === 'response.done' && ev.response?.usage) {
        const u = ev.response.usage
        usageRef.current.input_tokens += u.input_tokens || 0
        usageRef.current.output_tokens += u.output_tokens || 0
        const inDetails = u.input_token_details || {}
        const outDetails = u.output_token_details || {}
        usageRef.current.input_audio_tokens += inDetails.audio_tokens || 0
        usageRef.current.input_text_tokens += inDetails.text_tokens || 0
        usageRef.current.output_audio_tokens += outDetails.audio_tokens || 0
        usageRef.current.output_text_tokens += outDetails.text_tokens || 0
      }

      if (ev.type === 'error') {
        console.error('Realtime error event:', ev)
      }
    } catch (err) {
      console.error('Event parse error:', err)
    }
  }

  const cleanup = () => {
    try { dataChannelRef.current?.close() } catch {}
    try { pcRef.current?.getSenders()?.forEach((s) => s.track?.stop()) } catch {}
    try { pcRef.current?.close() } catch {}
    try { micStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
    pcRef.current = null
    dataChannelRef.current = null
    micStreamRef.current = null
  }

  const finish = async () => {
    cleanup()

    // Fire-and-forget usage log (don't block close on this)
    const totalUsage = usageRef.current
    const anyUsage = Object.values(totalUsage).some((n) => n > 0)
    if (anyUsage) {
      const durationSec = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : null
      fetch('/api/ai/assistant/realtime-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-12-17',
          sessionId: sessionIdRef.current,
          conversationId,
          durationSec,
          usage: totalUsage,
        }),
      }).catch((err) => console.error('realtime-usage log error:', err))
    }

    const messages = transcriptRef.current
    if (messages.length > 0 && conversationId) {
      setSaving(true)
      try {
        const res = await fetch(`/api/ai/assistant/conversations/${conversationId}/voice-messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages }),
        })
        if (res.ok) {
          const data = await res.json()
          onSaved?.(data.messages || [])
        }
      } catch (err) {
        console.error('Save voice transcript error:', err)
      }
      setSaving(false)
    } else {
      onSaved?.([])
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
        <button
          onClick={finish}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div
            className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-5 transition-all ${
              state === 'active' && isAssistantSpeaking
                ? 'bg-[#e8f0f0] ring-4 ring-[#1a3a3a]/20 animate-pulse'
                : state === 'active'
                ? 'bg-[#e8f0f0]'
                : 'bg-slate-100'
            }`}
          >
            {state === 'connecting' ? (
              <Loader2 className="w-8 h-8 text-[#1a3a3a] animate-spin" />
            ) : state === 'error' ? (
              <AlertCircle className="w-8 h-8 text-red-500" />
            ) : (
              <AudioLines className={`w-8 h-8 text-[#1a3a3a] ${isAssistantSpeaking ? 'animate-pulse' : ''}`} />
            )}
          </div>

          {state === 'connecting' && (
            <>
              <h2 className="text-xl font-bold text-slate-900">Conectando...</h2>
              <p className="text-slate-500 text-sm mt-2">Preparando sesion de voz con Coach AI.</p>
            </>
          )}
          {state === 'active' && (
            <>
              <h2 className="text-xl font-bold text-slate-900">Modo voz activo</h2>
              <p className="text-slate-500 text-sm mt-2">
                Coach AI esta escuchando. Puede conversar de forma natural.
              </p>
            </>
          )}
          {state === 'error' && (
            <>
              <h2 className="text-xl font-bold text-red-600">Error</h2>
              <p className="text-slate-500 text-sm mt-2">{error}</p>
            </>
          )}

          <button
            onClick={finish}
            disabled={saving}
            className="mt-6 px-6 py-3 bg-[#1a3a3a] text-white rounded-lg font-semibold text-sm hover:bg-[#224a4a] transition-all disabled:opacity-50"
          >
            {saving ? 'Guardando...' : state === 'error' ? 'Cerrar' : 'Finalizar conversacion'}
          </button>

          {state === 'active' && transcriptRef.current.length > 0 && (
            <p className="text-[11px] text-slate-400 mt-3">
              {transcriptRef.current.length} mensaje{transcriptRef.current.length === 1 ? '' : 's'} en esta sesion
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default VoiceChatModal
