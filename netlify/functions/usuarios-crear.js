/**
 * Netlify Function — POST /.netlify/functions/usuarios-crear
 * Crea usuario en Supabase Auth + tabla usuarios (requiere service_role key)
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
  if (!admin) {
    return { statusCode: 503, headers, body: JSON.stringify({
      error: 'SUPABASE_SERVICE_ROLE_KEY no configurada',
      hint: 'Agrégala en Netlify → Site → Environment Variables',
    })}
  }

  const { email, password, nombre, rol, permisos, finca_id } = JSON.parse(event.body || '{}')
  if (!email || !password || !nombre || !finca_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan campos: email, password, nombre, finca_id' }) }
  }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(), password, email_confirm: true,
  })
  if (authErr) return { statusCode: 400, headers, body: JSON.stringify({ error: authErr.message }) }

  const { data, error: dbErr } = await admin.from('usuarios')
    .insert({ id: authData.user.id, finca_id, nombre: nombre.trim(), email: email.trim().toLowerCase(), rol: rol ?? 'trabajador', permisos: permisos ?? {}, activo: true })
    .select().single()

  if (dbErr) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { statusCode: 400, headers, body: JSON.stringify({ error: dbErr.message }) }
  }

  return { statusCode: 200, headers, body: JSON.stringify(data) }
}
