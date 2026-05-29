import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/services/supabase'
import { createClient } from '@supabase/supabase-js'

// Cliente separado para crear usuarios SIN afectar la sesión del admin
function crearClienteAuth() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } }
  )
}
import { useAuthStore } from '@/store/authStore'
import {
  Plus, Pencil, Trash2, Users, User, Shield, ShieldCheck,
  ShieldAlert, AlertTriangle, Mail, Phone, Calendar,
  Search, CheckCircle2, XCircle, Eye, EyeOff, Crown,
  UserCheck, UserX, MoreVertical, Key,
} from 'lucide-react'

// ── Constantes ──────────────────────────────────────────────────
const ROLES = [
  { v: 'admin',      l: 'Administrador', desc: 'Acceso total a todos los módulos', icon: <Crown size={14} />,       color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  { v: 'veterinario', l: 'Veterinario',  desc: 'Salud, reproducción, alertas',     icon: <ShieldCheck size={14} />, color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  { v: 'trabajador',  l: 'Trabajador',   desc: 'Tareas, leche, inventario',        icon: <User size={14} />,        color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  { v: 'lector',      l: 'Solo lectura', desc: 'Ver datos sin modificar',          icon: <Eye size={14} />,         color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200' },
]

const PERMISOS_DEFAULT: Record<string, Record<string, boolean>> = {
  admin:       { animales: true, potreros: true, leche: true, pesajes: true, reproduccion: true, salud: true, tareas: true, inventario: true, finanzas: true, alertas: true, metas: true, usuarios: true },
  veterinario: { animales: true, potreros: false, leche: false, pesajes: true, reproduccion: true, salud: true, tareas: true, inventario: true, finanzas: false, alertas: true, metas: false, usuarios: false },
  trabajador:  { animales: true, potreros: true, leche: true, pesajes: true, reproduccion: false, salud: false, tareas: true, inventario: true, finanzas: false, alertas: true, metas: false, usuarios: false },
  lector:      { animales: true, potreros: true, leche: true, pesajes: true, reproduccion: true, salud: true, tareas: true, inventario: true, finanzas: true, alertas: true, metas: true, usuarios: false },
}

const MODULOS_PERMISOS = [
  { k: 'animales',     l: 'Animales' },
  { k: 'potreros',     l: 'Potreros' },
  { k: 'leche',        l: 'Producción Leche' },
  { k: 'pesajes',      l: 'Pesajes' },
  { k: 'reproduccion', l: 'Reproducción' },
  { k: 'salud',        l: 'Salud' },
  { k: 'tareas',       l: 'Tareas' },
  { k: 'inventario',   l: 'Inventario' },
  { k: 'finanzas',     l: 'Finanzas' },
  { k: 'alertas',      l: 'Alertas' },
  { k: 'metas',        l: 'Metas' },
  { k: 'usuarios',     l: 'Usuarios' },
]

interface UsuarioFinca {
  id: string
  nombre: string
  email: string
  telefono?: string | null
  rol: string
  permisos?: Record<string, any> | null
  activo: boolean
  finca_id: string | null
  fecha_creacion?: string
}

function rolInfo(v: string) { return ROLES.find(r => r.v === v) ?? ROLES[3] }

function fmtFecha(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Componente ──────────────────────────────────────────────────
export function Usuarios() {
  const { finca, usuario: usuarioActual } = useAuthStore()

  const [usuarios, setUsuarios] = useState<UsuarioFinca[]>([])
  const [cargando, setCargando] = useState(true)
  const [tablaFaltante, setTablaFaltante] = useState(false)

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [eliminando, setEliminando] = useState<UsuarioFinca | null>(null)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState<string>('todos')
  const [filtroActivo, setFiltroActivo] = useState<string>('activos')

  // Campos formulario
  const [fNombre, setFNombre] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fPassword, setFPassword] = useState('')
  const [fMostrarPassword, setFMostrarPassword] = useState(false)
  const [fRol, setFRol] = useState('trabajador')
  const [fActivo, setFActivo] = useState(true)
  const [fPermisos, setFPermisos] = useState<Record<string, boolean>>({})
  const [permisosPersonalizados, setPermisosPersonalizados] = useState(false)

  // Modal cambiar contraseña
  const [modalPassword, setModalPassword] = useState<UsuarioFinca | null>(null)
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [cambiandoPassword, setCambiandoPassword] = useState(false)
  const [sinServiceRole, setSinServiceRole] = useState(false)

  // ═══ CARGA ═══
  async function cargar() {
    if (!finca?.id) { setCargando(false); return }
    setCargando(true)
    try {
      const { data, error: err } = await supabase
        .from('usuarios')
        .select('*')
        .eq('finca_id', finca.id)
        .order('fecha_creacion', { ascending: false })

      if (err) {
        if (err.code === '42P01' || err.message?.includes('does not exist')) {
          setTablaFaltante(true)
        }
        setCargando(false)
        return
      }
      setUsuarios(data ?? [])
      setTablaFaltante(false)
    } catch { /* */ }
    setCargando(false)
  }

  useEffect(() => { cargar() }, [finca?.id])

  // ═══ FORMULARIO ═══
  function limpiarForm() {
    setFNombre(''); setFEmail(''); setFPassword('')
    setFRol('trabajador'); setFActivo(true)
    setFPermisos({ ...PERMISOS_DEFAULT.trabajador })
    setPermisosPersonalizados(false)
    setEditandoId(null); setError(''); setSinServiceRole(false)
  }

  function abrirNuevo() {
    limpiarForm()
    setModalAbierto(true)
  }

  function abrirEditar(u: UsuarioFinca) {
    setEditandoId(u.id)
    setFNombre(u.nombre)
    setFEmail(u.email)
    setFRol(u.rol)
    setFActivo(u.activo)
    if (u.permisos && typeof u.permisos === 'object') {
      setFPermisos(u.permisos as Record<string, boolean>)
      // Comparar con defaults para ver si son personalizados
      const defaults = PERMISOS_DEFAULT[u.rol] ?? {}
      const esPersonalizado = Object.keys(defaults).some(k => (defaults[k] ?? false) !== ((u.permisos as any)[k] ?? false))
      setPermisosPersonalizados(esPersonalizado)
    } else {
      setFPermisos({ ...(PERMISOS_DEFAULT[u.rol] ?? PERMISOS_DEFAULT.lector) })
      setPermisosPersonalizados(false)
    }
    setError('')
    setModalAbierto(true)
  }

  function cambiarRol(nuevoRol: string) {
    setFRol(nuevoRol)
    if (!permisosPersonalizados) {
      setFPermisos({ ...(PERMISOS_DEFAULT[nuevoRol] ?? PERMISOS_DEFAULT.lector) })
    }
  }

  async function guardar() {
    if (!fNombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!fEmail.trim()) { setError('El email es obligatorio'); return }
    if (!editandoId && !fPassword.trim()) { setError('La contraseña es obligatoria para crear un usuario'); return }
    if (!editandoId && fPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (!finca?.id) return
    setGuardando(true); setError('')

    try {
      if (!editandoId) {
        // ── CREAR: intentar backend primero (confirma email automático) ──
        let userId: string | null = null
        let usóBackend = false

        try {
          const backendBase = import.meta.env.DEV ? 'http://localhost:3001' : ''
          const resp = await fetch(`${backendBase}/api/usuarios-crear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              finca_id: finca.id,
              nombre: fNombre.trim(),
              email: fEmail.trim().toLowerCase(),
              password: fPassword,
              rol: fRol,
              permisos: fPermisos,
            }),
          })
          const json = await resp.json()
          if (resp.ok) {
            // Backend creó el usuario completo (con entrada en usuarios table)
            usóBackend = true
            setSinServiceRole(false)
          } else if (resp.status !== 503) {
            // Error real del backend (email duplicado, etc)
            setError(json.error ?? 'Error al crear usuario')
            setGuardando(false); return
          }
          // 503 = sin service_role → caer al fallback
        } catch {
          // Servidor offline → caer al fallback
        }

        if (!usóBackend) {
          const tempClient = crearClienteAuth()
          const { data: authData, error: signUpErr } = await tempClient.auth.signUp({
            email: fEmail.trim().toLowerCase(),
            password: fPassword,
          })

          if (signUpErr) {
            const msg = signUpErr.message.toLowerCase()
            if (msg.includes('rate limit') || msg.includes('email rate')) {
              setError('RATE_LIMIT')
            } else if (msg.includes('already registered')) {
              setError('Ya existe una cuenta con ese email')
            } else {
              setError(signUpErr.message)
            }
            setGuardando(false); return
          }
          userId = authData.user?.id ?? null
          if (!userId) { setError('No se pudo crear el usuario'); setGuardando(false); return }

          // Función SECURITY DEFINER: bypasea RLS sin importar la sesión activa
          const { error: dbErr } = await supabase.rpc('configurar_usuario_nuevo', {
            p_user_id:  userId,
            p_finca_id: finca.id,
            p_nombre:   fNombre.trim(),
            p_rol:      fRol,
            p_activo:   true,
            p_permisos: fPermisos,
          })
          if (dbErr) {
            setError(dbErr.message)
            setGuardando(false); return
          }
          setSinServiceRole(true)
        }
      } else {
        // ── EDITAR (sin cambiar contraseña) ──
        const payload: any = {
          nombre: fNombre.trim(),
          email: fEmail.trim().toLowerCase(),
          rol: fRol,
          activo: fActivo,
          permisos: fPermisos,
        }
        const res = await supabase.from('usuarios').update(payload).eq('id', editandoId).select().single()
        if (res.error) {
          setError(res.error.message?.includes('unique') ? 'Ya existe un usuario con ese email' : res.error.message)
          setGuardando(false); return
        }
      }

      setModalAbierto(false)
      limpiarForm()
      requestAnimationFrame(() => cargar())
    } catch { setError('Error al guardar') }
    finally { setGuardando(false) }
  }

  async function cambiarPassword() {
    if (!modalPassword || !nuevaPassword.trim()) return
    if (nuevaPassword.length < 6) { return }
    setCambiandoPassword(true)

    try {
      const backendBase2 = import.meta.env.DEV ? 'http://localhost:3001' : ''
      const resp = await fetch(`${backendBase2}/api/usuarios-cambiar-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: modalPassword.id, nueva_password: nuevaPassword }),
      })
      const json = await resp.json()
      if (!resp.ok) {
        alert(json.error ?? 'Error al cambiar contraseña')
      } else {
        setModalPassword(null)
        setNuevaPassword('')
      }
    } catch { alert('Error al cambiar contraseña') }
    finally { setCambiandoPassword(false) }
  }

  async function confirmarEliminar() {
    if (!eliminando) return
    await supabase.from('usuarios').delete().eq('id', eliminando.id)
    setUsuarios(prev => prev.filter(u => u.id !== eliminando.id))
    setEliminando(null)
  }

  async function toggleActivo(u: UsuarioFinca) {
    await supabase.from('usuarios').update({ activo: !u.activo }).eq('id', u.id)
    cargar()
  }

  // ═══ FILTRADO ═══
  const usuariosFiltrados = usuarios.filter(u => {
    if (filtroRol !== 'todos' && u.rol !== filtroRol) return false
    if (filtroActivo === 'activos' && !u.activo) return false
    if (filtroActivo === 'inactivos' && u.activo) return false
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      if (!u.nombre.toLowerCase().includes(q) &&
          !u.email.toLowerCase().includes(q) &&
          !(u.telefono ?? '').includes(q)) return false
    }
    return true
  })

  // ═══ STATS ═══
  const stats = {
    total: usuarios.length,
    activos: usuarios.filter(u => u.activo).length,
    admins: usuarios.filter(u => u.rol === 'admin').length,
    trabajadores: usuarios.filter(u => u.rol === 'trabajador').length,
  }

  // ═══ TABLA FALTANTE ═══
  if (tablaFaltante) {
    const sql = `create table usuarios (
  id uuid primary key default gen_random_uuid(),
  finca_id uuid references fincas(id) on delete cascade not null,
  nombre text not null,
  email text not null,
  telefono text,
  rol text not null default 'trabajador',
  permisos jsonb default '{}',
  activo boolean default true,
  fecha_creacion timestamptz default now()
);
alter table usuarios enable row level security;
create policy "Acceso por finca" on usuarios for all using (
  finca_id in (select id from fincas where propietario_id = auth.uid())
);
-- Índice único para evitar duplicados por finca
create unique index usuarios_finca_email_idx on usuarios(finca_id, email);`

    return (
      <div className="p-6 flex flex-col gap-4">
        <Card>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={28} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Tabla "usuarios" no encontrada</h3>
              <p className="text-sm text-gray-500 mt-1">Ejecuta este SQL en Supabase &rarr; SQL Editor:</p>
            </div>
            <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg text-left overflow-x-auto w-full max-w-2xl whitespace-pre">
              {sql}
            </pre>
            <Button onClick={() => { setTablaFaltante(false); cargar() }}>
              Ya lo ejecuté — reintentar
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ═══ RENDER ═══
  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Usuarios</h2>
          <p className="text-sm text-gray-500">Administra el equipo y permisos de la finca</p>
        </div>
        <Button onClick={abrirNuevo}><Plus size={16} /> Agregar Usuario</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'Total',        v: stats.total,        icon: <Users size={18} />,       c: 'text-gray-700',  bg: 'bg-gray-50' },
          { l: 'Activos',      v: stats.activos,      icon: <UserCheck size={18} />,   c: 'text-green-700', bg: 'bg-green-50' },
          { l: 'Admins',       v: stats.admins,       icon: <Crown size={18} />,       c: 'text-amber-700', bg: 'bg-amber-50' },
          { l: 'Trabajadores', v: stats.trabajadores,  icon: <User size={18} />,        c: 'text-blue-700',  bg: 'bg-blue-50' },
        ].map(s => (
          <div key={s.l} className={`${s.bg} rounded-xl p-3 flex items-center gap-3`}>
            <div className={s.c}>{s.icon}</div>
            <div>
              <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
              <p className="text-xs text-gray-500">{s.l}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar usuario..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        </div>
        <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="todos">Todos los roles</option>
          {ROLES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {[
            { v: 'todos', l: 'Todos' },
            { v: 'activos', l: 'Activos' },
            { v: 'inactivos', l: 'Inactivos' },
          ].map(f => (
            <button key={f.v} onClick={() => setFiltroActivo(f.v)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${filtroActivo === f.v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {cargando ? (
        <Card>
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </Card>
      ) : usuariosFiltrados.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={28} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">
              {usuarios.length === 0 ? 'Sin usuarios — agrega al primero' : 'No hay usuarios con estos filtros'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {usuariosFiltrados.map(u => {
            const rol = rolInfo(u.rol)
            const esActual = u.email === usuarioActual?.email
            return (
              <div key={u.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${!u.activo ? 'opacity-60' : ''} ${esActual ? 'ring-2 ring-green-400' : 'border-gray-200'}`}>
                <div className="p-4">
                  {/* Header user */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold ${u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-900 truncate">{u.nombre}</p>
                        {esActual && (
                          <span className="text-[9px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">TÚ</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    {/* Menú */}
                    <div className="flex gap-1">
                      <button onClick={() => abrirEditar(u)}
                        className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                        <Pencil size={13} />
                      </button>
                      {!esActual && (
                        <button onClick={() => setEliminando(u)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rol badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${rol.bg} ${rol.color}`}>
                      {rol.icon} {rol.l}
                    </span>
                    {u.activo ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                        <CheckCircle2 size={10} /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                        <XCircle size={10} /> Inactivo
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                    {u.telefono && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={11} /> {u.telefono}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar size={11} /> Desde {fmtFecha(u.fecha_creacion)}
                    </div>
                  </div>

                  {/* Permisos resumen */}
                  {u.permisos && typeof u.permisos === 'object' && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {MODULOS_PERMISOS.filter(m => (u.permisos as any)[m.k]).slice(0, 6).map(m => (
                        <span key={m.k} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          {m.l}
                        </span>
                      ))}
                      {MODULOS_PERMISOS.filter(m => (u.permisos as any)[m.k]).length > 6 && (
                        <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                          +{MODULOS_PERMISOS.filter(m => (u.permisos as any)[m.k]).length - 6}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer rápido */}
                <div className="border-t border-gray-100 px-4 py-2 flex justify-between items-center">
                  <button
                    onClick={() => { setModalPassword(u); setNuevaPassword('') }}
                    className="text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    title="Cambiar contraseña"
                  >
                    <Key size={12} /> Contraseña
                  </button>
                  {!esActual && (
                    <button
                      onClick={() => toggleActivo(u)}
                      className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                        u.activo
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {u.activo ? <><UserX size={12} /> Desactivar</> : <><UserCheck size={12} /> Activar</>}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ MODAL CREAR/EDITAR ═══ */}
      <Modal abierto={modalAbierto} onCerrar={() => { setModalAbierto(false); limpiarForm() }}
        titulo={editandoId ? 'Editar Usuario' : 'Agregar Usuario'} tamano="xl">
        <div className="flex flex-col gap-4">
          {error === 'RATE_LIMIT' ? (
            <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-orange-800">Límite de emails alcanzado</p>
              </div>
              <p className="text-xs text-orange-700">
                Supabase limita los emails de confirmación (3/hora en plan gratuito). Para solucionarlo de forma permanente:
              </p>
              <ol className="text-xs text-orange-800 list-decimal list-inside space-y-1 font-medium">
                <li>Abre Supabase → <strong>Authentication → Providers → Email</strong></li>
                <li>Desactiva <strong>"Confirm email"</strong></li>
                <li>Guarda y vuelve a intentarlo</li>
              </ol>
              <a
                href="https://supabase.com/dashboard/project/pjgmptwniyztqedzbepz/auth/providers"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700 transition-colors text-center font-medium"
              >
                Abrir configuración en Supabase →
              </a>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle size={14} className="text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : null}

          {sinServiceRole && !editandoId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <strong>📧 Modo sin servidor:</strong> El usuario fue creado pero recibirá un <strong>email de confirmación</strong> antes de poder iniciar sesión.<br />
              Para evitar esto: en Supabase → <strong>Authentication → Providers → Email</strong> → desactiva <em>"Confirm email"</em>.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nombre completo *" placeholder="Ej: Juan Pérez"
              value={fNombre} onChange={e => setFNombre(e.target.value)}
              icono={<User size={14} />} />
            <Input label="Email *" type="email" placeholder="juan@correo.com"
              value={fEmail} onChange={e => setFEmail(e.target.value)}
              icono={<Mail size={14} />} />
          </div>

          {!editandoId && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Key size={13} /> Contraseña *
              </label>
              <div className="relative">
                <input
                  type={fMostrarPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={fPassword}
                  onChange={e => setFPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="button"
                  onClick={() => setFMostrarPassword(!fMostrarPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {fMostrarPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-gray-400">El trabajador usará este email y contraseña para iniciar sesión</p>
            </div>
          )}

          {/* Rol */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Rol</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <button key={r.v} onClick={() => cambiarRol(r.v)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    fRol === r.v
                      ? `${r.bg} ${r.color} ring-2 ring-green-400 ring-offset-1`
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}>
                  <span className="mt-0.5">{r.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{r.l}</p>
                    <p className="text-[10px] opacity-70">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Permisos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Key size={13} /> Permisos por módulo
              </label>
              <button
                onClick={() => {
                  if (permisosPersonalizados) {
                    setFPermisos({ ...(PERMISOS_DEFAULT[fRol] ?? PERMISOS_DEFAULT.lector) })
                  }
                  setPermisosPersonalizados(!permisosPersonalizados)
                }}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                  permisosPersonalizados
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {permisosPersonalizados ? 'Personalizado' : 'Por defecto del rol'}
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {MODULOS_PERMISOS.map(m => {
                const activo = fPermisos[m.k] ?? false
                return (
                  <button key={m.k}
                    onClick={() => {
                      if (!permisosPersonalizados) setPermisosPersonalizados(true)
                      setFPermisos(prev => ({ ...prev, [m.k]: !activo }))
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                      activo
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}
                  >
                    {activo ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {m.l}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Estado activo */}
          {editandoId && (
            <button
              onClick={() => setFActivo(!fActivo)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                fActivo
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {fActivo ? <UserCheck size={16} /> : <UserX size={16} />}
              <span>{fActivo ? 'Usuario activo' : 'Usuario inactivo'}</span>
              <span className={`ml-auto w-9 h-5 rounded-full transition-colors flex items-center ${fActivo ? 'bg-green-500 justify-end' : 'bg-red-400 justify-start'}`}>
                <span className="w-4 h-4 bg-white rounded-full shadow-sm mx-0.5" />
              </span>
            </button>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variante="secundario" onClick={() => { setModalAbierto(false); limpiarForm() }}>
              Cancelar
            </Button>
            <Button onClick={guardar} cargando={guardando}>
              {editandoId ? 'Guardar cambios' : 'Agregar usuario'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══ MODAL ELIMINAR ═══ */}
      <Modal abierto={!!eliminando} onCerrar={() => setEliminando(null)} titulo="Eliminar Usuario" tamano="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            ¿Eliminar a <strong>{eliminando?.nombre}</strong> ({eliminando?.email})?
            <br />
            <span className="text-xs text-gray-400">El usuario perderá todo acceso a la finca.</span>
          </p>
          <div className="flex justify-end gap-3">
            <Button variante="secundario" onClick={() => setEliminando(null)}>Cancelar</Button>
            <Button variante="peligro" onClick={confirmarEliminar}>Sí, eliminar</Button>
          </div>
        </div>
      </Modal>

      {/* ═══ MODAL CAMBIAR CONTRASEÑA ═══ */}
      <Modal abierto={!!modalPassword} onCerrar={() => { setModalPassword(null); setNuevaPassword('') }} titulo="Cambiar Contraseña" tamano="sm">
        {modalPassword && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Cambiar contraseña de <strong>{modalPassword.nombre}</strong>
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Nueva contraseña</label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={nuevaPassword}
                onChange={e => setNuevaPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {nuevaPassword.length > 0 && nuevaPassword.length < 6 && (
              <p className="text-xs text-red-500">Mínimo 6 caracteres</p>
            )}
            <div className="flex justify-end gap-3">
              <Button variante="secundario" onClick={() => { setModalPassword(null); setNuevaPassword('') }}>Cancelar</Button>
              <Button
                onClick={cambiarPassword}
                cargando={cambiandoPassword}
                disabled={nuevaPassword.length < 6}
              >
                <Key size={14} /> Cambiar contraseña
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
