import { useState, useEffect } from 'react'
import {
  ClipboardList, ExternalLink, Loader2, ArrowRight, Sparkles, FileText,
  Globe, Mail, Shield, Layers, BarChart3
} from 'lucide-react'

/**
 * Módulo "Propuestas" — Producto white-label de Alce Alce para generar
 * propuestas comerciales personalizables a clientes finales.
 *
 * Por ahora abre el dashboard en su URL standalone. Cuando se integre
 * profundo (org_id, branding dinámico, auth unificado con alce_users),
 * todo vivirá dentro de este componente.
 */

const PROPUESTAS_URL = import.meta.env.VITE_PROPUESTAS_URL || 'http://5.78.149.23:3005'

const NAVY = 'var(--brand-primary, #101C44)'
const SKY  = 'var(--brand-secondary, #6DBBE8)'

export default function PropuestasModule() {
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)

  // Intenta obtener un resumen del backend de Propuestas (best effort, sin auth)
  useEffect(() => {
    setLoadingStats(true)
    fetch(`${PROPUESTAS_URL}/api/health`, { mode: 'cors' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setStats({ healthy: !!d, ts: d?.now }))
      .catch(() => setStats({ healthy: false }))
      .finally(() => setLoadingStats(false))
  }, [])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white"
            style={{ background: NAVY }}>
            <ClipboardList className="w-5 h-5" />
          </span>
          Propuestas
        </h2>
        <p className="text-sm text-slate-500 mt-2 max-w-2xl">
          Generador de propuestas comerciales personalizables para empresas de servicios.
          Manda cotizaciones bilingües (ES/EN), permite al cliente firmar desde un link público,
          y lleva un dashboard ejecutivo con KPIs por asesor y período.
        </p>
      </div>

      {/* Hero CTA */}
      <div className="rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1F2B61 60%, ${SKY} 200%)` }}>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold">Producto Alce</p>
            <h3 className="text-xl sm:text-2xl font-bold mt-1">Abre el generador de propuestas</h3>
            <p className="text-xs sm:text-sm text-white/75 mt-1 max-w-md">
              Pasa al dashboard completo para crear, enviar y dar seguimiento a tus propuestas.
            </p>
          </div>
          <a href={PROPUESTAS_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-sm font-semibold rounded-lg transition-transform hover:scale-105"
            style={{ color: NAVY }}>
            Abrir Propuestas <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Estado del servicio */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
        {loadingStats ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            <span className="text-sm text-slate-500">Comprobando servicio…</span>
          </>
        ) : stats?.healthy ? (
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-slate-700">
              <strong className="text-emerald-700">Servicio en línea</strong> · Listo para usarse
            </span>
            <span className="ml-auto text-[10px] text-slate-400 font-mono">{PROPUESTAS_URL}</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm text-red-700">
              Servicio no responde. Si persiste, contacta soporte.
            </span>
          </>
        )}
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <FeatureCard
          icon={FileText}
          title="Catálogo de servicios"
          description="Importa trámites desde .docx con IA. ~89 servicios precargados con conceptos, requisitos y tiempos."
        />
        <FeatureCard
          icon={Globe}
          title="Bilingüe ES/EN"
          description="Cada servicio tiene su versión en español e inglés. El cliente recibe la propuesta en su idioma."
        />
        <FeatureCard
          icon={Mail}
          title="Envío automático"
          description="Manda la propuesta por correo desde el dominio del cliente. n8n + Microsoft Graph / Resend / SMTP."
        />
        <FeatureCard
          icon={Sparkles}
          title="Vista pública firmable"
          description="El cliente abre un link, ve la propuesta y firma sin login. Recibes notificación al instante."
        />
        <FeatureCard
          icon={BarChart3}
          title="Dashboard ejecutivo"
          description="KPIs por período (hoy / mes / trimestre), filtros por asesor y categoría, paginación 15/pág."
        />
        <FeatureCard
          icon={Shield}
          title="Auth seguro"
          description="Bcrypt 12 rounds, roles admin/vendedor, gestión de equipo. Cada vendedor solo ve sus propuestas."
        />
      </div>

      {/* Cliente piloto */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Layers className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: NAVY }} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Cliente piloto en producción</p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Una consultoría migratoria ya está usando el producto en vivo con ~89 trámites cargados,
              5 vendedores activos y propuestas siendo enviadas diariamente. El producto está
              preparado para revenderse a más empresas de servicios con su propia marca y catálogo.
            </p>
          </div>
        </div>
      </div>

      {/* Roadmap link */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed">
        <p className="font-semibold mb-1">🚧 Integración profunda en roadmap</p>
        <p>
          Por ahora el producto corre como app standalone (esta página solo lanza al dashboard).
          Próxima iteración: integrar nativamente dentro del dashboard de Alce con auth unificado,
          multi-tenant real (<code>org_id</code>), branding dinámico, y onboarding de nuevos clientes en minutos.
        </p>
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
        style={{ background: 'var(--brand-primary-soft, #e8ecf2)', color: NAVY }}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
    </div>
  )
}

