import { useAuthStore } from '@/store/authStore'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Beef, MapPin, Syringe, TrendingUp, Droplets, ClipboardList, Bot } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

interface MetricaCardProps {
  titulo: string
  valor: string | number
  subtitulo?: string
  icono: React.ReactNode
  color: string
  onClick?: () => void
}

function MetricaCard({ titulo, valor, subtitulo, icono, color, onClick }: MetricaCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{titulo}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{valor}</p>
          {subtitulo && <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          {icono}
        </div>
      </div>
    </Card>
  )
}

export function Dashboard() {
  const { usuario, finca } = useAuthStore()
  const { setModuloActivo } = useUIStore()

  const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Bienvenida */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Buen día, {usuario?.nombre?.split(' ')[0] ?? 'Ganadero'} 👋
        </h2>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{hoy}</p>
      </div>

      {/* Métricas principales */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Resumen del día</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricaCard
            titulo="Total Animales"
            valor="—"
            subtitulo="en inventario"
            icono={<Beef size={22} className="text-green-600" />}
            color="bg-green-50"
            onClick={() => setModuloActivo('animales')}
          />
          <MetricaCard
            titulo="Potreros"
            valor="—"
            subtitulo="activos"
            icono={<MapPin size={22} className="text-blue-600" />}
            color="bg-blue-50"
            onClick={() => setModuloActivo('potreros')}
          />
          <MetricaCard
            titulo="Leche Hoy"
            valor="— L"
            subtitulo="producción diaria"
            icono={<Droplets size={22} className="text-cyan-600" />}
            color="bg-cyan-50"
            onClick={() => setModuloActivo('pesajes')}
          />
          <MetricaCard
            titulo="Alertas"
            valor="0"
            subtitulo="pendientes"
            icono={<Syringe size={22} className="text-red-500" />}
            color="bg-red-50"
            onClick={() => setModuloActivo('alertas')}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Accesos rápidos */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Accesos rápidos</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: 'animales', label: 'Ver animales', icono: <Beef size={18} />, color: 'text-green-600 bg-green-50' },
                { id: 'salud', label: 'Registrar vacuna', icono: <Syringe size={18} />, color: 'text-purple-600 bg-purple-50' },
                { id: 'tareas', label: 'Mis tareas', icono: <ClipboardList size={18} />, color: 'text-orange-600 bg-orange-50' },
                { id: 'reproduccion', label: 'Reproducción', icono: <TrendingUp size={18} />, color: 'text-pink-600 bg-pink-50' },
                { id: 'potreros', label: 'Mapa potreros', icono: <MapPin size={18} />, color: 'text-blue-600 bg-blue-50' },
                { id: 'ia', label: 'Preguntar a IA', icono: <Bot size={18} />, color: 'text-indigo-600 bg-indigo-50' },
              ].map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setModuloActivo(acc.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all text-center"
                >
                  <span className={`p-2 rounded-lg ${acc.color}`}>{acc.icono}</span>
                  <span className="text-xs font-medium text-gray-700">{acc.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Panel de novedades */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Novedades recientes</CardTitle>
              <Badge variante="gris">0</Badge>
            </CardHeader>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ClipboardList size={32} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Sin novedades registradas hoy</p>
              <p className="text-xs text-gray-300 mt-1">Los eventos aparecerán aquí</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Próximas vacunas / alertas */}
      {finca && (
        <Card>
          <CardHeader>
            <CardTitle>Próximas vacunas ICA</CardTitle>
            <Badge variante="amarillo">Próximos 30 días</Badge>
          </CardHeader>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Syringe size={32} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Sin vacunas programadas</p>
            <p className="text-xs text-gray-300 mt-1">Registra vacunas en el módulo de Salud</p>
          </div>
        </Card>
      )}
    </div>
  )
}
