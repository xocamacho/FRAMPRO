export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  const { email, password, nombre, rol, finca_id, permisos } = req.body
  const URL = process.env.VITE_SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const authR = await fetch(`${URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  const authD = await authR.json()
  if (!authR.ok) return res.status(400).json({ error: authD })
  const dbR = await fetch(`${URL}/rest/v1/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'return=representation' },
    body: JSON.stringify({ id: authD.id, email, nombre, rol, finca_id, permisos: permisos || {}, activo: true }),
  })
  const dbD = await dbR.json()
  if (!dbR.ok) return res.status(400).json({ error: dbD })
  res.status(200).json(dbD[0])
}
