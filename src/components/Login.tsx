import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Mail, Lock, Leaf } from 'lucide-react'

export function Login() {
  const { iniciarSesion } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await iniciarSesion(email, password)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
      if (msg.includes('Invalid login')) {
        setError('Email o contraseña incorrectos')
      } else if (msg.includes('placeholder')) {
        setError('⚠️ Supabase no está configurado. Agrega tus keys en .env')
      } else {
        setError(msg)
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <Leaf size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FincaPro</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión Ganadera Inteligente</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icono={<Mail size={16} />}
            required
            autoComplete="email"
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icono={<Lock size={16} />}
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <Button type="submit" cargando={cargando} tamano="lg" className="mt-2 w-full">
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>

      </div>
    </div>
  )
}
