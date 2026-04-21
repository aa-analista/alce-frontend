/**
 * Text-to-speech using OpenAI TTS API via backend proxy.
 * Voice: "nova" (natural, warm female voice)
 */

let currentAudio = null

/**
 * Speak text using OpenAI TTS.
 * @param {string} text - Text to speak
 * @param {string} token - Auth token
 * @param {object} options - { onEnd, onError }
 */
export async function speakText(text, token, { onEnd } = {}) {
  if (!text?.trim()) return

  // Stop any ongoing audio
  stopSpeech()

  // Clean markdown and special chars for natural speech
  const clean = text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[_~]/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .trim()

  if (!clean) { if (onEnd) onEnd(); return }

  try {
    const res = await fetch('/api/ai/assistant/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: clean }),
    })

    if (!res.ok) {
      console.error('TTS failed:', res.status)
      if (onEnd) onEnd()
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentAudio = audio

    audio.onended = () => {
      URL.revokeObjectURL(url)
      currentAudio = null
      if (onEnd) onEnd()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      currentAudio = null
      if (onEnd) onEnd()
    }

    await audio.play()
  } catch (err) {
    console.error('TTS error:', err)
    currentAudio = null
    if (onEnd) onEnd()
  }
}

/**
 * Stop any ongoing speech.
 */
export function stopSpeech() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}
