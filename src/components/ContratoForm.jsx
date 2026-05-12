import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Save, FileText, User, Mail, Phone, MapPin, DollarSign, Briefcase, Sparkles, Mic, Loader2, X } from 'lucide-react'
import { getTramites, createPropuesta, updatePropuesta, extraerDeLlamada } from '../utils/contratosApi'

const CATEGORIAS_LABEL = {
  visa: 'Visa',
  renovacion: 'Renovación',
  canje: 'Canje',
  cambio_condicion: 'Cambio de condición',
  permiso_trabajo: 'Permiso de trabajo',
  solvencia: 'Solvencia económica',
}

export default function ContratoForm({ propuesta, onSaved, onCancel }) {
  const { token, user } = useAuth()
  const isEdit = !!propuesta?.id

  const [tramites, setTramites] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showAI, setShowAI] = useState(false)
  const [transcripcion, setTranscripcion] = useState('')
  const [analizando, setAnalizando] = useState(false)
  const [aiResult, setAiResult] = useState(null)

  const [form, setForm] = useState({
    tramite_id: propuesta?.tramite_id || '',
    cliente_nombre: propuesta?.cliente_nombre || '',
    cliente_correo: propuesta?.cliente_correo || '',
    cliente_ciudad: propuesta?.cliente_ciudad || '',
    cliente_telefono: propuesta?.cliente_telefono || '',
    vendedor_nombre: propuesta?.vendedor_nombre || user?.name || '',
    vendedor_puesto: propuesta?.vendedor_puesto || '',
    vendedor_telefono: propuesta?.vendedor_telefono || '',
    vendedor_correo: propuesta?.vendedor_correo || user?.email || '',
    precio: propuesta?.precio || '',
    moneda: propuesta?.moneda || 'MXN',
    notas: propuesta?.notas || '',
    vigencia_dias: propuesta?.vigencia_dias || 30,
    estado: propuesta?.estado || 'borrador',
  })

  useEffect(() => {
    setLoading(true)
    getTramites(token).then(setTramites).catch(console.error).finally(() => setLoading(false))
  }, [token])

  // Agrupar trámites por categoría
  const grouped = tramites.reduce((acc, t) => {
    const cat = t.categoria || 'otros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleAnalizar = async () => {
    if (!transcripcion.trim() || transcripcion.trim().length < 20) {
      setError('Necesito al menos 20 caracteres de transcripción')
      return
    }
    setAnalizando(true)
    setError('')
    try {
      const result = await extraerDeLlamada(token, transcripcion)
      setAiResult(result)
      // Aplicar al formulario los campos extraídos (sin sobreescribir si ya hay valor)
      setForm(prev => ({
        ...prev,
        cliente_nombre: result.cliente_nombre || prev.cliente_nombre,
        cliente_correo: result.cliente_correo || prev.cliente_correo,
        cliente_ciudad: result.cliente_ciudad || prev.cliente_ciudad,
        cliente_telefono: result.cliente_telefono || prev.cliente_telefono,
        tramite_id: result.tramite_id ? String(result.tramite_id) : prev.tramite_id,
        notas: result.notas
          ? (prev.notas ? `${prev.notas}\n\n${result.notas}` : result.notas)
          : prev.notas,
      }))
    } catch (err) {
      setError(err.message || 'Error al analizar la llamada')
    } finally {
      setAnalizando(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.cliente_nombre.trim()) { setError('El nombre del cliente es obligatorio'); return }
    if (!form.tramite_id) { setError('Selecciona un trámite'); return }

    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        tramite_id: parseInt(form.tramite_id),
        precio: form.precio ? parseFloat(form.precio) : null,
        vigencia_dias: parseInt(form.vigencia_dias) || 30,
      }
      const saved = isEdit
        ? await updatePropuesta(token, propuesta.id, payload)
        : await createPropuesta(token, payload)
      // Asegurar que tenga el tramite_nombre para preview
      const tramite = tramites.find(t => t.id === parseInt(form.tramite_id))
      onSaved({
        ...saved,
        tramite_nombre: tramite?.nombre,
        tramite_categoria: tramite?.categoria,
        tramite_idioma: tramite?.idioma,
      })
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? 'Editar propuesta' : 'Nueva propuesta'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEdit ? `Folio ${propuesta.folio}` : 'Llena los datos del cliente y selecciona el trámite'}
          </p>
        </div>
        {!isEdit && (
          <button
            type="button"
            onClick={() => setShowAI(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Auto-llenar con IA
          </button>
        )}
      </div>

      {/* Banner de resultado IA */}
      {aiResult && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-purple-900 mb-1">
              ✨ IA llenó {Object.values(aiResult).filter(v => v !== null && v !== '').length - 2} campos
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                aiResult.confianza === 'alta' ? 'bg-emerald-100 text-emerald-700' :
                aiResult.confianza === 'media' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                Confianza {aiResult.confianza}
              </span>
            </p>
            {aiResult.tramite_razonamiento && (
              <p className="text-slate-600 mt-1"><strong>Trámite:</strong> {aiResult.tramite_razonamiento}</p>
            )}
            <p className="text-slate-500 mt-1">Revisa los campos antes de guardar.</p>
          </div>
          <button onClick={() => setAiResult(null)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Modal IA */}
      {showAI && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Auto-llenar con IA</h3>
                  <p className="text-xs text-slate-500">Pega la transcripción de tu llamada con el cliente</p>
                </div>
              </div>
              <button onClick={() => setShowAI(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <textarea
              value={transcripcion}
              onChange={e => setTranscripcion(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40 flex-1 min-h-[200px]"
              placeholder="Ejemplo: 'Hola, soy Juan Pérez de Guadalajara, mi correo es juan@gmail.com. Estoy buscando renovar mi residencia permanente porque ya pasaron los 4 años. Hablo español y vivo aquí. Mi teléfono es 33-1234-5678...'"
            />
            <p className="text-[11px] text-slate-400 mt-2">
              💡 La IA detectará: nombre, correo, teléfono, ciudad, trámite recomendado y notas relevantes.
            </p>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowAI(false)}
                className="flex-1 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => { await handleAnalizar(); if (!error) setShowAI(false) }}
                disabled={analizando || transcripcion.trim().length < 20}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {analizando ? <><Loader2 className="w-4 h-4 animate-spin" /> Analizando…</> : <><Sparkles className="w-4 h-4" /> Analizar con IA</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ─── Trámite ─── */}
        <Card icon={FileText} title="Trámite a cotizar">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Selecciona el trámite *">
              <select
                value={form.tramite_id}
                onChange={e => update('tramite_id', e.target.value)}
                className={inputCls}
                disabled={loading}
                required
              >
                <option value="">— Selecciona un trámite —</option>
                {Object.entries(grouped).map(([cat, items]) => (
                  <optgroup key={cat} label={CATEGORIAS_LABEL[cat] || cat}>
                    {items.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        {/* ─── Cliente ─── */}
        <Card icon={User} title="Datos del cliente">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nombre completo *" full>
              <input
                type="text"
                value={form.cliente_nombre}
                onChange={e => update('cliente_nombre', e.target.value)}
                className={inputCls}
                required
              />
            </Field>
            <Field label="Correo electrónico" icon={Mail}>
              <input
                type="email"
                value={form.cliente_correo}
                onChange={e => update('cliente_correo', e.target.value)}
                className={inputCls}
                placeholder="cliente@ejemplo.com"
              />
            </Field>
            <Field label="Ciudad" icon={MapPin}>
              <input
                type="text"
                value={form.cliente_ciudad}
                onChange={e => update('cliente_ciudad', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Teléfono" icon={Phone}>
              <input
                type="tel"
                value={form.cliente_telefono}
                onChange={e => update('cliente_telefono', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </Card>

        {/* ─── Vendedor ─── */}
        <Card icon={Briefcase} title="Datos del vendedor">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nombre">
              <input
                type="text"
                value={form.vendedor_nombre}
                onChange={e => update('vendedor_nombre', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Puesto">
              <input
                type="text"
                value={form.vendedor_puesto}
                onChange={e => update('vendedor_puesto', e.target.value)}
                className={inputCls}
                placeholder="Asesor de Trámites"
              />
            </Field>
            <Field label="Correo" icon={Mail}>
              <input
                type="email"
                value={form.vendedor_correo}
                onChange={e => update('vendedor_correo', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Teléfono" icon={Phone}>
              <input
                type="tel"
                value={form.vendedor_telefono}
                onChange={e => update('vendedor_telefono', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </Card>

        {/* ─── Económico ─── */}
        <Card icon={DollarSign} title="Información económica">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Precio">
              <input
                type="number"
                step="0.01"
                value={form.precio}
                onChange={e => update('precio', e.target.value)}
                className={inputCls}
                placeholder="0.00"
              />
            </Field>
            <Field label="Moneda">
              <select
                value={form.moneda}
                onChange={e => update('moneda', e.target.value)}
                className={inputCls}
              >
                <option value="MXN">MXN — Peso mexicano</option>
                <option value="USD">USD — Dólar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </Field>
            <Field label="Vigencia (días)">
              <input
                type="number"
                value={form.vigencia_dias}
                onChange={e => update('vigencia_dias', e.target.value)}
                className={inputCls}
                min="1"
              />
            </Field>
          </div>
        </Card>

        {/* ─── Notas ─── */}
        <Card icon={FileText} title="Notas adicionales (opcional)">
          <textarea
            value={form.notas}
            onChange={e => update('notas', e.target.value)}
            rows={4}
            className={`${inputCls} resize-none`}
            placeholder="Detalles, observaciones, requisitos especiales del cliente..."
          />
        </Card>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1a3a3a] text-white text-sm font-medium rounded-lg hover:bg-[#0f2828] transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando…' : 'Guardar y previsualizar'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Helpers ───
const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/10 focus:border-[#1a3a3a]/30 transition-all"

function Card({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-[#1a3a3a]" />
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 text-slate-400" />}
        {label}
      </label>
      {children}
    </div>
  )
}
