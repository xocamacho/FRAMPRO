/**
 * Vercel Serverless Function — POST /api/usuarios/crear
 * Crea un usuario en Supabase Auth + tabla usuarios usando service_role key
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL             = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getAdmin() {
  if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY === 'PEGA_AQUI_TU_SERVICE_ROLE_KEY') return null
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const admin = getAdmin()
  if (!admin) {
    return res.status(503).json({
      error: 'SUPABASE_SERVICE_ROLE_KEY no configurada',
      hint: 'Agrégala en Vercel → Project → Settings → Environment Variables',
    })
  }

  const { email, password, nombre, rol, permisos, finca_id } = req.body ?? {}
  if (!email || !password || !nombre || !finca_id) {
    return res.status(400).json({ error: 'Faltan campos: email, password, nombre, finca_id' })
  }

  // 1. Crear en Auth
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  })
  if (authErr) return res.status(400).json({ error: authErr.message })

  const userId = authData.user.id

  // 2. Insertar en tabla usuarios
  const { data, error: dbErr } = await admin
    .from('usuarios')
    .insert({ id: userId, finca_id, nombre: nombre.trim(), email: email.trim().toLowerCase(), rol: rol ?? 'trabajador', permisos: permisos ?? {}, activo: true })
    .select().single()

  if (dbErr) {
    await admin.auth.admin.deleteUser(userId) // rollback
    return res.status(400).json({ error: dbErr.message })
  }

  return res.status(200).json(data)
}
