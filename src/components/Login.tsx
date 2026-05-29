import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Mail, Lock, Leaf, BarChart3, Shield, Clock, ArrowRight } from 'lucide-react'

export function Login() {
  const { iniciarSesion } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState('')
  const [recordar, setRecordar] = useState(false)

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
    <div
      className="min-h-screen w-full relative flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1600&q=90')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 55%',
      }}
    >
      {/* Overlay suave para legibilidad del texto izquierdo */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-white/10 to-transparent" />

      {/* Decoración hojas */}
      <img
        src="https://www.svgrepo.com/show/530588/leaf.svg"
        alt=""
        className="absolute top-0 right-0 w-48 opacity-20 -rotate-12 pointer-events-none select-none"
      />
      <img
        src="https://www.svgrepo.com/show/530588/leaf.svg"
        alt=""
        className="absolute bottom-0 right-16 w-36 opacity-15 rotate-45 pointer-events-none select-none"
      />

      {/* Contenedor principal — dos columnas */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-8 py-10">

        {/* ─── COLUMNA IZQUIERDA ─── */}
        <div className="hidden lg:flex flex-col flex-1 max-w-lg">

          {/* Logo */}
          <div className="mb-6">
            <img
              src="/logo-fincaxpro-transparent.png"
              alt="FincaXpro"
              className="h-28 w-auto drop-shadow-md"
            />
            <p className="text-green-700 font-bold text-sm tracking-widest uppercase mt-1">
              Gestión Ganadera Inteligente
            </p>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-black leading-[1.1] mb-4 drop-shadow-sm" style={{ color: '#1a2e05' }}>
            Administra tu<br />
            ganado, impulsa<br />
            tu{' '}
            <span className="text-green-600">producción.</span>
          </h1>

          {/* Descripción */}
          <p className="text-gray-800 text-base leading-relaxed mb-8 font-medium">
            FincaXpro te ayuda a llevar el control de tu<br />
            hato de forma fácil, eficiente y segura.
          </p>

          {/* Bullets */}
          <div className="flex flex-col gap-5">
            {[
              { icon: <BarChart3 size={18} />, titulo: 'Control total',           desc: 'Registra y consulta información clave de tu ganado en tiempo real.' },
              { icon: <Shield    size={18} />, titulo: 'Datos seguros',            desc: 'Tu información está protegida con los más altos estándares de seguridad.' },
              { icon: <Clock     size={18} />, titulo: 'Decisiones inteligentes', desc: 'Reportes y estadísticas que te ayudan a tomar mejores decisiones.' },
            ].map(({ icon, titulo, desc }) => (
              <div key={titulo} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-green-600/90 flex items-center justify-center text-white shrink-0 shadow">
                  {icon}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">{titulo}</p>
                  <p className="text-gray-700 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── CARD DERECHA ─── */}
        <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl px-8 py-9 flex flex-col gap-5">

          {/* Ícono hoja */}
          <div className="flex flex-col items-center gap-2 mb-1">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center shadow-sm border border-green-100">
              <Leaf size={28} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Bienvenido de nuevo</h2>
            <p className="text-sm text-gray-500">Ingresa a tu cuenta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">Contraseña</label>
                <button type="button" className="text-xs text-green-600 hover:text-green-700 font-medium">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Recordarme */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recordar}
                onChange={e => setRecordar(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 accent-green-600"
              />
              <span className="text-sm text-gray-600">Recordarme</span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Botón ingresar */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-3 rounded-xl transition-all shadow-md disabled:opacity-60 text-base"
            >
              {cargando ? 'Ingresando...' : <><span>Ingresar</span><ArrowRight size={18} /></>}
            </button>
          </form>

          {/* Separador social */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">o continúa con</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Botones sociales */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex items-center justify-center gap-2 border border-gray-300 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {/* Google icon */}
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.2 30.3 0 24 0 14.8 0 6.9 5.4 3 13.3l7.9 6.1C12.7 13.2 17.9 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
                <path fill="#FBBC05" d="M10.9 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.4 13.3A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.4 10.6l8.5-6z"/>
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.1 0-11.3-3.7-13.1-8.9l-8.5 6C6.9 42.6 14.8 48 24 48z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 border border-gray-300 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {/* Microsoft icon */}
              <svg width="18" height="18" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
              Microsoft
            </button>
          </div>

          {/* Solicita acceso */}
          <p className="text-center text-sm text-gray-500">
            ¿No tienes cuenta?{' '}
            <span className="text-green-600 font-semibold cursor-pointer hover:text-green-700">
              Solicita acceso
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
