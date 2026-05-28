import { Bell, LogOut, Wifi, WifiOff, Menu } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'

const MODULO_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  animales: 'Animales',
  potreros: 'Potreros & Mapa',
  salud: 'Salud & Vacunas',
  reproduccion: 'Reproducción',
  pesajes: 'Pesajes & Leche',
  tareas: 'Tareas',
  inventario: 'Inventario',
  finanzas: 'Finanzas',
  alertas: 'Alertas',
  metas: 'Metas',
  ia: 'IA Asistente',
  usuarios: 'Usuarios',
}

export function Navbar() {
  const { moduloActivo, toggleSidebar } = useUIStore()
  const { salir } = useAuth()
  const [enLinea, setEnLinea] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setEnLinea(true)
    const off = () => setEnLinea(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Hamburger — solo visible en móvil */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-gray-900">
          {MODULO_LABELS[moduloActivo] ?? moduloActivo}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Indicador online/offline */}
        <span
          title={enLinea ? 'En línea' : 'Sin conexión — datos en caché'}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            enLinea ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
          }`}
        >
          {enLinea ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className="hidden sm:inline">{enLinea ? 'En línea' : 'Offline'}</span>
        </span>

        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <button
          onClick={salir}
          title="Cerrar sesión"
          className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
