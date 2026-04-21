import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { CheckCircle2, XCircle, Blocks } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'

const MarketplaceModule = () => {
  const { setFlows } = useOutletContext()
  const { token } = useAuth()
  const [orgModules, setOrgModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }

  // Fetch all org modules (active + inactive) for the marketplace view
  useEffect(() => {
    fetchOrgModules()
  }, [])

  const fetchOrgModules = async () => {
    try {
      const res = await fetch('/api/modules/org', { headers })
      if (res.ok) {
        const data = await res.json()
        setOrgModules(data.modules)
      }
    } catch (err) {
      console.error('Error loading modules:', err)
    }
    setLoading(false)
  }

  // After toggling, refresh both org modules AND the sidebar flows
  const refreshSidebarFlows = async () => {
    try {
      const res = await fetch('/api/modules/me', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setFlows(data.modules)
      }
    } catch (err) { console.error(err) }
  }

  const toggleFlow = async (id) => {
    const flow = orgModules.find(f => f.id === id)
    if (!flow) return

    setToggling(id)
    try {
      const res = await fetch('/api/modules/org', {
        method: 'PUT', headers,
        body: JSON.stringify({ moduleId: id, active: !flow.active })
      })
      if (res.ok) {
        setOrgModules(orgModules.map(f => f.id === id ? { ...f, active: !f.active } : f))
        // Refresh sidebar flows so it reflects the change
        refreshSidebarFlows()
      }
    } catch (err) {
      console.error('Error toggling module:', err)
    }
    setToggling(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1a3a3a] border-t-transparent" />
      </div>
    )
  }

  // Only show modules (not connectors)
  const modules = orgModules.filter(f => f.type === 'module' || !f.type)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Blocks className="w-5 h-5 text-[#1a3a3a]" />
            Modulos
          </h2>
          <p className="text-slate-500 text-sm mt-1">Active o desactive modulos de automatizacion para su organizacion.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modules.map((flow) => (
          <div
            key={flow.id}
            className={`group p-5 rounded-xl border transition-all duration-200 ${flow.active
                ? 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                : 'bg-slate-50 border-slate-100 opacity-75'
              }`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-3xl">{flow.icon}</span>
              <button
                onClick={() => toggleFlow(flow.id)}
                disabled={toggling === flow.id}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${flow.active ? 'bg-[#1a3a3a]' : 'bg-slate-300'
                  } ${toggling === flow.id ? 'opacity-50' : ''}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${flow.active ? 'translate-x-4' : 'translate-x-0'
                  }`} />
              </button>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-[#1a3a3a] transition-colors">
                {flow.name}
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 line-clamp-2 leading-relaxed">
                {flow.description}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {flow.active ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${flow.active ? 'text-green-600' : 'text-slate-400'
                  }`}>
                  {flow.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MarketplaceModule
