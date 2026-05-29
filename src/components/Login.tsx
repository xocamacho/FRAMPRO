import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Mail, Lock, Leaf, BarChart3, Shield, Clock, ArrowRight } from 'lucide-react'

export function Login() {
  const { iniciarSesion } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState('')
  const [recordar, setRecordar] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await iniciarSesion(email, password)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(msg.includes('Invalid login') ? 'Email o contraseña incorrectos' : msg)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ÁREA PRINCIPAL */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{
          backgroundImage: `url('/campo-fondo.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
        }}
      >
        {/* Overlay gradiente izquierda para legibilidad del texto */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.55) 30%, rgba(255,255,255,0.1) 60%, transparent 100%)',
          }}
        />

        {/* GRID principal: izquierda + derecha */}
        <div className="relative z-10 h-full flex items-center justify-center lg:justify-between gap-6 px-4 sm:px-6 lg:px-12 lg:pr-48 py-6">

          {/* ══ COLUMNA IZQUIERDA ══ */}
          <div className="hidden lg:flex flex-col max-w-[430px] w-full pl-20">

            {/* Logo — posición independiente */}
            <div>
              <img
                src="/logo-fincaxpro-transparent.png"
                alt="FincaXpro"
                style={{ height: '130px', width: 'auto', marginTop: '-40px', marginBottom: '12px' }}
              />
            </div>

            {/* Bloque de texto — sube independiente del logo */}
            <div className="flex flex-col gap-4" style={{ marginTop: '-55px' }}>

            {/* Subtítulo */}
            <p
              className="text-sm font-semibold"
              style={{ color: '#2d7a3a', letterSpacing: '0.02em' }}
            >
              Gestión Ganadera Inteligente
            </p>

            {/* Headline */}
            <h1
              className="font-black leading-[1.1]"
              style={{ fontSize: '2.75rem', color: '#132b16', margin: '2px 0' }}
            >
              Administra tu<br />
              ganado, impulsa<br />
              tu{' '}
              <span style={{ color: '#2d7a3a' }}>producción.</span>
            </h1>

            {/* Descripción */}
            <p
              className="text-[14px] leading-relaxed"
              style={{ color: '#1c1c1c', fontWeight: 500 }}
            >
              FincaXpro te ayuda a llevar el control de tu<br />
              hato de forma fácil, eficiente y segura.
            </p>

            {/* Bullets */}
            <div className="flex flex-col gap-3.5 mt-1">
              {[
                { icon: <BarChart3 size={15} />, titulo: 'Control total',           desc: 'Registra y consulta información clave de tu ganado en tiempo real.' },
                { icon: <Shield    size={15} />, titulo: 'Datos seguros',            desc: 'Tu información está protegida con los más altos estándares de seguridad.' },
                { icon: <Clock     size={15} />, titulo: 'Decisiones inteligentes', desc: 'Reportes y estadísticas que te ayudan a tomar mejores decisiones.' },
              ].map(({ icon, titulo, desc }) => (
                <div key={titulo} className="flex items-start gap-3">
                  <div
                    className="rounded-full flex items-center justify-center shrink-0 shadow"
                    style={{ width: 36, height: 36, backgroundColor: '#2d7a3a' }}
                  >
                    <span className="text-white">{icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#132b16' }}>{titulo}</p>
                    <p className="text-xs leading-relaxed mt-0.5" style={{ color: '#2a2a2a' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            </div>{/* fin bloque texto */}
          </div>

          {/* ══ CARD DERECHA ══ */}
          <div
            className="w-full lg:w-[420px] lg:shrink-0 rounded-2xl flex flex-col gap-4"
            style={{
              maxWidth: '420px',
              backgroundColor: 'rgba(255,255,255,0.97)',
              boxShadow: '0 4px 32px rgba(0,0,0,0.13), 0 1px 8px rgba(0,0,0,0.07)',
              padding: '32px 28px',
            }}
          >
            {/* Logo móvil */}
            <div className="flex justify-center lg:hidden mb-1">
              <img src="/logo-fincaxpro-transparent.png" alt="FincaXpro" style={{ height: 56 }} />
            </div>

            {/* Header */}
            <div className="flex flex-col items-center text-center gap-1.5 mb-1">
              <div
                className="rounded-full flex items-center justify-center mb-2"
                style={{ width: 56, height: 56, backgroundColor: '#f0faf1', border: '1px solid #c6e6cb' }}
              >
                <Leaf size={26} style={{ color: '#2d7a3a' }} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: '#111827' }}>Bienvenido de nuevo</h2>
              <p className="text-sm" style={{ color: '#6b7280' }}>Ingresa a tu cuenta para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="tu@correo.com" required autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold" style={{ color: '#374151' }}>Contraseña</label>
                  <button type="button" className="text-xs font-medium hover:underline" style={{ color: '#2d7a3a' }}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••" required autoComplete="current-password"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Recordarme */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox" checked={recordar} onChange={e => setRecordar(e.target.checked)}
                  className="w-4 h-4 rounded accent-green-700"
                />
                <span className="text-sm" style={{ color: '#4b5563' }}>Recordarme</span>
              </label>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2.5">
                  {error}
                </div>
              )}

              {/* Botón ingresar */}
              <button
                type="submit" disabled={cargando}
                className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl transition-all shadow-md disabled:opacity-60 text-[15px] mt-1"
                style={{ backgroundColor: '#2d7a3a' }}
                onMouseOver={e => (e.currentTarget.style.backgroundColor = '#245f2d')}
                onMouseOut={e => (e.currentTarget.style.backgroundColor = '#2d7a3a')}
              >
                {cargando
                  ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Ingresando...</>
                  : <><span>Ingresar</span><ArrowRight size={16} /></>
                }
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* BARRA INFERIOR */}
      <div
        className="w-full flex items-center justify-center py-2.5"
        style={{ backgroundColor: '#f3faf4', borderTop: '1px solid #d1ead5' }}
      >
        <p className="text-xs" style={{ color: '#6b7280' }}>
          © {new Date().getFullYear()} FincaXpro — Gestión Ganadera Inteligente · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
