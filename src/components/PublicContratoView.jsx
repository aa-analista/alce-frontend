import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Printer, CheckCircle2, XCircle, Loader2, FileSignature, ShieldCheck, AlertTriangle
} from 'lucide-react'

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

export default function PublicContratoView() {
  const { token } = useParams()
  const [propuesta, setPropuesta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAccept, setShowAccept] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [firmaForm, setFirmaForm] = useState({ nombre: '', email: '' })
  const [rechazoMotivo, setRechazoMotivo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetch(`/api/public/contratos/${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) setError(data.error || 'Error al cargar la propuesta')
        else setPropuesta(data)
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [token])

  const handleAceptar = async (e) => {
    e.preventDefault()
    if (!firmaForm.nombre.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/contratos/${token}/aceptar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firmaForm),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('¡Gracias! Tu propuesta ha sido aceptada. El asesor se pondrá en contacto contigo en breve.')
        setShowAccept(false)
        setPropuesta({ ...propuesta, estado: 'firmada', firmada_nombre: firmaForm.nombre })
      } else {
        setError(data.error || 'Error al firmar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRechazar = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/contratos/${token}/rechazar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: rechazoMotivo }),
      })
      if (res.ok) {
        setSuccess('Tu respuesta ha sido registrada. Gracias.')
        setShowReject(false)
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#1a3a3a] animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-500">Cargando propuesta…</p>
        </div>
      </div>
    )
  }

  if (error && !propuesta) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center bg-white rounded-2xl border border-slate-200 p-8">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-900 mb-1">No se pudo cargar la propuesta</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!propuesta) return null

  const fechaEmision = new Date(propuesta.created_at)
  const fechaVencimiento = new Date(fechaEmision.getTime() + (propuesta.vigencia_dias || 30) * 24 * 60 * 60 * 1000)
  const yaFirmada = propuesta.estado === 'firmada'
  const yaVencida = propuesta.estado === 'vencida'
  const puedeFirmar = !yaFirmada && !yaVencida

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { size: letter; margin: 0; }
        }
      `}</style>

      {/* Top bar (no se imprime) */}
      <div className="no-print max-w-[850px] mx-auto mb-4">
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-slate-600">
              Propuesta oficial · Folio <strong className="text-[#1a3a3a]">{propuesta.folio}</strong>
            </span>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Guardar PDF
          </button>
        </div>
      </div>

      {/* Mensaje de éxito */}
      {success && (
        <div className="no-print max-w-[850px] mx-auto mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-5 py-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Estado banner */}
      {yaFirmada && (
        <div className="no-print max-w-[850px] mx-auto mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-5 py-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <p className="text-sm">Esta propuesta ya fue aceptada{propuesta.firmada_nombre ? ` por ${propuesta.firmada_nombre}` : ''}.</p>
        </div>
      )}
      {yaVencida && (
        <div className="no-print max-w-[850px] mx-auto mb-4 bg-red-50 border border-red-200 text-red-800 rounded-xl px-5 py-3 flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm">Esta propuesta venció. Contacta a tu asesor para solicitar una nueva.</p>
        </div>
      )}

      {/* ─── Documento (igual que el preview interno) ─── */}
      <div className="print-area bg-white shadow-lg max-w-[850px] mx-auto" style={{ minHeight: '1100px' }}>
        {/* MEMBRETE */}
        <div className="px-12 py-8 border-b-4" style={{ borderColor: '#1a3a3a' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
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

        <div className="px-12 py-6 text-center bg-slate-50">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Propuesta de servicio</p>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">{propuesta.tramite_nombre}</h2>
        </div>

        <div className="px-12 py-8 space-y-6">
          <div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Estimado(a) <strong>{propuesta.cliente_nombre}</strong>{propuesta.cliente_ciudad ? ` de ${propuesta.cliente_ciudad}` : ''}:
            </p>
            <p className="text-sm text-slate-700 leading-relaxed mt-3">
              Por este medio le presentamos la propuesta para el trámite de
              <strong> {propuesta.tramite_nombre}</strong>, esperando que la encuentre adecuada a sus necesidades.
            </p>
          </div>

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
              <Row label="Nombre" value={propuesta.vendedor_nombre || '—'} />
              <Row label="Puesto" value={propuesta.vendedor_puesto || '—'} />
              <Row label="Correo" value={propuesta.vendedor_correo || '—'} />
              <Row label="Teléfono" value={propuesta.vendedor_telefono || '—'} />
            </div>
          </div>

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

          {propuesta.notas && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Observaciones</p>
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{propuesta.notas}</p>
              </div>
            </div>
          )}

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

          <div className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200 pt-4">
            <p className="font-semibold text-slate-700 mb-2">Términos y condiciones</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Los honorarios cubren la asesoría profesional, integración de expediente y seguimiento del trámite.</li>
              <li>No incluyen pago de derechos gubernamentales, traducciones, apostillas ni gastos de envío.</li>
              <li>Los tiempos de respuesta están sujetos a las autoridades migratorias correspondientes.</li>
              <li>Esta propuesta tiene una vigencia de {propuesta.vigencia_dias} días naturales a partir de su emisión.</li>
            </ul>
          </div>

          <div className="pt-4">
            <p className="text-sm text-slate-700 leading-relaxed">Sin más por el momento, quedamos a sus órdenes.</p>
            <div className="mt-8">
              <p className="text-sm font-semibold text-slate-900">{propuesta.vendedor_nombre || '—'}</p>
              {propuesta.vendedor_puesto && <p className="text-xs text-slate-500">{propuesta.vendedor_puesto}</p>}
              <p className="text-xs font-semibold mt-1" style={{ color: '#1a3a3a' }}>Extranjería México</p>
            </div>
          </div>
        </div>

        <div className="px-12 py-4 border-t-2 mt-8 text-center" style={{ borderColor: '#1a3a3a' }}>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">
            Documento generado el {fmtFecha(fechaEmision)} · Folio {propuesta.folio}
          </p>
        </div>
      </div>

      {/* ─── Botones de acción del cliente ─── */}
      {puedeFirmar && (
        <div className="no-print max-w-[850px] mx-auto mt-6 bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-center mb-4">
            <FileSignature className="w-8 h-8 text-[#1a3a3a] mx-auto mb-2" />
            <h3 className="text-base font-semibold text-slate-900">¿Estás de acuerdo con esta propuesta?</h3>
            <p className="text-xs text-slate-500 mt-1">Tu respuesta nos llegará al instante</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowReject(true)}
              className="px-4 py-3 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              No, gracias
            </button>
            <button
              onClick={() => setShowAccept(true)}
              className="px-4 py-3 text-sm font-semibold text-white bg-[#1a3a3a] rounded-lg hover:bg-[#0f2828] transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Aceptar propuesta
            </button>
          </div>
        </div>
      )}

      {/* Modal Aceptar */}
      {showAccept && (
        <div className="no-print fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Aceptar propuesta</h3>
            <p className="text-xs text-slate-500 mb-4">
              Para confirmar tu aceptación, por favor confirma tus datos.
            </p>
            <form onSubmit={handleAceptar} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tu nombre completo *</label>
                <input
                  type="text"
                  value={firmaForm.nombre}
                  onChange={e => setFirmaForm({ ...firmaForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tu correo electrónico</label>
                <input
                  type="email"
                  value={firmaForm.email}
                  onChange={e => setFirmaForm({ ...firmaForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40"
                  placeholder="opcional"
                />
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-[11px] text-slate-500 leading-relaxed">
                Al hacer clic en "Confirmar aceptación" estás aceptando los términos descritos en esta propuesta con folio <strong>{propuesta.folio}</strong>.
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccept(false)}
                  className="flex-1 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[#1a3a3a] rounded-lg hover:bg-[#0f2828] disabled:opacity-50"
                >
                  {submitting ? 'Procesando…' : 'Confirmar aceptación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rechazar */}
      {showReject && (
        <div className="no-print fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">¿Por qué declinas?</h3>
            <p className="text-xs text-slate-500 mb-4">Tu retroalimentación nos ayuda a mejorar (opcional).</p>
            <form onSubmit={handleRechazar} className="space-y-3">
              <textarea
                value={rechazoMotivo}
                onChange={e => setRechazoMotivo(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20"
                placeholder="Ej: Encontré una opción más económica, ya no necesito el servicio…"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowReject(false)}
                  className="flex-1 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Enviando…' : 'Enviar respuesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer público */}
      <div className="no-print max-w-[850px] mx-auto mt-6 text-center text-xs text-slate-400">
        <p>Powered by <span className="font-semibold text-slate-500">Alce AI</span> · Plataforma B2B</p>
      </div>
    </div>
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
