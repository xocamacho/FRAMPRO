import { clsx } from 'clsx'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard, Beef, MapPin, Syringe, Heart, Scale,
  ClipboardList, Package, DollarSign, Bell, Target, Bot,
  Users, Leaf, ChevronRight, Settings, Milk, X,
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icono: React.ReactNode
  soloAdmin?: boolean
}

const MENU_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',           icono: <LayoutDashboard size={18} /> },
  { id: 'finca',        label: 'Mi Finca',             icono: <Settings size={18} /> },
  { id: 'animales',     label: 'Animales',             icono: <Beef size={18} /> },
  { id: 'potreros',     label: 'Potreros',             icono: <MapPin size={18} /> },
  { id: 'salud',        label: 'Salud & Vacunas',      icono: <Syringe size={18} /> },
  { id: 'reproduccion', label: 'Reproducción',         icono: <Heart size={18} /> },
  { id: 'pesajes',      label: 'Pesajes',              icono: <Scale size={18} /> },
  { id: 'leche',        label: 'Producción de Leche',  icono: <Milk size={18} /> },
  { id: 'tareas',       label: 'Tareas',               icono: <ClipboardList size={18} /> },
  { id: 'inventario',   label: 'Inventario',           icono: <Package size={18} /> },
  { id: 'finanzas',     label: 'Finanzas',             icono: <DollarSign size={18} />, soloAdmin: true },
  { id: 'alertas',      label: 'Alertas',              icono: <Bell size={18} /> },
  { id: 'metas',        label: 'Metas',                icono: <Target size={18} /> },
  { id: 'ia',           label: 'IA Asistente',         icono: <Bot size={18} /> },
  { id: 'usuarios',     label: 'Usuarios',             icono: <Users size={18} />, soloAdmin: true },
]

export function Sidebar() {
  const { moduloActivo, setModuloActivo, sidebarAbierto, setSidebarAbierto } = useUIStore()
  const { usuario, finca } = useAuthStore()
  const esAdmin = !usuario?.rol || usuario.rol === 'admin' || usuario.rol === 'propietario'

  const itemsVisibles = MENU_ITEMS.filter(item => !item.soloAdmin || esAdmin)

  function navegar(id: string) {
    setModuloActivo(id) // cierra sidebar en móvil automáticamente
  }

  return (
    <>
      {/* ── Overlay oscuro — solo en móvil cuando el sidebar está abierto ── */}
      {sidebarAbierto && (
        <div
          className="fixed inset-0 bg-black/50 z-[200] lg:hidden"
          onClick={() => setSidebarAbierto(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={clsx(
          'fixed left-0 top-0 h-full w-64 bg-gray-900 text-white flex flex-col',
          'z-[300] transition-transform duration-300 ease-in-out',
          // Móvil: fuera de pantalla por defecto, entra cuando sidebarAbierto=true
          sidebarAbierto ? 'translate-x-0' : '-translate-x-full',
          // Desktop: siempre visible (sobreescribe el estado)
          'lg:translate-x-0',
        )}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Leaf size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight">FincaPro</p>
              <p className="text-xs text-gray-400 truncate max-w-[140px]">{finca?.nombre ?? 'Mi Finca'}</p>
            </div>
          </div>
          {/* Botón X — solo en móvil */}
          <button
            onClick={() => setSidebarAbierto(false)}
            className="lg:hidden p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Navegación ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <ul className="flex flex-col gap-0.5">
            {itemsVisibles.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => navegar(item.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                    moduloActivo === item.id
                      ? 'bg-green-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )}
                >
                  <span className="flex-shrink-0">{item.icono}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {moduloActivo === item.id && <ChevronRight size={14} className="flex-shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Footer usuario ── */}
        <div className="px-4 py-3 border-t border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {usuario?.nombre?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{usuario?.nombre ?? 'Usuario'}</p>
              <p className="text-xs text-gray-400 capitalize">{usuario?.rol ?? 'Sin rol'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
