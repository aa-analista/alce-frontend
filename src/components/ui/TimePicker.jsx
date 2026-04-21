import { useState, useRef, useEffect } from 'react'
import { Clock, X } from 'lucide-react'

const TimePicker = ({
  value,
  onChange,
  placeholder = 'hh : mm',
  disabled = false,
  minuteStep = 15,
  className = '',
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const [h = '', m = ''] = (value || '').split(':').map(s => (s || '').slice(0, 2))

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const mins = []
  for (let i = 0; i < 60; i += minuteStep) mins.push(String(i).padStart(2, '0'))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-left transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 ${open ? 'ring-2 ring-[#1a3a3a]/20 border-[#1a3a3a]/40' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      >
        <span className={value ? 'text-slate-900 font-mono tabular-nums' : 'text-slate-400'}>
          {value ? `${h}:${m}` : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange('') }}
              className="p-0.5 rounded hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </span>
          )}
          <Clock className="w-4 h-4 text-slate-400" />
        </div>
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-1.5 left-0 bg-white border border-slate-200 rounded-xl shadow-xl flex overflow-hidden">
          <div className="flex flex-col w-16 max-h-60 overflow-y-auto py-1 border-r border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase text-center py-1 sticky top-0 bg-white">Hora</p>
            {hours.map(hh => (
              <button
                key={hh} type="button"
                onClick={() => onChange(`${hh}:${m || '00'}`)}
                className={`py-1.5 text-center text-sm font-mono hover:bg-slate-50 transition-colors ${h === hh ? 'bg-[#e8f0f0] text-[#1a3a3a] font-semibold' : 'text-slate-700'}`}
              >
                {hh}
              </button>
            ))}
          </div>
          <div className="flex flex-col w-16 max-h-60 overflow-y-auto py-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase text-center py-1 sticky top-0 bg-white">Min</p>
            {mins.map(mm => (
              <button
                key={mm} type="button"
                onClick={() => { onChange(`${h || '09'}:${mm}`); setOpen(false) }}
                className={`py-1.5 text-center text-sm font-mono hover:bg-slate-50 transition-colors ${m === mm ? 'bg-[#e8f0f0] text-[#1a3a3a] font-semibold' : 'text-slate-700'}`}
              >
                {mm}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TimePicker
