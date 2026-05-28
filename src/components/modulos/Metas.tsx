import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Meta as MetaType } from '@/types'
import {
  Plus, Pencil, Trash2, Target, AlertTriangle, Trophy,
  TrendingUp, Calendar, CheckCircle2, Clock, Flame,
  Milk, DollarSign, Scale, Baby, Wheat, BarChart3,
} from 'lucide-react'

// ── Constantes ──────────────────────────────────────────────────
const TIPOS_META = [
  { v: 'produccion_leche', l: 'Producción de leche',   icon: <Milk size={15} />,       unidad: 'litros/mes',  color: 'text-amber-600',  bg: 'bg-amber-50' },
  { v: 'ingresos',         l: 'Ingresos',              icon: <DollarSign size={15} />,  unidad: '$/mes',       color: 'text-green-600',  bg: 'bg-green-50' },
  { v: 'peso_ganado',      l: 'Peso del ganado',       icon: <Scale size={15} />,       unidad: 'kg promedio', color: 'text-blue-600',   bg: 'bg-blue-50' },
  { v: 'nacimientos',      l: 'Nacimientos',           icon: <Baby size={15} />,        unidad: 'crías',       color: 'text-pink-600',   bg: 'bg-pink-50' },
  { v: 'hectareas',        l: 'Hectáreas productivas', icon: <Wheat size={15} />,       unidad: 'ha',          color: 'text-lime-600',   bg: 'bg-lime-50' },
  { v: 'animales',         l: 'Cantidad de animales',  icon: <BarChart3 size={15} />,   unidad: 'cabezas',     color: 'text-purple-600', bg: 'bg-purple-50' },
  { v: 'otro',             l: 'Otra meta',             icon: <Target size={15} />,      unidad: '',            color: 'text-gray-600',   bg: 'bg-gray-50' },
]

function tipoInfo(v: string | null) { return TIPOS_META.find(t => t.v === v) ?? TIPOS_META[6] }
function n(v: unknown): number { return Number(v) || 0 }

