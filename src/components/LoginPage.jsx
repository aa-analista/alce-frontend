import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Hero */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#1a3a3a] relative overflow-hidden flex-col justify-between p-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span className="text-white font-semibold text-lg">Alce AI</span>
        </div>

        {/* Main text */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
            Optimice la gestion operativa de su organizacion.
          </h1>
          <p className="text-white/60 mt-4 text-sm leading-relaxed">
            La plataforma agentica para lideres que buscan coordinar equipos, tareas y modulos inteligentes en un solo entorno profesional.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              'Coordinacion de tareas y seguimiento centralizado',
              'Operacion del equipo en una sola plataforma',
              'Modulos inteligentes configurables segun su flujo',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2.5 text-white/70 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex items-center gap-3">
            <div className="w-8 h-px bg-white/20" />
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em]">Premium Enterprise Edition</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-white/30 relative z-10">2025 Alce AI. Todos los derechos reservados.</p>

        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a3a] via-[#1d4040] to-[#163333]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#224a4a] rounded-full blur-[120px] opacity-50" />
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-[#1a3a3a] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <span className="text-[#1a3a3a] font-semibold text-lg">Alce AI</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Bienvenido a Alce AI</h2>
          <p className="text-slate-500 text-sm mt-1.5">Inicie sesion para acceder a su espacio de trabajo.</p>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Correo electronico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 transition-all"
                placeholder="ejemplo@empresa.com"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Contrasena</label>
                <a href="#" className="text-xs font-medium text-[#1a3a3a] hover:text-[#2a5a5a] transition-colors">
                  Olvidaste tu contrasena?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 transition-all pr-11"
                  placeholder="Tu contrasena"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#1a3a3a] hover:bg-[#224a4a] text-white font-semibold rounded-lg transition-all text-sm disabled:opacity-60"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Iniciando sesion...</span>
                </div>
              ) : (
                'Iniciar sesion'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">o</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Google button (decorative) */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          {/* Register link */}
          <p className="text-center mt-6 text-sm text-slate-500">
            No tienes una cuenta?{' '}
            <Link to="/register" className="font-semibold text-slate-900 hover:text-[#1a3a3a] transition-colors">
              Crear cuenta
            </Link>
          </p>

          {/* Terms */}
          <p className="text-center mt-4 text-[11px] text-slate-400 leading-relaxed">
            Al iniciar sesion, aceptas nuestros{' '}
            <a href="#" className="underline hover:text-slate-600">Terminos y Condiciones</a>
            {' '}y{' '}
            <a href="#" className="underline hover:text-slate-600">Aviso de Privacidad</a>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
