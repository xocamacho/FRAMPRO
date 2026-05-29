/**
 * Netlify Function — POST /.netlify/functions/usuarios-cambiar-password
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL              = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getAdmin() {
  if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY === 'PEGA_AQUI_TU_SERVICE_ROLE_KEY') return null
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const admin = getAdmin()
  if (!admin) return { statusCode: 503, headers, body: JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' }) }

  const { usuario_id, nueva_password } = JSON.parse(event.body || '{}')
  if (!usuario_id || !nueva_password) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan usuario_id o nueva_password' }) }
  }

  const { error } = await admin.auth.admin.updateUserById(usuario_id, { password: nueva_password })
  if (error) return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) }

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
}
