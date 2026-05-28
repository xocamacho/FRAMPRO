/**
 * Vercel Serverless Function — Proxy para Groq API
 * Reemplaza /api/groq/* del Express server en producción
 */

const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY
const GROQ_BASE    = 'https://api.groq.com/openai/v1'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // La URL llega como /api/groq/chat/completions o /api/groq/test
  // Extraemos la parte después de /api/groq
  const subpath = (req.url ?? '').replace(/^\/api\/groq\/?/, '') || 'chat/completions'

  // Test de conexión
  if (req.method === 'GET' && subpath === 'test') {
    try {
      const r = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3-8b-8192', messages: [{ role: 'user', content: 'test' }], max_tokens: 5 }),
      })
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { status: 'ok' } : { status: 'error', code: r.status })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // Proxy POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!GROQ_API_KEY || GROQ_API_KEY.startsWith('gsk_TU_')) {
    return res.status(400).json({ error: 'VITE_GROQ_API_KEY no configurada en variables de entorno' })
  }

  try {
    const upstream = await fetch(`${GROQ_BASE}/${subpath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    })

    const text = await upstream.text()
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Groq ${upstream.status}`, details: text })
    }
    return res.status(200).json(JSON.parse(text))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
