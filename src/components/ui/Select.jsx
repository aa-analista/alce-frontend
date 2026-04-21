import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'

/**
 * Select — custom dropdown replacement for native <select>.
 *
 * Usage:
 *   <Select
 *     value={form.projectId}
 *     onChange={(v) => setForm({ ...form, projectId: v })}
 *     options={[{ value: '1', label: 'Proyecto A' }, ...]}
 *     placeholder="Seleccionar proyecto"
 *     searchable
 *   />
 */
const Select = ({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  disabled = false,
  searchable = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (open && searchable && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 30)
    }
    if (!open) setQuery('')
  }, [open, searchable])

  const selected = useMemo(
    () => options.find(o => String(o.value) === String(value)),
    [options, value]
  )

  const filtered = useMemo(() => {
    if (!query) return options
    const q = query.toLowerCase()
    return options.filter(o => String(o.label).toLowerCase().includes(q))
  }, [options, query])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-left transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 ${open ? 'ring-2 ring-[#1a3a3a]/20 border-[#1a3a3a]/40' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      >
        <span className={`truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-40 top-full mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40"
                />
              </div>
            </div>
          )}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-400 text-center">Sin resultados</p>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value)
                return (
                  <button
                    key={`${opt.value}-${idx}`}
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${isSelected ? 'bg-[#e8f0f0] text-[#1a3a3a] font-medium' : 'text-slate-700'}`}
                  >
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Select
