import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGoogleOAuth } from '../hooks/useGoogleOAuth'
import { useOutletContext, useNavigate } from 'react-router-dom'
import {
  Mail, Link2, Unlink, CheckCircle2, XCircle, RefreshCw, AlertCircle,
  ShoppingBag, Star, Inbox, Search, ChevronLeft, ArrowLeft, Clock, User, X
} from 'lucide-react'

const SCOPE = 'https://www.googleapis.com/auth/gmail.modify'

const LABELS = [
  { id: 'INBOX', name: 'Recibidos', icon: Inbox },
  { id: 'STARRED', name: 'Destacados', icon: Star },
  { id: 'SENT', name: 'Enviados', icon: Mail },
]

// Parse "Name <email>" format
const parseFrom = (from) => {
  if (!from) return { name: '', email: '' }
  const match = from.match(/^"?([^"<]*)"?\s*<?([^>]*)>?$/)
  if (match) {
    return { name: match[1].trim() || match[2], email: match[2] || match[1] }
  }
  return { name: from, email: from }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }
  const isThisYear = d.getFullYear() === now.getFullYear()
  if (isThisYear) {
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

const GmailPage = () => {
  const { token } = useAuth()
  const { connect, disconnect, connecting } = useGoogleOAuth()
  const { flows } = useOutletContext()
  const navigate = useNavigate()

  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState('')
  const [activeLabel, setActiveLabel] = useState('INBOX')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [nextPageToken, setNextPageToken] = useState(null)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [messageDetail, setMessageDetail] = useState(null)

  const isModuleActive = flows.some(f => f.id === 'google-gmail' && f.active)
  const isBusy = connecting === 'google-gmail'

  // Check connection
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/integrations/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          const connected = !!data.integrations?.['google-gmail']
          setIsConnected(connected)
          if (connected) fetchMessages('INBOX', '')
        }
      } catch (err) {
        console.error('Status error:', err)
      }
      setLoading(false)
    }
    fetchStatus()
  }, [token])

  const fetchMessages = async (label, query, pageToken) => {
    setLoadingMessages(true)
    setError('')
    try {
      const params = new URLSearchParams({ label: label || 'INBOX', maxResults: '30' })
      if (query) params.set('q', query)
      if (pageToken) params.set('pageToken', pageToken)

      const res = await fetch(`/api/integrations/google-gmail/messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.details || errData.error || 'Error al cargar correos')
      }
      const data = await res.json()
      setMessages(pageToken ? [...messages, ...data.messages] : data.messages)
      setNextPageToken(data.nextPageToken)
    } catch (err) {
      setError(err.message)
    }
    setLoadingMessages(false)
  }

  const handleLabelChange = (labelId) => {
    setActiveLabel(labelId)
    setSelectedMessage(null)
    setMessageDetail(null)
    fetchMessages(labelId, searchQuery)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setSelectedMessage(null)
    setMessageDetail(null)
    fetchMessages(activeLabel, searchInput)
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
    fetchMessages(activeLabel, '')
  }

  const openMessage = async (msg) => {
    setSelectedMessage(msg)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/integrations/google-gmail/messages/${msg.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setMessageDetail(await res.json())
      }
    } catch (err) {
      console.error('Error loading message:', err)
    }
    setLoadingDetail(false)
  }

  const handleConnect = async () => {
    try {
      await connect('google-gmail', SCOPE)
      setIsConnected(true)
      fetchMessages('INBOX', '')
    } catch (err) {
      console.error('Connect error:', err)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect('google-gmail')
      setIsConnected(false)
      setMessages([])
    } catch (err) {
      console.error('Disconnect error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent" />
      </div>
    )
  }

  // Module not active
  if (!isModuleActive) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-slate-300" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Gmail no esta activo</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">Activa este conector desde el Marketplace para poder usarlo.</p>
          <button onClick={() => navigate('/marketplace')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm">
            <ShoppingBag className="w-4 h-4" />
            Ir al Marketplace
          </button>
        </div>
      </div>
    )
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Gmail</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">Conecta tu cuenta de Google para ver y gestionar tus correos.</p>
          <button onClick={handleConnect} disabled={isBusy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50 shadow-sm">
            <Link2 className="w-4 h-4" />
            {isBusy ? 'Conectando...' : 'Conectar Gmail'}
          </button>
        </div>
      </div>
    )
  }

  // ── Message detail view ──
  if (selectedMessage && messageDetail) {
    const from = parseFrom(messageDetail.from)
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSelectedMessage(null); setMessageDetail(null) }}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la bandeja
        </button>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Subject header */}
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">{messageDetail.subject || '(Sin asunto)'}</h2>
            <div className="flex items-center gap-3 mt-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-sm font-semibold text-red-600 flex-shrink-0">
                {from.name[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{from.name}</p>
                <p className="text-xs text-slate-400">{from.email}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
                <Clock className="w-3 h-3" />
                {new Date(messageDetail.date).toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>
            {messageDetail.to && (
              <p className="text-xs text-slate-400 mt-2">Para: {messageDetail.to}</p>
            )}
          </div>

          {/* Body */}
          <div className="p-5">
            {loadingDetail ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent" />
              </div>
            ) : messageDetail.isHtml ? (
              <div
                className="prose prose-sm max-w-none text-slate-700 [&_a]:text-blue-600 [&_img]:max-w-full [&_img]:rounded-lg"
                dangerouslySetInnerHTML={{ __html: messageDetail.body }}
              />
            ) : (
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                {messageDetail.body}
              </pre>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Loading detail ──
  if (selectedMessage && loadingDetail) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSelectedMessage(null); setMessageDetail(null) }}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la bandeja
        </button>
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent" />
        </div>
      </div>
    )
  }

  // ── Main inbox view ──
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <Mail className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Gmail</h2>
            <p className="text-sm text-slate-500">Tu bandeja de entrada sincronizada.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchMessages(activeLabel, searchQuery)} disabled={loadingMessages} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 font-medium hover:bg-red-50 rounded-lg transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <CheckCircle2 className="w-3 h-3" />
            Conectado
          </span>
          <button onClick={handleDisconnect} disabled={isBusy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-all">
            <Unlink className="w-3 h-3" />
            Desconectar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Labels + Search */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {LABELS.map((label) => {
            const Icon = label.icon
            return (
              <button
                key={label.id}
                onClick={() => handleLabelChange(label.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeLabel === label.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label.name}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar correos..."
            className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500/40 outline-none transition-all"
          />
          {searchQuery && (
            <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loadingMessages && messages.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent mx-auto mb-3" />
            <p className="text-sm text-slate-400">Cargando correos...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No hay correos{searchQuery ? ' para esta busqueda' : ''}.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-50">
              {messages.map((msg) => {
                const from = parseFrom(msg.from)
                return (
                  <div
                    key={msg.id}
                    onClick={() => openMessage(msg)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-red-50/30 ${
                      msg.isUnread ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                      msg.isUnread ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {from.name[0]?.toUpperCase() || '?'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm truncate ${msg.isUnread ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                          {from.name}
                        </span>
                        {msg.isStarred && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                      </div>
                      <p className={`text-sm truncate ${msg.isUnread ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                        {msg.subject || '(Sin asunto)'}
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {msg.snippet}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="flex-shrink-0 text-right">
                      <span className={`text-xs ${msg.isUnread ? 'font-semibold text-red-500' : 'text-slate-400'}`}>
                        {formatDate(msg.date)}
                      </span>
                      {msg.isUnread && (
                        <div className="w-2 h-2 rounded-full bg-red-500 ml-auto mt-1" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Load more */}
            {nextPageToken && (
              <div className="p-3 border-t border-slate-100 text-center">
                <button
                  onClick={() => fetchMessages(activeLabel, searchQuery, nextPageToken)}
                  disabled={loadingMessages}
                  className="text-sm text-red-600 font-medium hover:text-red-700 transition-colors disabled:opacity-50"
                >
                  {loadingMessages ? 'Cargando...' : 'Cargar mas correos'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default GmailPage
