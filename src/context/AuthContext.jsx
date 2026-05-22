import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

const DEFAULT_BRANDING = {
  displayName: null,
  primaryColor: '#1a3a3a',
  secondaryColor: '#2d5555',
  accentColor: '#3b82f6',
  textOnPrimary: '#ffffff',
  sidebarBg: '#ffffff',
  navbarBg: '#ffffff',
  contentBg: '#f8fafc',
  logoUrl: null,
}

// Aplica el branding como CSS variables en :root para uso global
export function applyBrandingToDOM(branding) {
  if (typeof document === 'undefined') return
  const b = { ...DEFAULT_BRANDING, ...(branding || {}) }
  const root = document.documentElement
  root.style.setProperty('--brand-primary', b.primaryColor)
  root.style.setProperty('--brand-secondary', b.secondaryColor)
  root.style.setProperty('--brand-accent', b.accentColor)
  root.style.setProperty('--brand-text-on-primary', b.textOnPrimary)
  root.style.setProperty('--brand-sidebar-bg', b.sidebarBg)
  root.style.setProperty('--brand-navbar-bg', b.navbarBg)
  root.style.setProperty('--brand-content-bg', b.contentBg)
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('alce_token'))
  const [loading, setLoading] = useState(true)

  // Verify token on mount
  useEffect(() => {
    if (token) {
      fetchMe(token)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchMe = async (jwt) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${jwt}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        applyBrandingToDOM(data.user?.branding)
      } else {
        // Invalid / expired token (o suspensión por org)
        try {
          const data = await res.json()
          if (data?.suspended) {
            localStorage.setItem('alce_login_notice', data.error || 'Tu acceso ha sido suspendido.')
          }
        } catch { /* noop */ }
        localStorage.removeItem('alce_token')
        setToken(null)
        setUser(null)
      }
    } catch {
      console.error('Error verifying token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión')

    localStorage.setItem('alce_token', data.token)
    setToken(data.token)
    setUser(data.user)
    applyBrandingToDOM(data.user?.branding)
    return data
  }

  const register = async ({ name, email, password, orgName, phone, whatsapp, country, teamSizeId }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, orgName, phone, whatsapp, country, teamSizeId })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al registrar')
    return data
  }

  const logout = () => {
    localStorage.removeItem('alce_token')
    setToken(null)
    setUser(null)
  }

  // Refresh user data from server
  const refreshUser = async () => {
    if (token) await fetchMe(token)
  }

  // Update user in state directly (for optimistic updates)
  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev)
  }

  // Update branding y aplica al DOM en vivo (sin esperar refresh del /me).
  // Importante: cuando llega un parcial (ej. solo logoUrl), aplicamos la
  // versión MERGEADA al DOM — si no, applyBrandingToDOM resetea los demás
  // colores a default (bug: subir logo borraba los colores custom en vivo).
  const updateBranding = (partial) => {
    setUser(prev => {
      const merged = { ...(prev?.branding || {}), ...partial }
      applyBrandingToDOM(merged)
      return prev ? { ...prev, branding: merged } : prev
    })
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, updateUser, updateBranding }}>
      {children}
    </AuthContext.Provider>
  )
}
