import { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const formatDisplay = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''))
  if (isNaN(d)) return ''
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

const toIsoDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const DatePicker = ({
  value,
  onChange,
  placeholder = 'dd / mm / aaaa',
  disabled = false,
  minDate,
  maxDate,
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

  const dateVal = value ? new Date(value + (value.length === 10 ? 'T00:00:00' : '')) : null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-left transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1a3a3a]/20 focus:border-[#1a3a3a]/40 ${open ? 'ring-2 ring-[#1a3a3a]/20 border-[#1a3a3a]/40' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>
          {value ? formatDisplay(value) : placeholder}
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
          <CalendarIcon className="w-4 h-4 text-slate-400" />
        </div>
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-1.5 left-0 bg-white border border-slate-200 rounded-xl shadow-xl p-3 alce-calendar-wrapper">
          <Calendar
            value={dateVal}
            onChange={(d) => { onChange(toIsoDate(d)); setOpen(false) }}
            minDate={minDate}
            maxDate={maxDate}
            locale="es-MX"
            next2Label={null}
            prev2Label={null}
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="text-xs text-slate-500 hover:text-slate-700 font-medium">Borrar</button>
            <button type="button" onClick={() => { onChange(toIsoDate(new Date())); setOpen(false) }} className="text-xs text-[#1a3a3a] hover:text-[#224a4a] font-semibold">Hoy</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker
