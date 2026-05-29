const GROQ_URL = import.meta.env.DEV
  ? 'http://localhost:3001/api/groq/chat/completions'
  : '/api/groq'

export async function consultarIA(pregunta: string, contexto?: object): Promise<string> {
  const contextoStr = contexto ? `\nCONTEXTO:\n${JSON.stringify(contexto, null, 2)}` : ''

  const prompt = `Eres un veterinario colombiano con 20 años de experiencia en ganadería de doble propósito del Cesar.
Especializado en salud reproductiva, nutrición mineral y manejo del estrés calórico.

Siempre:
- Responde en español simple y práctico
- Usa unidades locales (kilos, litros, pesos colombianos)
- Si es urgente, incluye: "⚠️ CONSULTE UN VETERINARIO INMEDIATAMENTE"
- Recomendaciones económicas y aplicables en finca${contextoStr}

PREGUNTA: ${pregunta}`

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content ?? 'Sin respuesta del asistente.'
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    throw new Error(`Error al conectar con la IA: ${msg}`)
  }
}
