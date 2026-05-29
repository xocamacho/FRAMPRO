export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  const { userId, newPassword } = req.body
  const URL = process.env.VITE_SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const r = await fetch(`${URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ password: newPassword }),
  })
  const d = await r.json()
  if (!r.ok) return res.status(400).json({ error: d })
  res.status(200).json({ ok: true })
}
