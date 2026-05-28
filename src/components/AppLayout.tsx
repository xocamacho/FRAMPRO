import { Component, type ReactNode, Suspense, lazy } from 'react'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { Dashboard } from './Dashboard'
import { useUIStore } from '@/store/uiStore'
import { useOfflineSync } from '@/hooks/useOfflineSync'

const Finca = lazy(() => import('./modulos/Finca').then((m) => ({ default: m.Finca })))
const Animales = lazy(() => import('./modulos/Animales').then((m) => ({ default: m.Animales })))
const Potreros = lazy(() => import('./modulos/Potreros').then((m) => ({ default: m.Potreros })))
const Salud = lazy(() => import('./modulos/Salud').then((m) => ({ default: m.Salud })))
const Reproduccion = lazy(() => import('./modulos/Reproduccion').then((m) => ({ default: m.Reproduccion })))
const Pesajes = lazy(() => import('./modulos/Pesajes').then((m) => ({ default: m.Pesajes })))
const Leche   = lazy(() => import('./modulos/Leche').then((m) => ({ default: m.Leche })))
const Tareas = lazy(() => import('./modulos/Tareas').then((m) => ({ default: m.Tareas })))
const Inventario = lazy(() => import('./modulos/Inventario').then((m) => ({ default: m.Inventario })))
const Finanzas = lazy(() => import('./modulos/Finanzas').then((m) => ({ default: m.Finanzas })))
const Alertas = lazy(() => import('./modulos/Alertas').then((m) => ({ default: m.Alertas })))
const Metas = lazy(() => import('./modulos/Metas').then((m) => ({ default: m.Metas })))
const IAAsistente = lazy(() => import('./modulos/IAAsistente').then((m) => ({ default: m.IAAsistente })))
const Usuarios = lazy(() => import('./modulos/Usuarios').then((m) => ({ default: m.Usuarios })))

// ── Error Boundary ────────────────────────────────────────────────
interface EBState { error: Error | null }
interface EBProps  { children: ReactNode; moduloActivo: string }

class ModuloErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { error: null }

  static getDerivedStateFromError(error: Error): EBState {
    return { error }
  }

  componentDidUpdate(prev: EBProps) {
    // Limpia el error al cambiar de módulo para que el siguiente cargue limpio
    if (prev.moduloActivo !== this.props.moduloActivo) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4 p-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800">Ocurrió un error en este módulo</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">{this.state.error.message}</p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Loader ────────────────────────────────────────────────────────
function ModuloLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-gray-400">Cargando módulo...</p>
      </div>
    </div>
  )
}

function ModuloActual({ modulo }: { modulo: string }) {
  switch (modulo) {
    case 'dashboard': return <Dashboard />
    case 'finca': return <Finca />
    case 'animales': return <Animales />
    case 'potreros': return <Potreros />
    case 'salud': return <Salud />
    case 'reproduccion': return <Reproduccion />
    case 'pesajes': return <Pesajes />
    case 'leche':   return <Leche />
    case 'tareas': return <Tareas />
    case 'inventario': return <Inventario />
    case 'finanzas': return <Finanzas />
    case 'alertas': return <Alertas />
    case 'metas': return <Metas />
    case 'ia': return <IAAsistente />
    case 'usuarios': return <Usuarios />
    default: return <Dashboard />
  }
}

function OfflineBanner() {
  const { enLinea, pendientes, sincronizando, sincronizar } = useOfflineSync()

  if (enLinea && pendientes === 0) return null

  return (
    <div className={`flex items-center justify-between px-4 py-2 text-sm font-medium ${
      !enLinea
        ? 'bg-red-600 text-white'
        : 'bg-amber-500 text-white'
    }`}>
      <div className="flex items-center gap-2">
        {!enLinea ? (
          <>
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Sin conexión — los cambios se guardan localmente
          </>
        ) : (
          <>
            <span className="w-2 h-2 bg-white rounded-full" />
            {pendientes} cambio{pendientes !== 1 ? 's' : ''} pendiente{pendientes !== 1 ? 's' : ''} de sincronizar
          </>
        )}
      </div>
      {enLinea && pendientes > 0 && (
        <button
          onClick={sincronizar}
          disabled={sincronizando}
          className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors disabled:opacity-60 flex items-center gap-1.5"
        >
          {sincronizando ? (
            <>
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sincronizando...
            </>
          ) : (
            '↑ Sincronizar ahora'
          )}
        </button>
      )}
    </div>
  )
}

// Módulos que manejan su propio scroll/height internamente
const MODULOS_FULL_HEIGHT = new Set(['potreros'])

export function AppLayout() {
  const { moduloActivo } = useUIStore()
  const esFullHeight = MODULOS_FULL_HEIGHT.has(moduloActivo)

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      {/* Contenido principal — en desktop se desplaza 256px para no quedar bajo el sidebar */}
      <div className="lg:ml-64 flex flex-col h-screen overflow-hidden">
        <OfflineBanner />
        <Navbar />
        {/* flex-1 + min-h-0 = altura definitiva para hijos con h-full */}
        <main className={`flex-1 min-h-0 ${esFullHeight ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <ModuloErrorBoundary moduloActivo={moduloActivo}>
            <Suspense fallback={<ModuloLoader />}>
              <ModuloActual modulo={moduloActivo} />
            </Suspense>
          </ModuloErrorBoundary>
        </main>
      </div>
    </div>
  )
}
