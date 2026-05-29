import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Mail, Lock, Leaf, BarChart3, Shield, Clock, ArrowRight } from 'lucide-react'

export function Login() {
  const { iniciarSesion } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState('')

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
        setError('⚠️ Supabase no está configurado.')
      } else {
        setError(msg)
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo — foto + contenido ── */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative flex-col justify-between p-10 overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay oscuro-verde */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/80 via-green-800/60 to-green-900/70" />

        {/* Contenido sobre el overlay */}
        <div className="relative z-10 flex flex-col h-full justify-between">

          {/* Logo arriba */}
          <div>
            <img src="/logo-fincaxpro.png" alt="FincaXpro" className="h-20 w-auto drop-shadow-lg" />
            <p className="text-green-200 font-medium mt-1 text-sm tracking-wide">Gestión Ganadera Inteligente</p>
          </div>

          {/* Texto central */}
          <div className="max-w-lg">
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-4">
              Administra tu ganado,<br />
              impulsa tu{' '}
              <span className="text-green-300">producción.</span>
            </h1>
            <p className="text-green-100 text-base mb-10 leading-relaxed">
              FincaXpro te ayuda a llevar el control de tu hato de forma fácil, eficiente y segura.
            </p>

            {/* Bullets */}
            <div className="flex flex-col gap-5">
              {[
                { icon: <BarChart3 size={20} />, titulo: 'Control total', desc: 'Registra y consulta información clave de tu ganado en tiempo real.' },
                { icon: <Shield size={20} />,    titulo: 'Datos seguros',  desc: 'Tu información está protegida con los más altos estándares.' },
                { icon: <Clock size={20} />,     titulo: 'Decisiones inteligentes', desc: 'Reportes y estadísticas que te ayudan a tomar mejores decisiones.' },
              ].map(({ icon, titulo, desc }) => (
                <div key={titulo} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-500/30 border border-green-400/30 flex items-center justify-center text-green-300 shrink-0 mt-0.5">
                    {icon}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{titulo}</p>
                    <p className="text-green-200 text-xs mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Espaciador inferior */}
          <div />
        </div>
      </div>

      {/* ── Panel derecho — formulario ── */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">

          {/* Ícono hoja */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <Leaf size={28} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Bienvenido de nuevo</h2>
            <p className="text-sm text-gray-500 mt-1">Ingresa a tu cuenta para continuar</p>
          </div>

          {/* Logo visible solo en móvil */}
          <div className="flex justify-center mb-6 lg:hidden">
            <img src="/logo-fincaxpro.png" alt="FincaXpro" className="h-16 w-auto" />
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

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700">Contraseña</label>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icono={<Lock size={16} />}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-base"
            >
              {cargando ? 'Ingresando...' : (
                <>Ingresar <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            © {new Date().getFullYear()} FincaXpro — Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  )
}
