import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

// ── Supabase Admin (service_role) ──────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getAdminClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY === 'PEGA_AQUI_TU_SERVICE_ROLE_KEY') {
    return null
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── POST /api/usuarios/crear — admin crea usuario con contraseña ──
app.post('/api/usuarios/crear', async (req, res) => {
  const adminClient = getAdminClient()
  if (!adminClient) {
    return res.status(503).json({
      error: 'SUPABASE_SERVICE_ROLE_KEY no configurada',
      hint: 'Agrega SUPABASE_SERVICE_ROLE_KEY en tu .env (encuéntrala en Supabase → Project Settings → API → service_role)',
    })
  }

  const { email, password, nombre, rol, permisos, finca_id } = req.body
  if (!email || !password || !nombre || !finca_id) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: email, password, nombre, finca_id' })
  }

  try {
    // 1. Crear usuario en Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('❌ Error creando auth user:', authError)
      return res.status(400).json({ error: authError.message })
    }

    const userId = authData.user.id

    // 2. Insertar en tabla usuarios
    const { data, error: dbError } = await adminClient
      .from('usuarios')
      .insert({
        id: userId,
        finca_id,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        rol: rol ?? 'trabajador',
        permisos: permisos ?? {},
        activo: true,
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Error insertando en usuarios:', dbError)
      // Rollback: borrar auth user
      await adminClient.auth.admin.deleteUser(userId)
      return res.status(400).json({ error: dbError.message })
    }

    console.log('✅ Usuario creado:', data)
    res.json(data)
  } catch (err) {
    console.error('❌ Error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error interno' })
  }
})

// ── POST /api/usuarios/cambiar-password ──
app.post('/api/usuarios/cambiar-password', async (req, res) => {
  const adminClient = getAdminClient()
  if (!adminClient) {
    return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' })
  }

  const { usuario_id, nueva_password } = req.body
  if (!usuario_id || !nueva_password) {
    return res.status(400).json({ error: 'Faltan usuario_id o nueva_password' })
  }

  try {
    const { error } = await adminClient.auth.admin.updateUserById(usuario_id, {
      password: nueva_password,
    })
    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error interno' })
  }
})

app.get('/api/groq/test', async (req, res) => {
  try {
    console.log('🧪 Test de API key...')

    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10,
      }),
    })

    const text = await response.text()

    if (response.ok) {
      console.log('✅ API Key VÁLIDA')
      return res.json({ status: 'ok', message: 'API Key funciona' })
    } else {
      console.log(`❌ API Key inválida. Groq dice: ${text}`)
      return res.status(response.status).json({
        status: 'error',
        message: text
      })
    }
  } catch (error) {
    console.error('❌ Error en test:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
})

app.post('/api/groq/chat/completions', async (req, res) => {
  try {
    if (!GROQ_API_KEY || GROQ_API_KEY === 'gsk_TU_GROQ_KEY_AQUI') {
      console.error('❌ API Key no configurada o es placeholder')
      return res.status(400).json({
        error: 'GROQ_API_KEY no configurada',
        message: 'Agrega VITE_GROQ_API_KEY válida en el .env'
      })
    }

    console.log('🔄 Request a Groq con key:', GROQ_API_KEY.slice(0, 20) + '...')
    console.log('📤 Body:', JSON.stringify(req.body, null, 2))

    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error(`❌ Groq devolvió ${response.status}:`, responseText)
      return res.status(response.status).json({
        error: `Groq API error ${response.status}`,
        details: responseText
      })
    }

    const data = JSON.parse(responseText)
    console.log('✅ Respuesta de Groq recibida')
    res.json(data)
  } catch (error) {
    console.error('❌ Server error:', error)
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
})

app.listen(3001, () => {
  console.log('🚀 Backend Groq corriendo en http://localhost:3001')
})
