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
        backgroundImage: `url('/campo-fondo.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
      }}
    >
      {/* Overlay izquierda para legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/50 via-white/15 to-transparent" />

      {/* Contenedor dos columnas */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-8 lg:px-14 flex items-center justify-between gap-10 py-10 min-h-screen">

        {/* ── IZQUIERDA ── */}
        <div className="hidden lg:flex flex-col flex-1 max-w-[520px] justify-center">

          {/* Logo */}
          <div className="mb-5">
            <img
              src="/logo-fincaxpro-transparent.png"
              alt="FincaXpro"
              className="h-28 w-auto"
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))' }}
            />
            <p
              className="font-semibold text-sm tracking-widest uppercase mt-1"
              style={{ color: '#2d7a3a', letterSpacing: '0.12em' }}
            >
              Gestión Ganadera Inteligente
            </p>
          </div>

          {/* Headline */}
          <h1
            className="font-black leading-[1.08] mb-4"
            style={{ fontSize: '3.2rem', color: '#162c19' }}
          >
            Administra tu<br />
            ganado, impulsa<br />
            tu{' '}
            <span style={{ color: '#2d7a3a' }}>producción.</span>
          </h1>

          {/* Descripción */}
          <p
            className="text-base leading-relaxed mb-8"
            style={{ color: '#2e2e2e', fontWeight: 400 }}
          >
            FincaXpro te ayuda a llevar el control de tu<br />
            hato de forma fácil, eficiente y segura.
          </p>

          {/* Bullets */}
          <div className="flex flex-col gap-5">
            {[
              { icon: <BarChart3 size={17} />, titulo: 'Control total',           desc: 'Registra y consulta información clave de tu ganado en tiempo real.' },
              { icon: <Shield    size={17} />, titulo: 'Datos seguros',            desc: 'Tu información está protegida con los más altos estándares de seguridad.' },
              { icon: <Clock     size={17} />, titulo: 'Decisiones inteligentes', desc: 'Reportes y estadísticas que te ayudan a tomar mejores decisiones.' },
            ].map(({ icon, titulo, desc }) => (
              <div key={titulo} className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow"
                  style={{ backgroundColor: '#2d7a3a' }}
                >
                  <span className="text-white">{icon}</span>
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#162c19' }}>{titulo}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#444' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CARD DERECHA ── */}
        <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl px-8 py-9 flex flex-col gap-4 my-auto">

          {/* Ícono hoja */}
          <div className="flex flex-col items-center gap-2 mb-1">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center border"
              style={{ backgroundColor: '#f0faf1', borderColor: '#d1ead4' }}
            >
              <Leaf size={28} style={{ color: '#2d7a3a' }} />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: '#111' }}>Bienvenido de nuevo</h2>
            <p className="text-sm" style={{ color: '#6b7280' }}>Ingresa a tu cuenta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': '#2d7a3a' } as React.CSSProperties}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #2d7a3a55'}
                  onBlur={e => e.target.style.boxShadow = ''}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold" style={{ color: '#374151' }}>Contraseña</label>
                <button type="button" className="text-xs font-medium" style={{ color: '#2d7a3a' }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none transition-all"
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #2d7a3a55'}
                  onBlur={e => e.target.style.boxShadow = ''}
                />
              </div>
            </div>

            {/* Recordarme */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recordar}
                onChange={e => setRecordar(e.target.checked)}
                className="w-4 h-4 rounded accent-green-700"
              />
              <span className="text-sm" style={{ color: '#4b5563' }}>Recordarme</span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl transition-all shadow-md disabled:opacity-60 text-base mt-1"
              style={{ backgroundColor: '#2d7a3a' }}
              onMouseOver={e => (e.currentTarget.style.backgroundColor = '#245f2d')}
              onMouseOut={e => (e.currentTarget.style.backgroundColor = '#2d7a3a')}
            >
              {cargando ? 'Ingresando...' : <><span>Ingresar</span><ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