function fmtFecha(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function progreso(meta: MetaType): number {
  const objetivo = n(meta.valor_meta)
  if (objetivo <= 0) return 0
  return Math.min(100, (n(meta.valor_actual) / objetivo) * 100)
}

function estadoMeta(meta: MetaType): 'completada' | 'en_progreso' | 'vencida' | 'sin_iniciar' {
  const pct = progreso(meta)
  if (pct >= 100) return 'completada'
  if (meta.fecha_fin) {
    const dias = Math.ceil((new Date(meta.fecha_fin + 'T23:59:59').getTime() - Date.now()) / 86_400_000)
    if (dias < 0) return 'vencida'
  }
  if (n(meta.valor_actual) > 0) return 'en_progreso'
  return 'sin_iniciar'
}

function diasRestantes(meta: MetaType): number | null {
  if (!meta.fecha_fin) return null
  return Math.ceil((new Date(meta.fecha_fin + 'T23:59:59').getTime() - Date.now()) / 86_400_000)
}

// ── Componente ──────────────────────────────────────────────────
export function Metas() {
  const { finca } = useAuthStore()
  const HOY = new Date().toISOString().slice(0, 10)

  const [metas, setMetas] = useState<MetaType[]>([])
  const [cargando, setCargando] = useState(true)
  const [tablaFaltante, setTablaFaltante] = useState(false)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [eliminando, setEliminando] = useState<MetaType | null>(null)

  // Modal de actualizar progreso
  const [actualizando, setActualizando] = useState<MetaType | null>(null)
  const [nuevoValor, setNuevoValor] = useState('')

  const [filtro, setFiltro] = useState<'todas' | 'activas' | 'completadas' | 'vencidas'>('todas')

  // Campos formulario
  const [fNombre, setFNombre] = useState('')
  const [fTipo, setFTipo] = useState('produccion_leche')
  const [fValorMeta, setFValorMeta] = useState('')
  const [fValorActual, setFValorActual] = useState('')
  const [fFechaInicio, setFFechaInicio] = useState(HOY)
  const [fFechaFin, setFFechaFin] = useState('')

  // ═══ CARGA ═══
  async function cargar() {
    if (!finca?.id) { setCargando(false); return }
    setCargando(true)
    try {
      const { data, error: err } = await supabase
        .from('metas')
        .select('*')
        .eq('finca_id', finca.id)
        .order('fecha_creacion', { ascending: false })

      if (err) {
        if (err.code === '42P01' || err.message?.includes('does not exist')) setTablaFaltante(true)
        setCargando(false); return
      }
      setMetas(data ?? [])
      setTablaFaltante(false)
    } catch { /* */ }
    setCargando(false)
  }
  useEffect(() => { cargar() }, [finca?.id])

  // ═══ FORMULARIO ═══
  function limpiarForm() {
    setFNombre(''); setFTipo('produccion_leche'); setFValorMeta('')
    setFValorActual(''); setFFechaInicio(HOY); setFFechaFin('')
    setEditandoId(null); setError('')
  }

  function abrirNuevo() { limpiarForm(); setModalAbierto(true) }

  function abrirEditar(m: MetaType) {
    setEditandoId(m.id)
    setFNombre(m.nombre)
    setFTipo(m.tipo ?? 'otro')
    setFValorMeta(m.valor_meta != null ? String(m.valor_meta) : '')
    setFValorActual(m.valor_actual != null ? String(m.valor_actual) : '')
    setFFechaInicio(m.fecha_inicio ?? '')
    setFFechaFin(m.fecha_fin ?? '')
    setError(''); setModalAbierto(true)
  }

  async function guardar() {
    if (!fNombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!fValorMeta || Number(fValorMeta) <= 0) { setError('El valor objetivo es obligatorio'); return }
    if (!finca?.id) return
    setGuardando(true); setError('')

    const payload: any = {
      finca_id: finca.id,
      nombre: fNombre.trim(),
      tipo: fTipo,
      valor_meta: Number(fValorMeta),
      valor_actual: fValorActual ? Number(fValorActual) : 0,
      fecha_inicio: fFechaInicio || null,
      fecha_fin: fFechaFin || null,
    }

    try {
      const res = editandoId
        ? await supabase.from('metas').update(payload).eq('id', editandoId).select().single()
        : await supabase.from('metas').insert([payload]).select().single()

      if (res.error) { setError(res.error.message) }
      else {
        setModalAbierto(false); limpiarForm()
        requestAnimationFrame(() => cargar())
      }
    } catch { setError('Error al guardar') }
    finally { setGuardando(false) }
  }

  async function confirmarEliminar() {
    if (!eliminando) return
    await supabase.from('metas').delete().eq('id', eliminando.id)
    setMetas(prev => prev.filter(m => m.id !== eliminando.id))
    setEliminando(null)
  }

  async function guardarProgreso() {
    if (!actualizando || !nuevoValor) return
    await supabase.from('metas').update({ valor_actual: Number(nuevoValor) }).eq('id', actualizando.id)
    setActualizando(null); setNuevoValor('')
    requestAnimationFrame(() => cargar())
  }

  // ═══ FILTRADO ═══
  const metasFiltradas = metas.filter(m => {
    const est = estadoMeta(m)
    if (filtro === 'activas') return est === 'en_progreso' || est === 'sin_iniciar'
    if (filtro === 'completadas') return est === 'completada'
    if (filtro === 'vencidas') return est === 'vencida'
    return true
  })

  // Stats
  const stats = {
    total: metas.length,
    completadas: metas.filter(m => estadoMeta(m) === 'completada').length,
    enProgreso: metas.filter(m => estadoMeta(m) === 'en_progreso').length,
    vencidas: metas.filter(m => estadoMeta(m) === 'vencida').length,
    promedioProgreso: metas.length > 0 ? metas.reduce((s, m) => s + progreso(m), 0) / metas.length : 0,
  }

  // ═══ TABLA FALTANTE ═══
  if (tablaFaltante) {
    const sql = `create table metas (
  id uuid primary key default gen_random_uuid(),
  finca_id uuid references fincas(id) on delete cascade not null,
  nombre text not null,
  tipo text,
  valor_meta numeric(14,2),
  valor_actual numeric(14,2) default 0,
  fecha_inicio date,
  fecha_fin date,
  fecha_creacion timestamptz default now()
);
alter table metas enable row level security;
create policy "Acceso por finca" on metas for all using (
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
              <h3 className="font-bold text-gray-900">Tabla "metas" no encontrada</h3>
              <p className="text-sm text-gray-500 mt-1">Ejecuta este SQL en Supabase → SQL Editor:</p>
            </div>
            <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg text-left overflow-x-auto w-full max-w-2xl whitespace-pre">{sql}</pre>
            <Button onClick={() => { setTablaFaltante(false); cargar() }}>Ya lo ejecuté — reintentar</Button>
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
          <h2 className="text-lg font-bold text-gray-900">Metas de la Finca</h2>
          <p className="text-sm text-gray-500">Define y rastrea tus objetivos productivos</p>
        </div>
        <Button onClick={abrirNuevo}><Plus size={16} /> Nueva Meta</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { l: 'Total',      v: stats.total,       icon: <Target size={18} />,       c: 'text-gray-700',  bg: 'bg-gray-50' },
          { l: 'En progreso', v: stats.enProgreso, icon: <Flame size={18} />,        c: 'text-blue-700',  bg: 'bg-blue-50' },
          { l: 'Completadas', v: stats.completadas, icon: <Trophy size={18} />,       c: 'text-green-700', bg: 'bg-green-50' },
          { l: 'Vencidas',    v: stats.vencidas,    icon: <AlertTriangle size={18} />, c: 'text-red-700',   bg: 'bg-red-50' },
          { l: 'Promedio',    v: `${stats.promedioProgreso.toFixed(0)}%`, icon: <TrendingUp size={18} />, c: 'text-purple-700', bg: 'bg-purple-50' },
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
      <div className="flex bg-gray-100 rounded-lg p-0.5 self-start">
        {([['todas', 'Todas'], ['activas', 'Activas'], ['completadas', 'Completadas'], ['vencidas', 'Vencidas']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filtro === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {cargando ? (
        <Card>
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </Card>
      ) : metasFiltradas.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Target size={28} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">
              {metas.length === 0 ? 'Sin metas — crea la primera' : 'No hay metas con este filtro'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metasFiltradas.map(meta => {
            const tipo = tipoInfo(meta.tipo)
            const pct = progreso(meta)
            const est = estadoMeta(meta)
            const dias = diasRestantes(meta)
            const completada = est === 'completada'
            const vencida = est === 'vencida'

            return (
              <div key={meta.id}
                className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${
                  completada ? 'border-green-300' : vencida ? 'border-red-300' : 'border-gray-200'
                }`}>
                {/* Header */}
                <div className={`px-4 py-2.5 flex items-center justify-between ${tipo.bg}`}>
                  <span className={`text-xs font-medium flex items-center gap-1 ${tipo.color}`}>
                    {tipo.icon} {tipo.l}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => abrirEditar(meta)}
                      className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-white/70 transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => setEliminando(meta)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-white/70 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Cuerpo */}
                <div className="px-4 py-3 flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">{meta.nombre}</h3>

                  {/* Progreso circular visual */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                        <circle cx="32" cy="32" r="28" fill="none"
                          stroke={completada ? '#22c55e' : vencida ? '#ef4444' : '#3b82f6'}
                          strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={`${pct * 1.759} 175.9`} />
                      </svg>
                      <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${
                        completada ? 'text-green-600' : vencida ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Actual</span>
                        <span>Objetivo</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span className={completada ? 'text-green-700' : 'text-gray-900'}>
                          {n(meta.valor_actual).toLocaleString('es-CO')}
                        </span>
                        <span className="text-gray-400">
                          {n(meta.valor_meta).toLocaleString('es-CO')}
                        </span>
                      </div>
                      {tipo.unidad && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{tipo.unidad}</p>
                      )}
                    </div>
                  </div>

                  {/* Estado badge */}
                  <div className="flex items-center justify-between">
                    {completada ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                        <Trophy size={10} /> Completada
                      </span>
                    ) : vencida ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertTriangle size={10} /> Vencida
                      </span>
                    ) : est === 'en_progreso' ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                        <Flame size={10} /> En progreso
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                        <Clock size={10} /> Sin iniciar
                      </span>
                    )}
                    {dias !== null && !completada && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${dias < 0 ? 'text-red-500' : dias <= 7 ? 'text-orange-500' : 'text-gray-400'}`}>
                        <Calendar size={9} /> {dias < 0 ? `Venció hace ${Math.abs(dias)}d` : `${dias}d restantes`}
                      </span>
                    )}
                  </div>

                  {/* Fechas */}
                  {(meta.fecha_inicio || meta.fecha_fin) && (
                    <div className="flex gap-3 text-[10px] text-gray-400">
                      {meta.fecha_inicio && <span>Inicio: {fmtFecha(meta.fecha_inicio)}</span>}
                      {meta.fecha_fin && <span>Fin: {fmtFecha(meta.fecha_fin)}</span>}
                    </div>
                  )}

                  {/* Botón actualizar progreso */}
                  {!completada && (
                    <button onClick={() => { setActualizando(meta); setNuevoValor(String(n(meta.valor_actual))) }}
                      className="w-full py-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-1">
                      <TrendingUp size={12} /> Actualizar progreso
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
        titulo={editandoId ? 'Editar Meta' : 'Nueva Meta'} tamano="lg">
        <div className="flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle size={14} className="text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Input label="Nombre de la meta *" placeholder="Ej: Producir 3000 litros mensuales"
            value={fNombre} onChange={e => setFNombre(e.target.value)} />

          {/* Tipo */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Tipo de meta</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TIPOS_META.map(t => (
                <button key={t.v} onClick={() => setFTipo(t.v)}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                    fTipo === t.v
                      ? `${t.bg} ${t.color} ring-2 ring-offset-1 ring-green-400 border-transparent`
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}>
                  {t.icon} {t.l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Valor objetivo * {tipoInfo(fTipo).unidad && <span className="text-gray-400 font-normal">({tipoInfo(fTipo).unidad})</span>}
              </label>
              <input type="number" min="0" step="1" value={fValorMeta} onChange={e => setFValorMeta(e.target.value)}
                placeholder="Ej: 3000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Valor actual</label>
              <input type="number" min="0" step="1" value={fValorActual} onChange={e => setFValorActual(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
          </div>

          {fValorMeta && fValorActual && Number(fValorMeta) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800">
              Progreso actual: <strong>{((Number(fValorActual) / Number(fValorMeta)) * 100).toFixed(0)}%</strong>
              {Number(fValorActual) >= Number(fValorMeta) && ' — Meta alcanzada'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha inicio" type="date" value={fFechaInicio} onChange={e => setFFechaInicio(e.target.value)} />
            <Input label="Fecha límite" type="date" value={fFechaFin} onChange={e => setFFechaFin(e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variante="secundario" onClick={() => { setModalAbierto(false); limpiarForm() }}>Cancelar</Button>
            <Button onClick={guardar} cargando={guardando}>
              {editandoId ? 'Guardar cambios' : 'Crear meta'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══ MODAL ACTUALIZAR PROGRESO ═══ */}
      <Modal abierto={!!actualizando} onCerrar={() => setActualizando(null)}
        titulo="Actualizar Progreso" tamano="sm">
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-gray-900">{actualizando?.nombre}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Objetivo: <strong>{n(actualizando?.valor_meta).toLocaleString('es-CO')}</strong>
              {' '}{tipoInfo(actualizando?.tipo ?? null).unidad}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nuevo valor actual</label>
            <input type="number" min="0" step="1" value={nuevoValor} onChange={e => setNuevoValor(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          </div>
          {nuevoValor && Number(nuevoValor) > 0 && actualizando && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${Number(nuevoValor) >= n(actualizando.valor_meta) ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, (Number(nuevoValor) / n(actualizando.valor_meta)) * 100)}%` }} />
              </div>
              <span className="text-sm font-bold text-gray-700">
                {Math.min(100, (Number(nuevoValor) / n(actualizando.valor_meta)) * 100).toFixed(0)}%
              </span>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variante="secundario" onClick={() => setActualizando(null)}>Cancelar</Button>
            <Button onClick={guardarProgreso}>Guardar</Button>
          </div>
        </div>
      </Modal>

      {/* ═══ MODAL ELIMINAR ═══ */}
      <Modal abierto={!!eliminando} onCerrar={() => setEliminando(null)} titulo="Eliminar Meta" tamano="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">¿Eliminar <strong>{eliminando?.nombre}</strong>? No se puede deshacer.</p>
          <div className="flex justify-end gap-3">
            <Button variante="secundario" onClick={() => setEliminando(null)}>Cancelar</Button>
            <Button variante="peligro" onClick={confirmarEliminar}>Sí, eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
