/**
 * Hook para manejar el tema de la app: claro / oscuro / auto.
 *
 * - "light": fondo claro (default)
 * - "dark": fondo oscuro
 * - "auto": sigue la preferencia del sistema (prefers-color-scheme)
 *
 * Persiste en localStorage como "alce_theme".
 * Aplica/quita la clase `dark` en <html> según corresponda.
 */
import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'alce_theme'

function resolveEffective(theme) {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  // auto
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyToDOM(effective) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (effective === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  // También expone via data-attr por si algún componente quiere leerlo
  root.setAttribute('data-theme', effective)
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return localStorage.getItem(STORAGE_KEY) || 'light'
  })
  const [effective, setEffective] = useState(() => resolveEffective(theme))

  // Sync DOM cuando theme cambie
  useEffect(() => {
    const eff = resolveEffective(theme)
    setEffective(eff)
    applyToDOM(eff)
  }, [theme])

  // Si está en auto, escucha cambios del sistema
  useEffect(() => {
    if (theme !== 'auto' || typeof window === 'undefined') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const eff = resolveEffective('auto')
      setEffective(eff)
      applyToDOM(eff)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((next) => {
    if (!['light', 'dark', 'auto'].includes(next)) return
    localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
  }, [])

  const toggle = useCallback(() => {
    setTheme(effective === 'dark' ? 'light' : 'dark')
  }, [effective, setTheme])

  return { theme, effective, setTheme, toggle, isDark: effective === 'dark' }
}

/**
 * Aplica el tema al DOM lo más temprano posible, antes del primer render.
 * Llamar UNA VEZ desde main.jsx para evitar flash of light en página oscura.
 */
export function initThemeEarly() {
  if (typeof window === 'undefined') return
  const stored = localStorage.getItem(STORAGE_KEY) || 'light'
  applyToDOM(resolveEffective(stored))
}
