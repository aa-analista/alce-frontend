import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Printer, Edit2, Send, Mail, Link2, Copy, Check, FileText, FolderOpen } from 'lucide-react'
import { updatePropuesta, enviarPorCorreo } from '../utils/contratosApi'
import ContratoExpediente from './ContratoExpediente'

function fmtMoney(amount, currency = 'MXN') {
  if (amount === null || amount === undefined) return '$0.00'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)
}

function fmtFecha(d) {
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtFechaCorta(d) {
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ContratoPreview({ propuesta, onBack, onEdit }) {
  const { user, token } = useAuth()
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState('propuesta') // propuesta | expediente
  const fechaEmision = propuesta.created_at ? new Date(propuesta.created_at) : new Date()
  const fechaVencimiento = new Date(fechaEmision.getTime() + (propuesta.vigencia_dias || 30) * 24 * 60 * 60 * 1000)

  // Link público para que el cliente abra y firme
  const publicLink = propuesta.public_token
    ? `${window.location.origin}/p/${propuesta.public_token}`
    : null

  const handlePrint = () => {
    window.print()
  }

  const handleCopyLink = async () => {
    if (!publicLink) return
    try {
      await navigator.clipboard.writeText(publicLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = publicLink
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleEmail = async () => {
    if (!propuesta.cliente_correo) {
      alert('El cliente no tiene correo registrado')
      return
    }
    // 1️⃣ Intentar enviar desde el servidor (HTML bonito + auto-cambio de estado)
    try {
      const result = await enviarPorCorreo(token, propuesta.id)
      if (result.ok) {
        alert(`✅ Correo enviado a ${result.sent_to}`)
        return
      }
    } catch (err) {
      // Si el server no tiene SMTP, caer a mailto:
      if (!err.message?.includes('SMTP')) {
        console.warn('Server email failed, fallback to mailto:', err.message)
      }
    }

    // 2️⃣ Fallback: cliente de correo del SO (mailto:)
    if (propuesta.estado === 'borrador') {
      try { await updatePropuesta(token, propuesta.id, { estado: 'enviada' }) } catch {}
    }
    const subject = encodeURIComponent(`Propuesta ${propuesta.folio} — ${propuesta.tramite_nombre || 'Trámite'}`)
    const linkLine = publicLink
      ? `\n👉 Ver y aceptar la propuesta:\n${publicLink}\n\n`
      : '\n'
    const body = encodeURIComponent(
      `Estimado(a) ${propuesta.cliente_nombre},\n\n` +
      `Adjunto encontrará la propuesta para su trámite.\n` +
      `Folio: ${propuesta.folio}\n` +
      `Trámite: ${propuesta.tramite_nombre}\n` +
      linkLine +
      `Quedamos a sus órdenes.\n\n` +
      `${propuesta.vendedor_nombre || user?.name}\n` +
      `${propuesta.vendedor_puesto || ''}`
    )
    const cc = propuesta.vendedor_correo ? `&cc=${encodeURIComponent(propuesta.vendedor_correo)}` : ''
    window.location.href = `mailto:${propuesta.cliente_correo}?subject=${subject}&body=${body}${cc}`
  }

  return (
    <>
      {/* CSS para impresión: ocultar todo excepto el documento */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { size: letter; margin: 0; }
        }
      `}</style>

      {/* Toolbar (no se imprime) */}
      <div className="no-print space-y-4 max-w-[850px] mx-auto">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al listado
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Edit2 className="w-4 h-4" /> Editar
            </button>
            {publicLink && (
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                title="Copiar link público para el cliente"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Link2 className="w-4 h-4" />}
                {copied ? '¡Copiado!' : 'Copiar link'}
              </button>
            )}
            <button
              onClick={handleEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Mail className="w-4 h-4" /> Enviar por correo
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1a3a3a] text-white text-sm font-medium rounded-lg hover:bg-[#0f2828] transition-colors"
            >
              <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
            </button>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
          💡 Para guardar como PDF: presiona <strong>"Imprimir / Guardar PDF"</strong> y selecciona <strong>"Guardar como PDF"</strong> en el destino de impresión.
        </div>

        {/* Tabs internos del preview */}
        <div className="flex gap-1 border-b border-slate-200">
          <button
            onClick={() => setTab('propuesta')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'propuesta' ? 'border-[#1a3a3a] text-[#1a3a3a]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" /> Propuesta
          </button>
          <button
            onClick={() => setTab('expediente')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'expediente' ? 'border-[#1a3a3a] text-[#1a3a3a]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FolderOpen className="w-4 h-4" /> Expediente
          </button>
        </div>

        {publicLink && tab === 'propuesta' && (
          <div className="bg-[#1a3a3a]/5 border border-[#1a3a3a]/20 rounded-lg px-4 py-3 flex items-center gap-3">
            <Link2 className="w-4 h-4 text-[#1a3a3a] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Link público para el cliente</p>
              <p className="text-xs font-mono text-slate-700 truncate">{publicLink}</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              {propuesta.vista_at && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">👁 Vista</span>}
              {propuesta.firmada_at && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">✍ Firmada</span>}
            </div>
          </div>
        )}
      </div>

      {/* Tab: Expediente */}
      {tab === 'expediente' && (
        <div className="no-print max-w-[850px] mx-auto mt-4">
          <ContratoExpediente propuestaId={propuesta.id} />
        </div>
      )}

      {/* ─── Documento (solo en tab Propuesta) ─── */}
      {tab === 'propuesta' && (
      <div className="print-area mt-4 bg-white shadow-lg max-w-[850px] mx-auto" style={{ minHeight: '1100px' }}>
        {/* MEMBRETE */}
        <div className="px-12 py-8 border-b-4" style={{ borderColor: '#1a3a3a' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: '#1a3a3a' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-8 h-8">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1a3a3a' }}>Extranjería México</h1>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Asesoría migratoria profesional</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Folio</p>
              <p className="text-lg font-mono font-bold" style={{ color: '#1a3a3a' }}>{propuesta.folio}</p>
              <p className="text-xs text-slate-500 mt-1">{fmtFecha(fechaEmision)}</p>
            </div>
          </div>
        </div>

        {/* TÍTULO */}
        <div className="px-12 py-6 text-center bg-slate-50">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Propuesta de servicio</p>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">{propuesta.tramite_nombre}</h2>
          {propuesta.tramite_idioma && (
            <p className="text-xs text-slate-500 mt-1 capitalize">Idioma: {propuesta.tramite_idioma}</p>
          )}
        </div>

        {/* BLOQUE PRINCIPAL */}
        <div className="px-12 py-8 space-y-6">
          {/* Saludo */}
          <div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Estimado(a) <strong>{propuesta.cliente_nombre}</strong>{propuesta.cliente_ciudad ? ` de ${propuesta.cliente_ciudad}` : ''}:
            </p>
            <p className="text-sm text-slate-700 leading-relaxed mt-3">
              Por este medio le presentamos la propuesta para el trámite de
              <strong> {propuesta.tramite_nombre}</strong>, esperando que la encuentre adecuada a sus necesidades.
              Quedamos a su disposición para resolver cualquier duda.
            </p>
          </div>

          {/* Datos cliente / asesor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Datos del cliente</p>
              <Row label="Nombre" value={propuesta.cliente_nombre} />
              <Row label="Ciudad" value={propuesta.cliente_ciudad || '—'} />
              <Row label="Correo" value={propuesta.cliente_correo || '—'} />
              <Row label="Teléfono" value={propuesta.cliente_telefono || '—'} />
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Asesor asignado</p>
              <Row label="Nombre" value={propuesta.vendedor_nombre || user?.name} />
              <Row label="Puesto" value={propuesta.vendedor_puesto || '—'} />
              <Row label="Correo" value={propuesta.vendedor_correo || user?.email} />
              <Row label="Teléfono" value={propuesta.vendedor_telefono || '—'} />
            </div>
          </div>

          {/* Honorarios */}
          <div className="border-2 rounded-lg overflow-hidden" style={{ borderColor: '#1a3a3a' }}>
            <div className="px-5 py-2.5 text-white text-xs font-semibold uppercase tracking-widest" style={{ background: '#1a3a3a' }}>
              Honorarios profesionales
            </div>
            <div className="px-5 py-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">{propuesta.tramite_nombre}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Incluye gestión completa del trámite</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold" style={{ color: '#1a3a3a' }}>
                  {fmtMoney(propuesta.precio, propuesta.moneda)}
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">{propuesta.moneda}</p>
              </div>
            </div>
          </div>

          {/* Notas */}
          {propuesta.notas && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Observaciones</p>
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{propuesta.notas}</p>
              </div>
            </div>
          )}

          {/* Vigencia */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Emitida</p>
              <p className="text-sm font-semibold text-slate-700">{fmtFechaCorta(fechaEmision)}</p>
            </div>
            <div className="border-x border-slate-200">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Vigencia</p>
              <p className="text-sm font-semibold text-slate-700">{propuesta.vigencia_dias} días</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Válida hasta</p>
              <p className="text-sm font-semibold text-slate-700">{fmtFechaCorta(fechaVencimiento)}</p>
            </div>
          </div>

          {/* Términos */}
          <div className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200 pt-4">
            <p className="font-semibold text-slate-700 mb-2">Términos y condiciones</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Los honorarios cubren la asesoría profesional, integración de expediente y seguimiento del trámite.</li>
              <li>No incluyen pago de derechos gubernamentales, traducciones, apostillas ni gastos de envío.</li>
              <li>Los tiempos de respuesta están sujetos a las autoridades migratorias correspondientes.</li>
              <li>Esta propuesta tiene una vigencia de {propuesta.vigencia_dias} días naturales a partir de su emisión.</li>
            </ul>
          </div>

          {/* Cierre */}
          <div className="pt-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              Sin más por el momento, quedamos a sus órdenes.
            </p>
            <div className="mt-8">
              <p className="text-sm font-semibold text-slate-900">{propuesta.vendedor_nombre || user?.name}</p>
              {propuesta.vendedor_puesto && (
                <p className="text-xs text-slate-500">{propuesta.vendedor_puesto}</p>
              )}
              <p className="text-xs font-semibold mt-1" style={{ color: '#1a3a3a' }}>
                Extranjería México
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-12 py-4 border-t-2 mt-8 text-center" style={{ borderColor: '#1a3a3a' }}>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">
            Documento generado el {fmtFecha(fechaEmision)} · Folio {propuesta.folio}
          </p>
        </div>
      </div>
      )}
    </>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline gap-2 text-xs py-0.5">
      <span className="text-slate-400 w-16 flex-shrink-0">{label}:</span>
      <span className="text-slate-700 font-medium">{value}</span>
    </div>
  )
}
