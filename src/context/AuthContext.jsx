import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
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
      } else {
        // Invalid / expired token
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

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}
