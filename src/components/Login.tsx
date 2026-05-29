import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
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
      if (msg.includes('Invalid login')) setError('Email o contraseña incorrectos')
      else setError(msg)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ══════════════════════════════
          PANEL IZQUIERDO — foto + info
         ══════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[58%] relative flex-col p-10 overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1400&q=85')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 60%',
        }}
      >
        {/* Overlay degradado verde oscuro */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-950/85 via-green-900/70 to-green-900/40" />

        <div className="relative z-10 flex flex-col h-full">

          {/* Logo sin fondo — arriba izquierda */}
          <div className="mb-2">
            <img
              src="/logo-fincaxpro-transparent.png"
              alt="FincaXpro"
              className="h-24 w-auto"
              style={{ filter: 'brightness(1.15) drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}
            />
            <p className="text-green-300 font-semibold text-sm tracking-widest uppercase mt-1 ml-1">
              Gestión Ganadera Inteligente
            </p>
          </div>

          {/* Espaciador */}
          <div className="flex-1" />

          {/* Headline + descripción + bullets */}
          <div className="max-w-lg mb-12">
            <h1 className="text-5xl font-black text-white leading-[1.1] mb-5 drop-shadow">
              Administra tu ganado,<br />
              impulsa tu{' '}
              <span className="text-green-400">producción.</span>
            </h1>
            <p className="text-green-100/90 text-base leading-relaxed mb-10">
              FincaXpro te ayuda a llevar el control de tu hato de forma fácil, eficiente y segura.
            </p>

            <div className="flex flex-col gap-6">
              {[
                { icon: <BarChart3 size={18} />, titulo: 'Control total',           desc: 'Registra y consulta información clave de tu ganado en tiempo real.' },
                { icon: <Shield    size={18} />, titulo: 'Datos seguros',            desc: 'Tu información está protegida con los más altos estándares de seguridad.' },
                { icon: <Clock     size={18} />, titulo: 'Decisiones inteligentes', desc: 'Reportes y estadísticas que te ayudan a tomar mejores decisiones.' },
              ].map(({ icon, titulo, desc }) => (
                <div key={titulo} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/25 border border-green-400/25 flex items-center justify-center text-green-300 shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{titulo}</p>
                    <p className="text-green-200/80 text-xs mt-1 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════
          PANEL DERECHO — formulario
         ══════════════════════════════ */}
      <div className="w-full lg:w-[42%] flex items-center justify-center bg-white px-8 py-10">
        <div className="w-full max-w-[380px]">

          {/* Logo en móvil */}
          <div className="flex justify-center mb-6 lg:hidden">
            <img src="/logo-fincaxpro.png" alt="FincaXpro" className="h-16 w-auto" />
          </div>

          {/* Ícono hoja */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-5 shadow-sm border border-green-100">
              <Leaf size={26} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center">Bienvenido de nuevo</h2>
            <p className="text-sm text-gray-500 mt-1.5 text-center">Ingresa a tu cuenta para continuar</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">Correo electrónico</label>
              <Input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icono={<Mail size={16} />}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">Contraseña</label>
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
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Botón ingresar */}
            <button
              type="submit"
              disabled={cargando}
              className="mt-1 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 text-base"
            >
              {cargando ? 'Ingresando...' : <><span>Ingresar</span><ArrowRight size={18} /></>}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-10">
            © {new Date().getFullYear()} FincaXpro — Todos los derechos reservados
          </p>
        </div>
      </div>

    </div>
  )
}
