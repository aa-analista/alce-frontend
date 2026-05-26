/**
 * Vista pública de propuestas — el cliente abre este link sin login.
 * Ruta:  /propuestas/p/:token
 * API:   /api/propuestas-public/:token
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Printer, CheckCircle2, XCircle, Loader2, FileSignature,
  ShieldCheck, AlertTriangle, Clock
} from 'lucide-react'

const BRAND = 'var(--brand-primary, #101C44)'

function fmtMoney(amount, currency = 'MXN') {
  if (amount == null || amount === 0) return '$0.00'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)
}
function fmtFecha(d) {
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtFechaCorta(d) {
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function PublicPropuestaView() {
  const { token } = useParams()
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAccept, setShowAccept] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [firmaForm, setFirmaForm] = useState({ nombre: '', email: '' })
  const [rechazoMotivo, setRechazoMotivo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetch(`/api/propuestas-public/${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) setError(data.error || 'Error al cargar la propuesta')
        else {
          setP(data)
          // ── Aplicar branding de la organización al DOM ──
          // La vista pública NO está autenticada, así que AuthContext no
          // aplica los CSS vars. Lo hacemos aquí con los colores que vienen
          // del endpoint (snapshot actual de la marca de la org).
          if (typeof document !== 'undefined') {
            const root = document.documentElement
            if (data.brand_primary_color)    root.style.setProperty('--brand-primary',         data.brand_primary_color)
            if (data.brand_secondary_color)  root.style.setProperty('--brand-secondary',       data.brand_secondary_color)
            if (data.brand_accent_color)     root.style.setProperty('--brand-accent',          data.brand_accent_color)
            if (data.brand_text_on_primary)  root.style.setProperty('--brand-text-on-primary', data.brand_text_on_primary)
          }
        }
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [token])

  const handleAceptar = async (e) => {
    e.preventDefault()
    if (!firmaForm.nombre.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/propuestas-public/${token}/aceptar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firmaForm),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('¡Gracias! Tu propuesta ha sido aceptada. El asesor se pondrá en contacto contigo en breve.')
        setShowAccept(false)
        setP(prev => ({ ...prev, estado: 'firmada', firmada_nombre: firmaForm.nombre, firmada_at: new Date().toISOString() }))
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
      const res = await fetch(`/api/propuestas-public/${token}/rechazar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: rechazoMotivo }),
      })
      if (res.ok) {
        setSuccess('Tu respuesta ha sido registrada. Gracias.')
        setShowReject(false)
        setP(prev => ({ ...prev, estado: 'rechazada' }))
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: BRAND }} />
          <p className="text-sm text-slate-500">Cargando propuesta…</p>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error && !p) {
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

  if (!p) return null

  const fechaEmision = new Date(p.created_at)
  const fechaVencimiento = new Date(fechaEmision.getTime() + (p.vigencia_dias || 30) * 86400000)
  const yaFirmada = p.estado === 'firmada'
  const yaVencida = p.estado === 'vencida'
  const yaRechazada = p.estado === 'rechazada'
  const puedeFirmar = !yaFirmada && !yaVencida && !yaRechazada
  const orgName = p.brand_display_name || p.org_name || 'Alce'
  const orgLogoUrl = p.brand_logo_url || null
  const conceptos = p.conceptos || []
  const requisitos = Array.isArray(p.requisitos) ? p.requisitos
    : (typeof p.requisitos === 'string' ? (() => { try { return JSON.parse(p.requisitos) } catch { return [] } })() : [])

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { size: letter; margin: 0.5in; }
        }
      `}</style>

      {/* Top bar */}
      <div className="no-print max-w-[850px] mx-auto mb-4">
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-slate-600">
              Propuesta oficial · Folio <strong style={{ color: BRAND }}>{p.folio}</strong>
            </span>
          </div>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
            <Printer className="w-3.5 h-3.5" /> Guardar PDF
          </button>
        </div>
      </div>

      {/* Banners */}
      {success && (
        <div className="no-print max-w-[850px] mx-auto mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-5 py-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{success}</p>
        </div>
      )}
      {yaFirmada && !success && (
        <div className="no-print max-w-[850px] mx-auto mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-5 py-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <p className="text-sm">Esta propuesta ya fue aceptada{p.firmada_nombre ? ` por ${p.firmada_nombre}` : ''}.</p>
        </div>
      )}
      {yaRechazada && !success && (
        <div className="no-print max-w-[850px] mx-auto mb-4 bg-red-50 border border-red-200 text-red-800 rounded-xl px-5 py-3 flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm">Esta propuesta fue rechazada. Contacta a tu asesor para solicitar una nueva.</p>
        </div>
      )}
      {yaVencida && (
        <div className="no-print max-w-[850px] mx-auto mb-4 bg-red-50 border border-red-200 text-red-800 rounded-xl px-5 py-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-600" />
          <p className="text-sm">Esta propuesta venció el {fmtFechaCorta(fechaVencimiento)}. Contacta a tu asesor para solicitar una nueva.</p>
        </div>
      )}

      {/* ─── Documento ─── */}
      <div className="print-area bg-white shadow-lg max-w-[850px] mx-auto" style={{ minHeight: '1100px' }}>
        {/* Membrete */}
        <div className="px-12 py-8 border-b-4" style={{ borderColor: BRAND }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: BRAND }}>
                {orgLogoUrl ? (
                  <img src={orgLogoUrl} alt={orgName} className="w-full h-full object-contain" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-7 h-7">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>{orgName}</h1>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Propuesta de servicio profesional</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Folio</p>
              <p className="text-lg font-mono font-bold" style={{ color: BRAND }}>{p.folio}</p>
              <p className="text-xs text-slate-500 mt-1">{fmtFecha(fechaEmision)}</p>
            </div>
          </div>
        </div>

        {/* Título del servicio */}
        {p.servicio_nombre && (
          <div className="px-12 py-6 text-center bg-slate-50">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Propuesta de servicio</p>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{p.servicio_nombre}</h2>
          </div>
        )}

        <div className="px-12 py-8 space-y-6">
          {/* Saludo */}
          <div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Estimado(a) <strong>{p.cliente_nombre}</strong>{p.cliente_ciudad ? ` de ${p.cliente_ciudad}` : ''}:
            </p>
            <p className="text-sm text-slate-700 leading-relaxed mt-3">
              Por este medio le presentamos nuestra propuesta
              {p.servicio_nombre ? <> para el servicio de <strong>{p.servicio_nombre}</strong></> : ' comercial'},
              esperando que la encuentre adecuada a sus necesidades.
            </p>
          </div>

          {/* Datos del cliente + Asesor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Datos del cliente</p>
              <Row label="Nombre" value={p.cliente_nombre} />
              <Row label="Ciudad" value={p.cliente_ciudad} />
              <Row label="Correo" value={p.cliente_correo} />
              <Row label="Teléfono" value={p.cliente_telefono} />
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Asesor asignado</p>
              <Row label="Nombre" value={p.vendedor_nombre} />
              <Row label="Puesto" value={p.vendedor_puesto} />
              <Row label="Correo" value={p.vendedor_correo} />
              <Row label="Teléfono" value={p.vendedor_telefono} />
            </div>
          </div>

          {/* Secciones del servicio (vienen del catálogo) */}
          {p.servicio_objeto && (
            <Section title="Objeto del servicio"><p className="text-sm text-slate-700 leading-relaxed">{p.servicio_objeto}</p></Section>
          )}
          {p.descripcion_servicio && (
            <Section title="Descripción del servicio"><p className="text-sm text-slate-700 leading-relaxed">{p.descripcion_servicio}</p></Section>
          )}
          {p.descripcion_proceso && (
            <Section title="Proceso"><p className="text-sm text-slate-700 leading-relaxed">{p.descripcion_proceso}</p></Section>
          )}
          {requisitos.length > 0 && (
            <Section title="Requisitos">
              <ul className="list-disc list-outside ml-4 space-y-1 text-sm text-slate-700">
                {requisitos.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </Section>
          )}
          {p.tiempos_estimados && (
            <Section title="Tiempos estimados"><p className="text-sm text-slate-700 leading-relaxed">{p.tiempos_estimados}</p></Section>
          )}

          {/* Conceptos y honorarios */}
          {conceptos.length > 0 && (
            <div className="border-2 rounded-lg overflow-hidden" style={{ borderColor: BRAND }}>
              <div className="px-5 py-2.5 text-white text-xs font-semibold uppercase tracking-widest" style={{ background: BRAND }}>
                Honorarios y costos
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Concepto</th>
                    <th className="text-center px-2 py-2 w-16 font-medium">Cant.</th>
                    <th className="text-right px-2 py-2 w-28 font-medium">Precio unitario</th>
                    <th className="text-right px-4 py-2 w-28 font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conceptos.map((c, i) => {
                    const subtotal = (parseFloat(c.precio) || 0) * (parseInt(c.cantidad) || 1)
                    return (
                      <tr key={i}>
                        <td className="px-4 py-3 text-slate-700">{c.concepto}</td>
                        <td className="text-center px-2 py-3 text-slate-500">{c.cantidad || 1}</td>
                        <td className="text-right px-2 py-3 text-slate-600">
                          {fmtMoney(c.precio, c.moneda)} <span className="text-[9px] text-slate-400">{c.moneda}</span>
                        </td>
                        <td className="text-right px-4 py-3 font-semibold text-slate-800">{fmtMoney(subtotal, c.moneda)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  {p.total_mxn > 0 && (
                    <tr className="border-t-2" style={{ borderColor: BRAND }}>
                      <td colSpan="3" className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: BRAND }}>Total MXN</td>
                      <td className="px-4 py-3 text-right font-bold text-lg" style={{ color: BRAND }}>{fmtMoney(p.total_mxn, 'MXN')}</td>
                    </tr>
                  )}
                  {p.total_usd > 0 && (
                    <tr style={{ borderTop: `1px solid ${BRAND}` }}>
                      <td colSpan="3" className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: BRAND }}>Total USD</td>
                      <td className="px-4 py-3 text-right font-bold text-lg" style={{ color: BRAND }}>{fmtMoney(p.total_usd, 'USD')}</td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          )}

          {/* Notas extra del servicio */}
          {p.notas_extra && (
            <Section title="Información adicional">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{p.notas_extra}</p>
            </Section>
          )}

          {/* Notas de la propuesta */}
          {p.notas && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2" style={{ color: BRAND }}>Observaciones</p>
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{p.notas}</p>
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
              <p className="text-sm font-semibold text-slate-700">{p.vigencia_dias} días</p>
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
              <li>Los honorarios cubren exclusivamente los conceptos descritos en esta propuesta.</li>
              <li>Cualquier servicio adicional no contemplado será cotizado por separado.</li>
              <li>Los tiempos de entrega están sujetos a la disponibilidad de información y documentación requerida.</li>
              <li>Esta propuesta tiene una vigencia de {p.vigencia_dias} días naturales a partir de su emisión.</li>
            </ul>
          </div>

          {/* Cierre */}
          <div className="pt-4">
            <p className="text-sm text-slate-700 leading-relaxed">Sin más por el momento, quedamos a sus órdenes.</p>
            <div className="mt-8">
              <p className="text-sm font-semibold text-slate-900">{p.vendedor_nombre || '—'}</p>
              {p.vendedor_puesto && <p className="text-xs text-slate-500">{p.vendedor_puesto}</p>}
              <p className="text-xs font-semibold mt-1" style={{ color: BRAND }}>{orgName}</p>
            </div>
          </div>
        </div>

        {/* Pie del documento */}
        <div className="px-12 py-4 border-t-2 mt-8 text-center" style={{ borderColor: BRAND }}>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">
            Documento generado el {fmtFecha(fechaEmision)} · Folio {p.folio}
          </p>
        </div>
      </div>

      {/* ─── Botones de acción ─── */}
      {puedeFirmar && (
        <div className="no-print max-w-[850px] mx-auto mt-6 bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-center mb-4">
            <FileSignature className="w-8 h-8 mx-auto mb-2" style={{ color: BRAND }} />
            <h3 className="text-base font-semibold text-slate-900">¿Estás de acuerdo con esta propuesta?</h3>
            <p className="text-xs text-slate-500 mt-1">Tu respuesta nos llegará al instante</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setShowReject(true)}
              className="px-4 py-3 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              No, gracias
            </button>
            <button onClick={() => setShowAccept(true)}
              className="px-4 py-3 text-sm font-semibold text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              style={{ background: BRAND }}>
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
            <p className="text-xs text-slate-500 mb-4">Para confirmar tu aceptación, ingresa tus datos.</p>
            <form onSubmit={handleAceptar} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tu nombre completo *</label>
                <input type="text" value={firmaForm.nombre}
                  onChange={e => setFirmaForm({ ...firmaForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  required autoFocus />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tu correo electrónico</label>
                <input type="email" value={firmaForm.email}
                  onChange={e => setFirmaForm({ ...firmaForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="opcional" />
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-[11px] text-slate-500 leading-relaxed">
                Al hacer clic en "Confirmar aceptación" estás aceptando los términos descritos en esta propuesta con folio <strong>{p.folio}</strong>.
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAccept(false)}
                  className="flex-1 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                  style={{ background: BRAND }}>
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
              <textarea value={rechazoMotivo} onChange={e => setRechazoMotivo(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Ej: Encontré una opción más económica, ya no necesito el servicio…" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowReject(false)}
                  className="flex-1 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50">
                  {submitting ? 'Enviando…' : 'Enviar respuesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="no-print max-w-[850px] mx-auto mt-6 text-center text-xs text-slate-400">
        <p>Powered by <span className="font-semibold text-slate-500">Alce</span> · Plataforma B2B</p>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: BRAND }}>{title}</p>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline gap-2 text-xs py-0.5">
      <span className="text-slate-400 w-16 flex-shrink-0">{label}:</span>
      <span className="text-slate-700 font-medium">{value || '—'}</span>
    </div>
  )
}
