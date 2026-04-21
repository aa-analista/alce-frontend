import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  CheckCircle2, ChevronRight, Sparkles, BookOpen, Headphones,
  Users, Blocks, ClipboardCheck, FileText, Database, Play
} from 'lucide-react'
import { startAppTour } from '../hooks/useTour'

const CHECKLIST = [
  { id: 'invite', label: 'Invitar equipo', path: '/usuarios' },
  { id: 'roles', label: 'Configurar roles y permisos', path: '/usuarios' },
  { id: 'catalog', label: 'Revisar catalogo de modulos', path: '/marketplace' },
  { id: 'module', label: 'Activar primer modulo operativo', path: '/marketplace' },
  { id: 'task', label: 'Crear primera tarea estrategica', path: '/coach-ai' },
]

const SUGGESTED_MODULES = [
  { id: 'accountability', name: 'Accountability Partner', desc: 'Gestion de cumplimiento', icon: ClipboardCheck },
  { id: 'conocimiento', name: 'Base de conocimiento', desc: 'Wiki inteligente IA', icon: Database },
  { id: 'documentos', name: 'Generacion de documentos', desc: 'Contratos y propuestas', icon: FileText },
]

const HomeDashboard = () => {
  const { user, token } = useAuth()
  const { flows } = useOutletContext()
  const navigate = useNavigate()
  const [members, setMembers] = useState(1)
  const [completedSteps, setCompletedSteps] = useState([])

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const activeModules = (flows || []).filter(f => f.active).length

  // Fetch team member count
  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setMembers(data.users?.length || 1))
      .catch(() => {})
  }, [token, isAdmin])

  const toggleStep = (id) => {
    setCompletedSteps(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const getModuleStatus = (modId) => {
    const isActive = (flows || []).some(f => f.id === modId && f.active)
    return isActive ? 'Listo' : 'Disponible'
  }

  const kpis = [
    { label: 'Tareas Abiertas', value: '0' },
    { label: 'Bloqueos', value: '0' },
    { label: 'Miembros', value: String(members) },
    { label: 'Modulos', value: String(activeModules) },
    { label: 'Actividad', value: '--' },
  ]

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bienvenido a su espacio de trabajo</h1>
        <p className="text-sm text-slate-500 mt-1">
          Su entorno de Alce AI esta listo. Siga los pasos de configuracion inicial para comenzar a optimizar su operacion empresarial con inteligencia artificial.
        </p>
      </div>

      {/* Status Banner */}
      <div id="tour-status" className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 border-l-4 border-l-[#1a3a3a]">
        <CheckCircle2 className="w-5 h-5 text-[#1a3a3a] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-900">Workspace configurado correctamente</p>
          <p className="text-sm text-slate-500">El sistema ha verificado su licencia. Actualmente no hay operaciones activas ni modulos en ejecucion. Comience con el checklist a continuacion.</p>
        </div>
      </div>

      {/* KPIs */}
      <div id="tour-kpis" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Main Grid: Checklist + Coach AI */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Checklist — 3 cols */}
        <div id="tour-checklist" className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-900 text-sm">Primeros pasos</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {CHECKLIST.map((step) => {
              const done = completedSteps.includes(step.id)
              return (
                <div
                  key={step.id}
                  className="flex items-center justify-between py-3 group cursor-pointer"
                  onClick={() => navigate(step.path)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStep(step.id) }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        done ? 'bg-[#1a3a3a] border-[#1a3a3a]' : 'border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </button>
                    <span className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {step.label}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              )
            })}
          </div>
        </div>

        {/* Coach AI Card — 2 cols */}
        <div id="tour-coach" className="lg:col-span-2 bg-[#1a3a3a] rounded-xl p-6 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Asistente Estrategico</span>
            </div>
            <h3 className="text-xl font-bold mt-2">Coach AI Global</h3>
            <p className="text-sm text-white/60 mt-2 leading-relaxed">
              Su Coach AI esta listo para analizar datos corporativos, responder dudas operativas y sugerir mejoras en tiempo real.
            </p>
          </div>
          <button
            onClick={() => navigate('/coach-ai')}
            className="mt-5 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-sm font-medium transition-all w-fit"
          >
            <Sparkles className="w-4 h-4" />
            Abrir Coach AI
          </button>
        </div>
      </div>

      {/* Bottom Row: Quick Links + Suggested Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Quick links — 3 cols */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div id="tour-guide" className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-[#1a3a3a]/20 transition-all cursor-pointer group" onClick={() => startAppTour()}>
            <div className="flex items-center justify-between mb-3">
              <BookOpen className="w-6 h-6 text-slate-400 group-hover:text-[#1a3a3a] transition-colors" />
              <div className="w-7 h-7 rounded-full bg-[#e8f0f0] flex items-center justify-center group-hover:bg-[#1a3a3a] transition-colors">
                <Play className="w-3 h-3 text-[#1a3a3a] group-hover:text-white transition-colors ml-0.5" />
              </div>
            </div>
            <h4 className="font-semibold text-slate-900 text-sm">Guia Rapida</h4>
            <p className="text-xs text-slate-500 mt-1">Recorrido interactivo por la plataforma. 2 min.</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-all cursor-pointer" onClick={() => {}}>
            <Headphones className="w-6 h-6 text-slate-400 mb-3" />
            <h4 className="font-semibold text-slate-900 text-sm">Soporte Premium</h4>
            <p className="text-xs text-slate-500 mt-1">Consulta con un especialista humano.</p>
          </div>
        </div>

        {/* Suggested Modules — 2 cols */}
        <div className="lg:col-span-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Modulos Sugeridos</p>
          <div className="space-y-2">
            {SUGGESTED_MODULES.map((mod) => {
              const Icon = mod.icon
              const status = getModuleStatus(mod.id)
              return (
                <div
                  key={mod.id}
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => navigate('/marketplace')}
                >
                  <div className="w-8 h-8 bg-[#e8f0f0] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#1a3a3a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{mod.name}</p>
                    <p className="text-[11px] text-slate-400">{mod.desc}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    status === 'Listo'
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-[#e8f0f0] text-[#1a3a3a]'
                  }`}>
                    {status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomeDashboard
