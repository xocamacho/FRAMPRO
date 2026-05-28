import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Tarea } from '@/types'
import {
  Plus, Pencil, Trash2, ClipboardList, CheckCircle2,
  Clock, AlertTriangle, Filter, Calendar, User,
  Flag, MessageSquare, Search, LayoutList, Columns3,
  UserCheck,
} from 'lucide-react'

// ── Constantes ──────────────────────────────────────────────────
const ESTADOS = [
  { v: 'pendiente',   l: 'Pendiente',   color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
  { v: 'en_progreso', l: 'En progreso', color: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-500' },
  { v: 'completada',  l: 'Completada',  color: 'bg-green-100 text-green-800',   dot: 'bg-green-500' },
  { v: 'cancelada',   l: 'Cancelada',   color: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400' },
]

const PRIORIDADES = [
  { v: 'baja',   l: 'Baja',   color: 'text-gray-500',  bg: 'bg-gray-50 border-gray-200' },
  { v: 'media',  l: 'Media',  color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  { v: 'alta',   l: 'Alta',   color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  { v: 'urgente', l: 'Urgente', color: 'text-red-600',   bg: 'bg-red-50 border-red-200' },
]

function estadoInfo(v: string) { return ESTADOS.find(e => e.v === v) ?? ESTADOS[0] }
function prioridadInfo(v: string) { return PRIORIDADES.find(p => p.v === v) ?? PRIORIDADES[0] }

function fmtFecha(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function esVencida(t: Tarea) {
  if (!t.fecha_vencimiento || t.estado === 'completada' || t.estado === 'cancelada') return false
  return new Date(t.fecha_vencimiento + 'T23:59:59') < new Date()
}

// ── Componente ──────────────────────────────────────────────────
export function Tareas() {
  const { finca, usuario } = useAuthStore()
  const HOY = new Date().toISOString().slice(0, 10)

  const [tareas, setTareas] = useState<Tarea[]>([])
  const [cargando, setCargando] = useState(true)
  const [tablaFaltante, setTablaFaltante] = useState(false)

  // Usuarios de la finca
  const [usuariosFinca, setUsuariosFinca] = useState<{ id: string; nombre: string }[]>([])

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [eliminando, setEliminando] = useState<Tarea | null>(null)

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<'lista' | 'kanban'>('lista')

  // Campos del formulario
  const [fTitulo, setFTitulo] = useState('')
  const [fDescripcion, setFDescripcion] = useState('')
  const [fAsignado, setFAsignado] = useState('')
  const [fEsPropia, setFEsPropia] = useState(false)
  const [fEstado, setFEstado] = useState('pendiente')
  const [fPrioridad, setFPrioridad] = useState('media')
  const [fVencimiento, setFVencimiento] = useState('')
  const [fNotas, setFNotas] = useState('')

  // ═══ CARGA ═══
  async function cargar() {
    if (!finca?.id) { setCargando(false); return }
    setCargando(true)
    try {
      const { data, error: err } = await supabase
        .from('tareas')
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
      setTareas(data ?? [])
      setTablaFaltante(false)
    } catch { /* red */ }
    setCargando(false)
  }

  async function cargarUsuarios() {
    if (!finca?.id) return
    try {
      const { data } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('finca_id', finca.id)
        .eq('activo', true)
        .order('nombre')
      setUsuariosFinca(data ?? [])
    } catch {
      // Tabla puede no existir
    }
  }

  useEffect(() => { cargar(); cargarUsuarios() }, [finca?.id])

  // ═══ FORMULARIO ═══
  function limpiarForm() {
    setFTitulo(''); setFDescripcion(''); setFAsignado('')
    setFEsPropia(false)
    setFEstado('pendiente'); setFPrioridad('media')
    setFVencimiento(''); setFNotas('')
    setEditandoId(null); setError('')
  }

  function abrirNuevo() {
    limpiarForm()
    setModalAbierto(true)
  }

  function abrirEditar(t: Tarea) {
    setEditandoId(t.id)
    setFTitulo(t.titulo)
    setFDescripcion(t.descripcion ?? '')
    // Determinar si es tarea propia
    const nombreUsuario = usuario?.nombre ?? ''
    if (t.asignado_a === nombreUsuario || t.asignado_a === 'Yo' || !t.asignado_a) {
      setFEsPropia(!t.asignado_a || t.asignado_a === nombreUsuario || t.asignado_a === 'Yo')
      setFAsignado('')
    } else {
      setFEsPropia(false)
      setFAsignado(t.asignado_a ?? '')
    }
    setFEstado(t.estado)
    setFPrioridad(t.prioridad ?? 'media')
    setFVencimiento(t.fecha_vencimiento ?? '')
    setFNotas(t.notas_completacion ?? '')
    setError('')
    setModalAbierto(true)
  }

  async function guardar() {
    if (!fTitulo.trim()) { setError('El título es obligatorio'); return }
    if (!finca?.id) return
    setGuardando(true); setError('')

    const asignadoFinal = fEsPropia
      ? (usuario?.nombre ?? 'Yo')
      : (fAsignado.trim() || null)

    const payload: any = {
      finca_id: finca.id,
      titulo: fTitulo.trim(),
      descripcion: fDescripcion.trim() || null,
      asignado_a: asignadoFinal,
      estado: fEstado,
      prioridad: fPrioridad,
      fecha_vencimiento: fVencimiento || null,
      notas_completacion: fNotas.trim() || null,
    }

    if (fEstado === 'completada' && !payload.fecha_completacion) {
      payload.fecha_completacion = HOY
    }

    if (!editandoId) {
      payload.creado_por = usuario?.id ?? 'sistema'
    }

    try {
      const res = editandoId
        ? await supabase.from('tareas').update(payload).eq('id', editandoId).select().single()
        : await supabase.from('tareas').insert([payload]).select().single()

      if (res.error) { setError(res.error.message) }
      else {
        setModalAbierto(false)
        limpiarForm()
        requestAnimationFrame(() => cargar())
      }
    } catch { setError('Error al guardar') }
    finally { setGuardando(false) }
  }

  async function confirmarEliminar() {
    if (!eliminando) return
    await supabase.from('tareas').delete().eq('id', eliminando.id)
    setTareas(prev => prev.filter(t => t.id !== eliminando.id))
    setEliminando(null)
  }

  async function cambiarEstado(tarea: Tarea, nuevoEstado: string) {
    const update: any = { estado: nuevoEstado }
    if (nuevoEstado === 'completada') update.fecha_completacion = HOY
    else update.fecha_completacion = null

    await supabase.from('tareas').update(update).eq('id', tarea.id)
    cargar()
  }

  // ═══ FILTRADO ═══
  const tareasFiltradas = tareas.filter(t => {
    if (filtroEstado !== 'todos' && t.estado !== filtroEstado) return false
    if (filtroPrioridad !== 'todos' && t.prioridad !== filtroPrioridad) return false
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      if (!t.titulo.toLowerCase().includes(q) &&
          !(t.descripcion ?? '').toLowerCase().includes(q) &&
          !(t.asignado_a ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  // ═══ STATS ═══
  const stats = {
    total: tareas.length,
    pendientes: tareas.filter(t => t.estado === 'pendiente').length,
    enProgreso: tareas.filter(t => t.estado === 'en_progreso').length,
    completadas: tareas.filter(t => t.estado === 'completada').length,
    vencidas: tareas.filter(t => esVencida(t)).length,
  }

  // ═══ TABLA FALTANTE ═══
  if (tablaFaltante) {
    const sql = `create table tareas (
  id uuid primary key default gen_random_uuid(),
  finca_id uuid references fincas(id) on delete cascade not null,
  titulo text not null,
  descripcion text,
  asignado_a text,
  creado_por text not null default 'sistema',
  estado text not null default 'pendiente',
  prioridad text default 'media',
  fecha_vencimiento date,
  foto_evidencia_url text,
  notas_completacion text,
  fecha_completacion date,
  fecha_creacion timestamptz default now()
);
alter table tareas enable row level security;
create policy "Acceso por finca" on tareas for all using (
  finca_id in (select id from fincas where propietario_id = auth.uid())
);`

    return (
      <div className="p-6 flex flex-col gap-4">
        <Card>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={28} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Tabla "tareas" no encontrada</h3>
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
          <h2 className="text-lg font-bold text-gray-900">Tareas</h2>
          <p className="text-sm text-gray-500">Asigna y da seguimiento a las tareas del campo</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setVista('lista')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${vista === 'lista' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              <LayoutList size={13} /> Lista
            </button>
            <button onClick={() => setVista('kanban')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${vista === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              <Columns3 size={13} /> Kanban
            </button>
          </div>
          <Button onClick={abrirNuevo}><Plus size={16} /> Nueva Tarea</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { l: 'Total',       v: stats.total,       icon: <ClipboardList size={18} />, c: 'text-gray-700',  bg: 'bg-gray-50' },
          { l: 'Pendientes',  v: stats.pendientes,  icon: <Clock size={18} />,         c: 'text-yellow-700', bg: 'bg-yellow-50' },
          { l: 'En progreso', v: stats.enProgreso,  icon: <Flag size={18} />,          c: 'text-blue-700',  bg: 'bg-blue-50' },
          { l: 'Completadas', v: stats.completadas,  icon: <CheckCircle2 size={18} />,  c: 'text-green-700', bg: 'bg-green-50' },
          { l: 'Vencidas',    v: stats.vencidas,     icon: <AlertTriangle size={18} />, c: 'text-red-700',   bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.l} className={`${s.bg} rounded-xl p-3 flex items-center gap-3`}>
            <div className={`${s.c}`}>{s.icon}</div>
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
            placeholder="Buscar tarea..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-gray-400" />
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="todos">Todos los estados</option>
            {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.l}</option>)}
          </select>
          <select value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="todos">Todas las prioridades</option>
            {PRIORIDADES.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
        </div>
      </div>

      {/* Cargando */}
      {cargando ? (
        <Card>
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </Card>
      ) : tareasFiltradas.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList size={28} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">
              {tareas.length === 0 ? 'Sin tareas — crea la primera' : 'No hay tareas con estos filtros'}
            </p>
          </div>
        </Card>
      ) : vista === 'lista' ? (
        /* ═══ VISTA LISTA ═══ */
        <Card padding="none">
          {/* Encabezado tabla */}
          <div className="hidden sm:grid grid-cols-[1fr_120px_100px_110px_100px_70px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Tarea</span>
            <span>Asignado</span>
            <span>Prioridad</span>
            <span>Vencimiento</span>
            <span>Estado</span>
            <span></span>
          </div>
          {tareasFiltradas.map(t => {
            const est = estadoInfo(t.estado)
            const pri = prioridadInfo(t.prioridad ?? 'media')
            const vencida = esVencida(t)
            return (
              <div key={t.id}
                className={`grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_110px_100px_70px] gap-2 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors items-center ${vencida ? 'bg-red-50/30' : ''}`}>
                {/* Título + descripción */}
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${t.estado === 'completada' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {t.titulo}
                  </p>
                  {t.descripcion && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{t.descripcion}</p>
                  )}
                </div>
                {/* Asignado */}
                <div className="flex items-center gap-1.5">
                  <User size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-600 truncate">{t.asignado_a || '—'}</span>
                </div>
                {/* Prioridad */}
                <div>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${pri.bg} ${pri.color}`}>
                    <Flag size={10} /> {pri.l}
                  </span>
                </div>
                {/* Vencimiento */}
                <div className="flex items-center gap-1">
                  <Calendar size={12} className={vencida ? 'text-red-500' : 'text-gray-400'} />
                  <span className={`text-xs ${vencida ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                    {fmtFecha(t.fecha_vencimiento)}
                  </span>
                </div>
                {/* Estado dropdown */}
                <div>
                  <select value={t.estado}
                    onChange={e => cambiarEstado(t, e.target.value)}
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${est.color}`}>
                    {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.l}</option>)}
                  </select>
                </div>
                {/* Acciones */}
                <div className="flex gap-1 justify-end">
                  <button onClick={() => abrirEditar(t)}
                    className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setEliminando(t)}
                    className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </Card>
      ) : (
        /* ═══ VISTA KANBAN ═══ */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ESTADOS.filter(e => e.v !== 'cancelada').map(col => {
            const enColumna = tareasFiltradas.filter(t => t.estado === col.v)
            return (
              <div key={col.v} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                  <span className="text-sm font-bold text-gray-800">{col.l}</span>
                  <span className="text-xs text-gray-400 ml-auto">{enColumna.length}</span>
                </div>
                <div className="flex flex-col gap-2 min-h-[100px] bg-gray-50/50 rounded-xl p-2">
                  {enColumna.length === 0 && (
                    <p className="text-xs text-gray-300 text-center py-6">Sin tareas</p>
                  )}
                  {enColumna.map(t => {
                    const pri = prioridadInfo(t.prioridad ?? 'media')
                    const vencida = esVencida(t)
                    return (
                      <div key={t.id}
                        className={`bg-white rounded-lg border shadow-sm p-3 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow ${vencida ? 'border-red-200' : 'border-gray-200'}`}
                        onClick={() => abrirEditar(t)}>
                        <p className="text-sm font-semibold text-gray-900 leading-tight">{t.titulo}</p>
                        {t.descripcion && (
                          <p className="text-xs text-gray-400 line-clamp-2">{t.descripcion}</p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${pri.bg} ${pri.color}`}>
                            <Flag size={8} /> {pri.l}
                          </span>
                          {t.fecha_vencimiento && (
                            <span className={`text-[10px] flex items-center gap-0.5 ${vencida ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                              <Calendar size={9} /> {fmtFecha(t.fecha_vencimiento)}
                            </span>
                          )}
                        </div>
                        {t.asignado_a && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-green-700">
                                {t.asignado_a.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500">{t.asignado_a}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {/* Canceladas colapsadas */}
          {(() => {
            const canceladas = tareasFiltradas.filter(t => t.estado === 'cancelada')
            if (canceladas.length === 0) return null
            return (
              <div className="sm:col-span-2 lg:col-span-4">
                <details className="bg-gray-50 rounded-xl p-2">
                  <summary className="text-xs font-semibold text-gray-400 cursor-pointer px-2 py-1">
                    Canceladas ({canceladas.length})
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
                    {canceladas.map(t => (
                      <div key={t.id}
                        className="bg-white rounded-lg border border-gray-200 p-3 opacity-60 cursor-pointer hover:opacity-80"
                        onClick={() => abrirEditar(t)}>
                        <p className="text-sm font-semibold text-gray-500 line-through">{t.titulo}</p>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )
          })()}
        </div>
      )}

      {/* ═══ MODAL CREAR/EDITAR ═══ */}
      <Modal abierto={modalAbierto} onCerrar={() => { setModalAbierto(false); limpiarForm() }}
        titulo={editandoId ? 'Editar Tarea' : 'Nueva Tarea'} tamano="lg">
        <div className="flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle size={14} className="text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Input label="Título *" placeholder="Ej: Vacunar lote norte" value={fTitulo}
            onChange={e => setFTitulo(e.target.value)} />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
            <textarea value={fDescripcion} onChange={e => setFDescripcion(e.target.value)}
              placeholder="Detalla qué se debe hacer..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none" />
          </div>

          {/* ═══ ASIGNACIÓN ═══ */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Asignar a</label>

            {/* Toggle tarea propia */}
            <button
              type="button"
              onClick={() => { setFEsPropia(!fEsPropia); if (!fEsPropia) setFAsignado('') }}
              className={`mb-3 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all w-full ${
                fEsPropia
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <UserCheck size={16} />
              <span>Tarea propia (para mí)</span>
              <span className={`ml-auto w-9 h-5 rounded-full transition-colors flex items-center ${fEsPropia ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}>
                <span className="w-4 h-4 bg-white rounded-full shadow-sm mx-0.5" />
              </span>
            </button>

            {/* Selector de persona */}
            {!fEsPropia && (
              <div className="flex flex-col gap-2">
                {usuariosFinca.length > 0 ? (
                  <select
                    value={fAsignado}
                    onChange={e => setFAsignado(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar persona...</option>
                    {usuariosFinca.map(u => (
                      <option key={u.id} value={u.nombre}>{u.nombre}</option>
                    ))}
                    <option value="__otro__">Otro (escribir nombre)</option>
                  </select>
                ) : null}

                {/* Si no hay usuarios o eligió "Otro", mostrar input */}
                {(usuariosFinca.length === 0 || fAsignado === '__otro__') && (
                  <input
                    type="text"
                    value={fAsignado === '__otro__' ? '' : fAsignado}
                    onChange={e => setFAsignado(e.target.value)}
                    placeholder="Nombre del responsable"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                )}

                {/* Si no hay usuarios registrados, mostrar hint */}
                {usuariosFinca.length === 0 && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <User size={10} /> Sin usuarios registrados — escribe el nombre directamente
                  </p>
                )}
              </div>
            )}
          </div>

          <Input label="Fecha vencimiento" type="date"
            value={fVencimiento} onChange={e => setFVencimiento(e.target.value)}
            icono={<Calendar size={14} />} />

          {/* Prioridad */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Prioridad</label>
            <div className="flex gap-2">
              {PRIORIDADES.map(p => (
                <button key={p.v} onClick={() => setFPrioridad(p.v)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                    fPrioridad === p.v
                      ? `${p.bg} ${p.color} ring-2 ring-offset-1 ring-green-400`
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}>
                  <Flag size={12} /> {p.l}
                </button>
              ))}
            </div>
          </div>

          {/* Estado (solo al editar) */}
          {editandoId && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Estado</label>
              <div className="flex gap-2">
                {ESTADOS.map(e => (
                  <button key={e.v} onClick={() => setFEstado(e.v)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                      fEstado === e.v
                        ? `${e.color} ring-2 ring-offset-1 ring-green-400`
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${e.dot}`} /> {e.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              <MessageSquare size={13} className="inline mr-1" />
              Notas adicionales
            </label>
            <textarea value={fNotas} onChange={e => setFNotas(e.target.value)}
              placeholder="Observaciones, notas de completación..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none" />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variante="secundario" onClick={() => { setModalAbierto(false); limpiarForm() }}>
              Cancelar
            </Button>
            <Button onClick={guardar} cargando={guardando}>
              {editandoId ? 'Guardar cambios' : 'Crear tarea'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══ MODAL ELIMINAR ═══ */}
      <Modal abierto={!!eliminando} onCerrar={() => setEliminando(null)} titulo="Eliminar Tarea" tamano="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">¿Eliminar <strong>{eliminando?.titulo}</strong>? No se puede deshacer.</p>
          <div className="flex justify-end gap-3">
            <Button variante="secundario" onClick={() => setEliminando(null)}>Cancelar</Button>
            <Button variante="peligro" onClick={confirmarEliminar}>Sí, eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
