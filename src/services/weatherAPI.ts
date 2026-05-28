export interface ClimaActual {
  temperatura: number
  sensacion_termica: number
  humedad: number
  presion: number
  viento_velocidad: number
  nubosidad: number
  descripcion: string
  icono: string
  ciudad: string
}

export interface AlertaClimatica {
  tipo: 'calor_extremo' | 'frio_extremo' | 'lluvia' | 'viento'
  severidad: 'baja' | 'media' | 'alta'
  mensaje: string
  recomendacion: string
}

export async function obtenerClima(
  latitud: number,
  longitud: number
): Promise<ClimaActual | null> {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
  if (!apiKey || apiKey === 'TU_OPENWEATHER_KEY_AQUI') return null

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitud}&lon=${longitud}&appid=${apiKey}&units=metric&lang=es`
    )

    if (!response.ok) return null

    const data = await response.json()

    return {
      temperatura: Math.round(data.main.temp),
      sensacion_termica: Math.round(data.main.feels_like),
      humedad: data.main.humidity,
      presion: data.main.pressure,
      viento_velocidad: Math.round(data.wind.speed * 3.6),
      nubosidad: data.clouds.all,
      descripcion: data.weather[0].description,
      icono: data.weather[0].main,
      ciudad: data.name,
    }
  } catch {
    return null
  }
}

export function generarAlertasClimaticas(clima: ClimaActual): AlertaClimatica[] {
  const alertas: AlertaClimatica[] = []

  if (clima.temperatura > 32) {
    alertas.push({
      tipo: 'calor_extremo',
      severidad: clima.temperatura > 35 ? 'alta' : 'media',
      mensaje: `🔥 Temperatura: ${clima.temperatura}°C`,
      recomendacion:
        clima.temperatura > 35
          ? '⚠️ ESTRÉS CALÓRICO: Agua fresca, sombra, reduce movimientos'
          : 'Proporciona sombra y agua. Monitorea BCS',
    })
  }

  if (clima.temperatura < 5) {
    alertas.push({
      tipo: 'frio_extremo',
      severidad: clima.temperatura < 0 ? 'alta' : 'media',
      mensaje: `❄️ Temperatura: ${clima.temperatura}°C`,
      recomendacion: 'Abrigo para terneros. Aumenta alimento energético.',
    })
  }

  if (clima.icono === 'Rain') {
    alertas.push({
      tipo: 'lluvia',
      severidad: 'media',
      mensaje: '🌧️ Lluvia detectada',
      recomendacion: 'Verifica drenaje. Desinfecta áreas húmedas. Revisa cascos.',
    })
  }

  if (clima.viento_velocidad > 40) {
    alertas.push({
      tipo: 'viento',
      severidad: clima.viento_velocidad > 60 ? 'alta' : 'media',
      mensaje: `💨 Viento: ${clima.viento_velocidad} km/h`,
      recomendacion: 'Asegura estructuras. Monitorea pánico en ganado.',
    })
  }

  return alertas
}

export function interpretarHumedad(humedad: number): string {
  if (humedad < 40) return 'Baja - Riesgo de deshidratación'
  if (humedad < 60) return 'Óptima'
  if (humedad < 75) return 'Moderada'
  return 'Alta - Riesgo de enfermedades respiratorias'
}
