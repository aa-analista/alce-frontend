import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import * as XLSX from 'xlsx'
import {
  Database, Upload, FileSpreadsheet, Trash2, Save,
  CheckCircle2, AlertCircle, Plus, RefreshCw, BookOpen, Eraser,
  MessageCircle, Send, Bot, User
} from 'lucide-react'
import { useAssistant } from '../context/AssistantContext'
import AgentAdminPanel from './AgentAdminPanel'

const KnowledgeBaseModule = () => {
  const { token, user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const [rows, setRows] = useState([])
  const [existingFaqs, setExistingFaqs] = useState([])
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadingFaqs, setLoadingFaqs] = useState(true)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [editingCell, setEditingCell] = useState(null)
  const [tab, setTab] = useState('current')
  const [clearExisting, setClearExisting] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { lastAction } = useAssistant()

  // Chat State
  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', content: 'Hola! Soy el asistente de IA. Preguntame cualquier cosa sobre tu base de conocimiento.' }])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const sendMessage = async (e) => {
    e?.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMsg = { role: 'user', content: chatInput.trim() }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)

    const history = chatMessages.filter(m => m.role !== 'system').slice(-6)

    try {
      const res = await fetch('/api/knowledge/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userMsg.content, history })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + err.message }])
    } finally {
      setChatLoading(false)
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }

  // Listen to Voice Assistant
  useEffect(() => {
    if (lastAction?.action === 'chat_response' && lastAction?.data) {
      setChatMessages(prev => [
        ...prev,
        { role: 'user', content: lastAction.data.userText },
        { role: 'assistant', content: lastAction.data.aiText }
      ])
      setTab('chat')
    }
  }, [lastAction])

  // Fetch existing FAQs
  const fetchFaqs = async () => {
    setLoadingFaqs(true)
    try {
      const res = await fetch('/api/knowledge/faqs', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setExistingFaqs(data.faqs || [])
      }
    } catch (err) {
      console.error('Fetch FAQs error:', err)
    }
    setLoadingFaqs(false)
  }

  useEffect(() => { fetchFaqs() }, [])

  // Filtered FAQs
  const filteredFaqs = searchQuery
    ? existingFaqs.filter(f =>
        f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : existingFaqs

  // Drag & Drop
  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false) }, [])
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) processFile(file)
  }

  // Parse Excel
  const processFile = (file) => {
    setError(''); setSuccess('')
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Solo se aceptan archivos Excel (.xlsx, .xls)'); return
    }
    setFileName(file.name); setTab('upload')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 })

        const startIdx = (data[0] && typeof data[0][0] === 'string' &&
          (data[0][0].toLowerCase().includes('categor') ||
           data[0][0].toLowerCase().includes('pregunta'))) ? 1 : 0

        const parsed = data.slice(startIdx)
          .filter(row => row[0] || row[1])
          .map((row, i) => ({
            id: Date.now() + i,
            question: (row[0] || '').toString().trim(),
            answer: (row[1] || '').toString().trim()
          }))
        setRows(parsed)
      } catch { setError('Error al leer el archivo.') }
    }
    reader.readAsArrayBuffer(file)
  }

  const updateRow = (id, field, value) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }
  const addRow = () => setRows([...rows, { id: Date.now(), question: '', answer: '' }])
  const removeRow = (id) => setRows(rows.filter(r => r.id !== id))

  // Upload via backend API
  const handleUpload = async () => {
    if (rows.length === 0) { setError('No hay datos para cargar'); return }
    setUploading(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/knowledge/faqs', {
        method: 'POST', headers,
        body: JSON.stringify({
          faqs: rows.map(r => ({ question: r.question, answer: r.answer })),
          clearExisting
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(`${data.inserted} FAQs cargadas exitosamente!${data.cleared ? ' (anteriores eliminadas)' : ''}`)
      setRows([]); setFileName(''); setTab('current')
      setTimeout(() => fetchFaqs(), 1000)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.message)
    }
    setUploading(false)
  }

  const tabs = [
    { id: 'current', label: 'FAQs Actuales', icon: BookOpen, badge: existingFaqs.length || null },
    { id: 'upload', label: 'Cargar Excel', icon: Upload, badge: rows.length || null },
    { id: 'chat', label: 'Probar IA', icon: MessageCircle },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            Base de Conocimiento
          </h2>
          <p className="text-slate-500 text-sm mt-1">Gestiona las FAQs de tu agente IA.</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />{success}
        </div>
      )}

      {/* Fallback tab bar for non-admin users (admins get it from AgentAdminPanel) */}
      {!isAdmin && (
        <div className="flex border-b border-slate-200">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                  tab === t.id
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {t.badge > 0 && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                    tab === t.id ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>{t.badge}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <AgentAdminPanel
        moduleId="conocimiento"
        extraTabs={tabs}
        activeTab={tab}
        onTabChange={setTab}
      >
      {/* TAB: Current FAQs */}
      {tab === 'current' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-slate-900 text-sm">Base de Conocimiento Actual</h3>
              <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md">
                {filteredFaqs.length}{searchQuery ? ` / ${existingFaqs.length}` : ''} registros
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/40 outline-none w-44"
              />
              <button
                onClick={fetchFaqs}
                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loadingFaqs ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loadingFaqs ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" />
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Database className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{searchQuery ? 'Sin resultados' : 'No hay FAQs cargadas aun'}</p>
              {!searchQuery && (
                <button onClick={() => setTab('upload')}
                  className="mt-3 text-emerald-600 text-sm font-medium hover:underline">
                  Ir a Cargar Excel
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-slate-200">
                    <th className="w-12 px-4 py-2.5 text-center text-xs font-medium text-slate-400 uppercase">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/3">
                      Pregunta
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Respuesta
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredFaqs.map((faq, idx) => (
                    <tr key={faq.id || idx} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-slate-300 font-mono">{idx + 1}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700 font-medium">{faq.question || '--'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-600">{faq.answer || '--'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Chat */}
      {tab === 'chat' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[600px]">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <Bot className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Chat con Base de Conocimiento</h3>
              <p className="text-xs text-slate-500">Consulta la informacion vectorizada en Qdrant.</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-slate-600" />}
                </div>
                <div className={`p-3.5 rounded-xl text-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-200 flex-shrink-0">
                  <Bot className="w-4 h-4 text-slate-600" />
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-slate-500 rounded-tl-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Escribe tu pregunta aqui..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* TAB: Upload */}
      {tab === 'upload' && (
        <>
          {rows.length === 0 ? (
            <label
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              className={`flex flex-col items-center justify-center p-12 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 group bg-white ${
                isDragging ? 'border-emerald-400 bg-emerald-50/30 scale-[1.01]' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/10'
              }`}
            >
              <input type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="hidden" />
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-4 transition-all ${
                isDragging ? 'bg-emerald-100' : 'bg-slate-100 group-hover:bg-emerald-50'
              }`}>
                <FileSpreadsheet className={`w-8 h-8 transition-colors ${
                  isDragging ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-500'
                }`} />
              </div>
              <p className="text-base font-semibold text-slate-700">{isDragging ? 'Suelta el archivo aqui' : 'Arrastra tu archivo Excel aqui'}</p>
              <p className="text-slate-400 text-sm mt-1">o haz click para seleccionar</p>
              <p className="text-slate-300 text-xs mt-3">Columna A = Pregunta · Columna B = Respuesta</p>
              <div className="flex items-center gap-2 mt-3 text-xs text-slate-300">
                <span className="px-2 py-0.5 bg-slate-50 rounded">.xlsx</span>
                <span className="px-2 py-0.5 bg-slate-50 rounded">.xls</span>
              </div>
            </label>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-slate-700 text-sm">{fileName || 'Base de Conocimiento'}</p>
                    <p className="text-xs text-slate-400">{rows.length} preguntas listas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" /><span>Reemplazar</span>
                    <input type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="hidden" />
                  </label>
                  <button onClick={addRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" /><span>Agregar fila</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-slate-200">
                        <th className="w-10 px-3 py-2.5"></th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/3">Pregunta</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Respuesta</th>
                        <th className="w-12 px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rows.map((row, idx) => (
                        <tr key={row.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-2 text-center">
                            <span className="text-xs text-slate-300 font-mono">{idx + 1}</span>
                          </td>
                          <td className="px-4 py-2">
                            {editingCell === `${row.id}-q` ? (
                              <input type="text" value={row.question}
                                onChange={(e) => updateRow(row.id, 'question', e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                                autoFocus
                                className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm"
                              />
                            ) : (
                              <div onClick={() => setEditingCell(`${row.id}-q`)}
                                className="px-3 py-2 rounded-lg cursor-text hover:bg-emerald-50 text-sm text-slate-700 min-h-[36px] flex items-center">
                                {row.question || <span className="text-slate-300 italic">Click para editar...</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {editingCell === `${row.id}-a` ? (
                              <textarea value={row.answer}
                                onChange={(e) => updateRow(row.id, 'answer', e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                autoFocus rows={3}
                                className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm resize-none"
                              />
                            ) : (
                              <div onClick={() => setEditingCell(`${row.id}-a`)}
                                className="px-3 py-2 rounded-lg cursor-text hover:bg-emerald-50 text-sm text-slate-700 min-h-[36px] flex items-center">
                                {row.answer ? <span className="line-clamp-2">{row.answer}</span>
                                  : <span className="text-slate-300 italic">Click para editar...</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <button onClick={() => removeRow(row.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={addRow}
                      className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium hover:text-emerald-700">
                      <Plus className="w-4 h-4" /> Agregar pregunta
                    </button>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={clearExisting} onChange={(e) => setClearExisting(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Eraser className="w-3 h-3" /> Reemplazar base existente
                      </span>
                    </label>
                  </div>
                  <button onClick={handleUpload} disabled={uploading}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm">
                    {uploading ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /><span>Insertando con IA...</span></>
                    ) : (
                      <><Save className="w-4 h-4" /><span>Guardar en Base de Conocimiento</span></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </AgentAdminPanel>
    </div>
  )
}

export default KnowledgeBaseModule
