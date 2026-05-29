export async function onRequestPost(context) {
  const { request, env } = context
  const { email, password, nombre, rol, finca_id, permisos } = await request.json()

  const SUPABASE_URL = env.VITE_SUPABASE_URL
  const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY

  // 1. Crear usuario en Auth
  const authResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  const authData = await authResp.json()
  if (!authResp.ok) return new Response(JSON.stringify({ error: authData }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const userId = authData.id

  // 2. Insertar en tabla usuarios
  const dbResp = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ id: userId, email, nombre, rol, finca_id, permisos: permisos || {}, activo: true }),
  })
  const dbData = await dbResp.json()
  if (!dbResp.ok) return new Response(JSON.stringify({ error: dbData }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  return new Response(JSON.stringify(dbData[0]), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
