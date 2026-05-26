/**
 * Error Boundary global — evita que un crash de un componente
 * tumbe toda la pantalla. Muestra un fallback amigable y permite recargar.
 */
import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Component crashed:', error, info)
    this.setState({ info })
  }

  reset = () => {
    this.setState({ hasError: false, error: null, info: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Algo se rompió en pantalla</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Un componente lanzó un error. Esto no debería pasar — abre la consola del navegador (F12 → Console)
                y mándale el mensaje rojo a Efra para que lo arregle.
              </p>
              {this.state.error?.message && (
                <pre className="mt-3 text-[11px] bg-slate-100 dark:bg-slate-900 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg overflow-auto max-h-40 whitespace-pre-wrap break-all">
                  {this.state.error.message}
                </pre>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={this.reset}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg"
                >
                  Reintentar
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Recargar página
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
