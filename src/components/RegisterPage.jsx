import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2, XCircle, ArrowRight, ShieldCheck, Globe } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const COUNTRIES = [
  'Mexico', 'Colombia', 'Argentina', 'Chile', 'Peru', 'Ecuador', 'Venezuela',
  'Guatemala', 'Cuba', 'Bolivia', 'Republica Dominicana', 'Honduras', 'Paraguay',
  'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Uruguay', 'Espana',
  'Estados Unidos', 'Brasil', 'Otro',
]

const RegisterPage = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    orgName: '',
    phone: '',
    whatsapp: '',
    country: '',
    teamSizeId: '',
  })
  const [teamSizes, setTeamSizes] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  // Fetch team sizes catalog from backend
  useEffect(() => {
    fetch('/api/auth/team-sizes')
      .then(r => r.json())
      .then(data => setTeamSizes(data.teamSizes || []))
      .catch(() => {})
  }, [])

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword
  const passwordsMismatch = form.password && form.confirmPassword && form.password !== form.confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) return
    if (!acceptTerms) return
    setError('')
    setLoading(true)
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        orgName: form.orgName,
        phone: form.phone,
        whatsapp: form.whatsapp,
        country: form.country,
        teamSizeId: form.teamSizeId ? parseInt(form.teamSizeId) : null,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <Link to="/login" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#1a3a3a] rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span className="text-[#1a3a3a] font-semibold">Alce AI</span>
        </Link>
        <div className="hidden sm:flex items-center gap-6 text-sm">
          <a href="#" className="text-slate-500 hover:text-slate-700 transition-colors">Explorar</a>
          <a href="#" className="text-slate-500 hover:text-slate-700 transition-colors">Documentacion</a>
          <Link to="/register" className="font-semibold text-[#1a3a3a]">Comenzar</Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form — Left 2/3 */}
          <div className="lg:col-span-2">
            <h1 className="text-2xl font-bold text-slate-900">Cree su espacio de trabajo</h1>
            <p className="text-slate-500 text-sm mt-1.5">
              Configure la cuenta principal de su organizacion y el entorno inicial de trabajo.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm">
                Cuenta creada exitosamente! Redirigiendo...
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {/* Row 1: Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre completo</label>
                  <input
                    type="text" required
                    value={form.name}
                    onChange={update('name')}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 transition-all"
                    placeholder="Ej. Juan Perez"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Correo empresarial</label>
                  <input
                    type="email" required
                    value={form.email}
                    onChange={update('email')}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 transition-all"
                    placeholder="nombre@empresa.com"
                  />
                </div>
              </div>

              {/* Row 2: Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrasena</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required minLength={6}
                      value={form.password}
                      onChange={update('password')}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 transition-all pr-11"
                      placeholder="Min. 6 caracteres"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirmar contrasena</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required minLength={6}
                      value={form.confirmPassword}
                      onChange={update('confirmPassword')}
                      className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all pr-11 ${
                        passwordsMismatch
                          ? 'border-red-300 focus:ring-red-500/20'
                          : passwordsMatch
                            ? 'border-green-300 focus:ring-green-500/20'
                            : 'border-slate-200 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40'
                      }`}
                      placeholder="Repite la contrasena"
                    />
                    {(passwordsMatch || passwordsMismatch) && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {passwordsMatch ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: Org + WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre de la empresa</label>
                  <input
                    type="text" required
                    value={form.orgName}
                    onChange={update('orgName')}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 transition-all"
                    placeholder="Nombre legal o comercial"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Numero principal de WhatsApp</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 py-2.5 bg-slate-50 border border-r-0 border-slate-200 rounded-l-lg text-sm text-slate-500">+</span>
                    <input
                      type="tel"
                      value={form.whatsapp}
                      onChange={update('whatsapp')}
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-r-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 transition-all"
                      placeholder="55 1234 5678"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Country + Team Size (from catalog) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Pais o region</label>
                  <select
                    value={form.country}
                    onChange={update('country')}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Seleccione un pais</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Tamano del equipo</label>
                  <select
                    value={form.teamSizeId}
                    onChange={update('teamSizeId')}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Cantidad de personas</option>
                    {teamSizes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#1a3a3a] focus:ring-[#1a3a3a]/50"
                />
                <span className="text-sm text-slate-600 leading-relaxed">
                  Acepto los{' '}
                  <a href="#" className="font-medium text-slate-900 underline">Terminos y Condiciones</a>
                  {' '}y el{' '}
                  <a href="#" className="font-medium text-slate-900 underline">Aviso de Privacidad</a>
                  {' '}de Alce AI.
                </span>
              </label>

              {/* Submit */}
              <div className="flex items-center gap-4 pt-1">
                <button
                  type="submit"
                  disabled={loading || passwordsMismatch || !acceptTerms}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#1a3a3a] hover:bg-[#224a4a] text-white font-semibold rounded-lg transition-all text-sm disabled:opacity-50 disabled:hover:bg-[#1a3a3a]"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <span>Crear workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <span className="text-sm text-slate-500">
                  Ya tiene una cuenta?{' '}
                  <Link to="/login" className="font-semibold text-slate-900 underline">Inicie sesion aqui</Link>
                </span>
              </div>
            </form>
          </div>

          {/* Right Panel — Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-xl p-6 sticky top-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-[#e8f0f0] rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#1a3a3a]" />
                </div>
                <h3 className="font-semibold text-slate-900">Acceso Administrador</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Esta cuenta sera la administradora principal del workspace. Despues podra invitar a su equipo y configurar modulos desde la plataforma. El proceso toma pocos minutos.
              </p>
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#1a3a3a]" />
                  <span className="text-sm text-slate-600 font-medium">Seguridad de grado Enterprise</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-[#1a3a3a]" />
                  <span className="text-sm text-slate-600 font-medium">Infraestructura distribuida</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar — flush to bottom */}
      <div className="border-t border-slate-200 bg-white px-6 py-3 flex items-center justify-between text-xs text-slate-400 flex-shrink-0 mt-auto">
        <span>2025 Alce AI. Todos los derechos reservados.</span>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-slate-600 transition-colors">Privacidad</a>
          <a href="#" className="hover:text-slate-600 transition-colors">Terminos de Servicio</a>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
