/**
 * Vercel Serverless Function — POST /api/usuarios/cambiar-password
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const admin = getAdmin()
  if (!admin) return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' })

  const { usuario_id, nueva_password } = req.body ?? {}
  if (!usuario_id || !nueva_password) {
    return res.status(400).json({ error: 'Faltan usuario_id o nueva_password' })
  }

  const { error } = await admin.auth.admin.updateUserById(usuario_id, { password: nueva_password })
  if (error) return res.status(400).json({ error: error.message })

  return res.status(200).json({ ok: true })
}
