/**
 * Toggle visual del tema (claro / oscuro / auto).
 * Variant "icon" = solo botón compacto sun/moon para el navbar.
 * Variant "full" = grupo de 3 botones para Ajustes.
 */
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

export default function ThemeToggle({ variant = 'icon' }) {
  const { theme, effective, setTheme, toggle } = useTheme()

  if (variant === 'full') {
    return (
      <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
        <ThemeChip active={theme === 'light'} onClick={() => setTheme('light')} icon={Sun} label="Claro" />
        <ThemeChip active={theme === 'dark'} onClick={() => setTheme('dark')} icon={Moon} label="Oscuro" />
        <ThemeChip active={theme === 'auto'} onClick={() => setTheme('auto')} icon={Monitor} label="Auto" />
      </div>
    )
  }

  // Variant "icon" — un solo botón sun/moon
  const Icon = effective === 'dark' ? Sun : Moon
  return (
    <button
      type="button"
      onClick={toggle}
      title={effective === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="p-1.5 text-slate-400 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

function ThemeChip({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
        active
          ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  )
}
