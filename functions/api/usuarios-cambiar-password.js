export async function onRequestPost(context) {
  const { request, env } = context
  const { userId, newPassword } = await request.json()

  const SUPABASE_URL = env.VITE_SUPABASE_URL
  const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ password: newPassword }),
  })
  const data = await resp.json()
  if (!resp.ok) return new Response(JSON.stringify({ error: data }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  return new Response(JSON.stringify({ ok: true }), {
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
