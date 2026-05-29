/**
 * Netlify Function — Proxy para Groq API
 * Disponible en: /.netlify/functions/groq
 */
const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY
const GROQ_BASE    = 'https://api.groq.com/openai/v1'

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (!GROQ_API_KEY || GROQ_API_KEY.startsWith('gsk_TU_')) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'VITE_GROQ_API_KEY no configurada' }) }
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {}
    const upstream = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await upstream.text()
    return { statusCode: upstream.status, headers, body: data }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
