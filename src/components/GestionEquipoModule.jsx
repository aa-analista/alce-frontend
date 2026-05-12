import { useState } from 'react'
import { CalendarCheck, Users, ClipboardList, Calendar } from 'lucide-react'
import AlceHoyView from './AlceHoyView.jsx'
import AlcePersonalView from './AlcePersonalView.jsx'
import AlcePlantillasView from './AlcePlantillasView.jsx'
import AlceCalendarioView from './AlceCalendarioView.jsx'

const TABS = [
  { id: 'recordatorios', label: 'Recordatorios', Icon: CalendarCheck },
  { id: 'calendario',    label: 'Calendario',    Icon: Calendar },
  { id: 'equipo',        label: 'Equipo',         Icon: Users },
  { id: 'plantillas',   label: 'Plantillas',     Icon: ClipboardList },
]

export default function GestionEquipoModule() {
  const [tab, setTab] = useState('recordatorios')

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {tab === 'recordatorios' && <AlceHoyView onTabChange={setTab} />}
        {tab === 'calendario'    && <AlceCalendarioView />}
        {tab === 'equipo'        && <AlcePersonalView />}
        {tab === 'plantillas'    && <AlcePlantillasView />}
      </div>
    </div>
  )
}
