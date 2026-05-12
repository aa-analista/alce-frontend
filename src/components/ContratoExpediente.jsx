import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Upload, FileText, Image as ImageIcon, Loader2, Sparkles, Trash2,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp, ExternalLink, FolderOpen
} from 'lucide-react'
import { listDocumentos, uploadDocumento, ocrDocumento, deleteDocumento } from '../utils/contratosApi'

const CATEGORIAS = [
  { id: 'pasaporte', label: 'Pasaporte', emoji: '🛂' },
  { id: 'ine', label: 'INE / IFE', emoji: '🪪' },
  { id: 'curp', label: 'CURP', emoji: '📋' },
  { id: 'comprobante_domicilio', label: 'Comprobante de domicilio', emoji: '🏠' },
  { id: 'comprobante_ingresos', label: 'Comprobante de ingresos', emoji: '💵' },
  { id: 'fotografia', label: 'Fotografía', emoji: '📸' },
  { id: 'otro', label: 'Otro documento', emoji: '📄' },
]

function fmtSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtDate(d) {
  return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ContratoExpediente({ propuestaId }) {
  const { token } = useAuth()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [pendingCat, setPendingCat] = useState('otro')
  const [expanded, setExpanded] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(null)
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setDocs(await listDocumentos(token, propuestaId)) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [token, propuestaId])

  useEffect(() => { load() }, [load])

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      await uploadDocumento(token, propuestaId, file, pendingCat)
      load()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const handleOCR = async (docId) => {
    setOcrLoading(docId)
    try {
      await ocrDocumento(token, docId)
      load()
      setExpanded(docId)
    } catch (e) { alert('Error OCR: ' + e.message) }
    finally { setOcrLoading(null) }
  }

  const handleDelete = async (docId) => {
    if (!confirm('¿Eliminar este documento?')) return
    try { await deleteDocumento(token, docId); load() }
    catch (e) { alert('Error: ' + e.message) }
  }

  const onDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-[var(--brand-primary)]" />
          <h3 className="font-semibold text-slate-800 text-sm">Expediente del cliente</h3>
        </div>
        <span className="text-xs text-slate-400">
          {docs.length} {docs.length === 1 ? 'documento' : 'documentos'}
        </span>
      </div>

      {/* Drop zone + categoría */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-6"
      >
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {CATEGORIAS.map(c => (
            <button
              key={c.id}
              onClick={() => setPendingCat(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                pendingCat === c.id
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <div className="text-center">
          <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-600 mb-1">
            Arrastra un archivo aquí o
            <button
              onClick={() => fileRef.current?.click()}
              className="ml-1 text-[var(--brand-primary)] font-medium hover:underline"
            >
              haz click para seleccionar
            </button>
          </p>
          <p className="text-[11px] text-slate-400">JPG, PNG, PDF · Máx. 15 MB · Categoría seleccionada: <strong>{CATEGORIAS.find(c => c.id === pendingCat)?.label}</strong></p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            onChange={e => handleUpload(e.target.files[0])}
            className="hidden"
          />
          {uploading && (
            <p className="text-xs text-blue-600 mt-2 flex items-center justify-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo…
            </p>
          )}
        </div>
      </div>

      {/* Lista de documentos */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aún no hay documentos en el expediente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => {
            const cat = CATEGORIAS.find(c => c.id === doc.categoria) || CATEGORIAS.find(c => c.id === 'otro')
            const isImage = doc.mime_type?.startsWith('image/')
            const isExpanded = expanded === doc.id
            const ocrDone = doc.ocr_status === 'completado'

            return (
              <div key={doc.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                    {isImage ? <ImageIcon className="w-5 h-5 text-slate-400" /> : <FileText className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-400">{cat.emoji} {cat.label}</span>
                      {ocrDone && (
                        <span className="text-[10px] uppercase tracking-wide bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">
                          ✓ OCR
                        </span>
                      )}
                      {doc.ocr_status === 'procesando' && (
                        <span className="text-[10px] uppercase tracking-wide bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Procesando…</span>
                      )}
                      {doc.ocr_status === 'error' && (
                        <span className="text-[10px] uppercase tracking-wide bg-red-50 text-red-700 px-1.5 py-0.5 rounded">Error OCR</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.nombre_archivo}</p>
                    <p className="text-[11px] text-slate-400">{fmtSize(doc.size_bytes)} · {fmtDate(doc.uploaded_at)}</p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a
                      href={`/api/contratos/documentos/${doc.id}/archivo`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={async (e) => {
                        // Forzar token vía fetch + blob
                        e.preventDefault()
                        const r = await fetch(`/api/contratos/documentos/${doc.id}/archivo`, {
                          headers: { Authorization: `Bearer ${token}` }
                        })
                        const blob = await r.blob()
                        window.open(URL.createObjectURL(blob), '_blank')
                      }}
                      className="p-2 text-slate-400 hover:text-[var(--brand-primary)] hover:bg-slate-50 rounded transition-colors"
                      title="Ver archivo"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {isImage && !ocrDone && (
                      <button
                        onClick={() => handleOCR(doc.id)}
                        disabled={ocrLoading === doc.id || doc.ocr_status === 'procesando'}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-medium rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        {ocrLoading === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Extraer datos
                      </button>
                    )}
                    {ocrDone && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : doc.id)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
                        title={isExpanded ? 'Cerrar' : 'Ver datos extraídos'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Datos extraídos por OCR */}
                {isExpanded && ocrDone && doc.ocr_datos && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-purple-500" /> Datos extraídos por IA
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                      {Object.entries(doc.ocr_datos).map(([k, v]) => (
                        <div key={k} className="flex items-baseline gap-2 text-xs">
                          <span className="text-slate-500 capitalize">{k.replace(/_/g, ' ')}:</span>
                          <span className="text-slate-800 font-medium">{v || '—'}</span>
                        </div>
                      ))}
                    </div>
                    {doc.ocr_texto && (
                      <details className="mt-3">
                        <summary className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-700">Ver texto completo extraído</summary>
                        <pre className="mt-2 text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 whitespace-pre-wrap leading-relaxed">{doc.ocr_texto}</pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
