import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ActivatePage = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('t') || ''

  const [verifying, setVerifying] = useState(true)
  const [tokenError, setTokenError] = useState('')
  const [accountInfo, setAccountInfo] = useState(null) // { name, email }

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const { logout } = useAuth()

  // Verificar token al montar
  useEffect(() => {
    let cancelled = false
    const verify = async () => {
      if (!token) {
        setTokenError('El enlace no es válido.')
        setVerifying(false)
        return
      }
      try {
        const res = await fetch(`/api/auth/activate/${encodeURIComponent(token)}`)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setTokenError(data.error || 'Enlace inválido o expirado')
        } else {
          setAccountInfo(data)
        }
      } catch {
        if (!cancelled) setTokenError('No se pudo verificar el enlace.')
      } finally {
        if (!cancelled) setVerifying(false)
      }
    }
    verify()
    return () => { cancelled = true }
  }, [token])

  const passwordsMatch = password && confirm && password === confirm
  const passwordsMismatch = password && confirm && password !== confirm
  const canSubmit = password.length >= 6 && passwordsMatch && !submitting

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al activar la cuenta')

      // Por seguridad: cerramos sesión actual (si existe) antes de instalar la nueva
      logout()
      localStorage.setItem('alce_token', data.token)
      // Forzar recarga para que AuthProvider tome el nuevo token desde cero
      window.location.replace('/')
    } catch (err) {
      setSubmitError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <Link to="/login" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#1a3a3a] rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span className="text-[#1a3a3a] font-semibold">Alce AI</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-[#1a3a3a]" />
            <h1 className="text-2xl font-bold text-slate-900">Activa tu cuenta</h1>
          </div>
          <p className="text-sm text-slate-500">Define tu contraseña para empezar a usar Alce AI.</p>

          {verifying ? (
            <div className="mt-8 bg-white rounded-xl border border-slate-200 p-8 text-center">
              <div className="w-6 h-6 border-2 border-[#1a3a3a]/20 border-t-[#1a3a3a] rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Verificando enlace...</p>
            </div>
          ) : tokenError ? (
            <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">{tokenError}</p>
                  <p className="text-xs text-red-600 mt-1">
                    Pide a tu administrador que te envíe un nuevo enlace de activación.
                  </p>
                </div>
              </div>
              <Link
                to="/login"
                className="mt-4 inline-block text-sm font-medium text-[#1a3a3a] hover:underline"
              >
                Volver al inicio de sesión →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              {accountInfo && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Cuenta</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{accountInfo.name}</p>
                  <p className="text-xs text-slate-500 truncate">{accountInfo.email}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 transition-all pr-11"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirmar contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all pr-11 ${
                      passwordsMismatch
                        ? 'border-red-300 focus:ring-red-500/20'
                        : passwordsMatch
                          ? 'border-green-300 focus:ring-green-500/20'
                          : 'border-slate-200 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40'
                    }`}
                    placeholder="Repite la contraseña"
                  />
                  {(passwordsMatch || passwordsMismatch) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {passwordsMatch ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                  )}
                </div>
                {passwordsMismatch && (
                  <p className="text-xs text-red-500">Las contraseñas no coinciden.</p>
                )}
              </div>

              {submitError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-2.5 bg-[#1a3a3a] hover:bg-[#224a4a] text-white font-semibold rounded-lg transition-all text-sm disabled:opacity-50 disabled:hover:bg-[#1a3a3a]"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Activando...</span>
                  </div>
                ) : (
                  'Activar cuenta e iniciar sesión'
                )}
              </button>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Por tu seguridad, este enlace es de un solo uso y expira en 24 horas.
                No compartas tu contraseña con nadie.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActivatePage
