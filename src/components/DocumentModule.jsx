import { useState } from 'react'
import { handleUpdate } from '../utils/api'
import { FilePlus, Send, Folder, Mail, Building, ChevronDown } from 'lucide-react'
import AgentAdminPanel from './AgentAdminPanel'

const DocumentModule = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    emails: '',
    driveFolder: '',
    docType: 'Minuta de Reunion'
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await handleUpdate('YOUR_WEBHOOK_URL_HERE', formData)
    setLoading(false)
    alert('Solicitud de generacion enviada')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <AgentAdminPanel moduleId="documentos" />

      <div className="bg-white p-8 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-2.5 bg-violet-50 rounded-lg">
            <FilePlus className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Generacion de Documentos</h2>
            <p className="text-sm text-slate-500">Crea PDFs automatizados y envialos instantaneamente.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-slate-400" /> Nombre de la Empresa
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 outline-none transition-all text-sm"
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 text-slate-400" /> Carpeta en Drive (ID)
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 outline-none transition-all text-sm"
                value={formData.driveFolder}
                onChange={(e) => setFormData({...formData, driveFolder: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> Correos de destino (separados por comas)
            </label>
            <input
              type="text"
              required
              placeholder="ejemplo@empresa.com, socio@empresa.com"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 outline-none transition-all text-sm"
              value={formData.emails}
              onChange={(e) => setFormData({...formData, emails: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Tipo de Documento</label>
            <div className="relative">
              <select
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 outline-none transition-all appearance-none cursor-pointer text-sm text-slate-700 pr-10"
                value={formData.docType}
                onChange={(e) => setFormData({...formData, docType: e.target.value})}
              >
                <option>Minuta de Reunion</option>
                <option>Propuesta Comercial</option>
                <option>Resumen Ejecutivo</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg font-semibold text-sm flex items-center justify-center space-x-2 transition-all shadow-sm active:scale-[0.98]"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Generar y Enviar PDF</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default DocumentModule
