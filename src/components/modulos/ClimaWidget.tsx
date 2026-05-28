import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { obtenerClima, generarAlertasClimaticas, interpretarHumedad, type ClimaActual } from '@/services/weatherAPI'
import { Droplets, Wind, Eye, Gauge } from 'lucide-react'

interface ClimaWidgetProps {
  latitud?: number
  longitud?: number
}

export function ClimaWidget({ latitud = 10.16, longitud = -75.52 }: ClimaWidgetProps) {
  const [clima, setClima] = useState<ClimaActual | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargarClima = async () => {
      setCargando(true)
      try {
        const datos = await obtenerClima(latitud, longitud)
        setClima(datos)
      } catch (error) {
        console.error('Error cargando clima:', error)
      }
      setCargando(false)
    }

    cargarClima()
    const intervalo = setInterval(cargarClima, 600000)
    return () => clearInterval(intervalo)
  }, [latitud, longitud])

  if (cargando) {
    return <Card>Cargando clima...</Card>
  }

  if (!clima) {
    return <Card>⚠️ No se pudo obtener el clima</Card>
  }

  const alertas = generarAlertasClimaticas(clima)
  const interpretacion = interpretarHumedad(clima.humedad)

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-600">Clima Actual</h3>
            <p className="text-xs text-gray-500">{clima.ciudad}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-gray-900">{clima.temperatura}°</div>
            <div className="text-xs text-gray-500 capitalize">{clima.descripcion}</div>
          </div>
        </div>

        <div className="mb-4 p-3 bg-white rounded-lg border border-blue-100">
          <div className="text-xs text-gray-500">Sensación térmica</div>
          <div className="text-2xl font-bold text-blue-600">{clima.sensacion_termica}°C</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex gap-2 p-2 bg-white rounded border border-gray-100">
            <Droplets size={16} className="text-blue-500 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500">Humedad</div>
              <div className="text-sm font-semibold">{clima.humedad}%</div>
              <div className="text-xs text-gray-400">{interpretacion}</div>
            </div>
          </div>

          <div className="flex gap-2 p-2 bg-white rounded border border-gray-100">
            <Wind size={16} className="text-cyan-500 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500">Viento</div>
              <div className="text-sm font-semibold">{clima.viento_velocidad} km/h</div>
            </div>
          </div>

          <div className="flex gap-2 p-2 bg-white rounded border border-gray-100">
            <Eye size={16} className="text-amber-500 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500">Nubosidad</div>
              <div className="text-sm font-semibold">{clima.nubosidad}%</div>
            </div>
          </div>

          <div className="flex gap-2 p-2 bg-white rounded border border-gray-100">
            <Gauge size={16} className="text-purple-500 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500">Presión</div>
              <div className="text-sm font-semibold">{clima.presion} hPa</div>
            </div>
          </div>
        </div>
      </Card>

      {alertas.length > 0 && (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50">
          <h4 className="text-sm font-semibold text-orange-900 mb-3">⚠️ Alertas Climáticas</h4>
          <div className="space-y-3">
            {alertas.map((alerta, i) => (
              <div
                key={i}
                className={`p-3 rounded border-l-4 ${
                  alerta.severidad === 'alta'
                    ? 'bg-red-50 border-l-red-500 text-red-800'
                    : alerta.severidad === 'media'
                      ? 'bg-yellow-50 border-l-yellow-500 text-yellow-800'
                      : 'bg-blue-50 border-l-blue-500 text-blue-800'
                }`}
              >
                <div className="font-semibold text-sm">{alerta.mensaje}</div>
                <div className="text-xs mt-1 opacity-75">{alerta.recomendacion}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
