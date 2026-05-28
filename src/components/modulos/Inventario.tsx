import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Inventario as InvType } from '@/types'
import {
  Plus, Pencil, Trash2, Package, Search, Filter,
  AlertTriangle, Pill, Wrench, Wheat, Fuel, Boxes,
  ShoppingCart, TrendingDown, TrendingUp, ArrowUpDown,
} from 'lucide-react'

// ── Constantes ──────────────────────────────────────────────────
const CATEGORIAS = [
  { v: 'medicamentos',  l: '💊 Medicamentos',   icon: <Pill size={15} />,     color: 'text-red-600',    bg: 'bg-red-50' },
  { v: 'herramientas',  l: '🔧 Herramientas',   icon: <Wrench size={15} />,   color: 'text-blue-600',   bg: 'bg-blue-50' },
  { v: 'alimentos',     l: '🌾 Alimentos/Sales', icon: <Wheat size={15} />,    color: 'text-amber-600',  bg: 'bg-amber-50' },
  { v: 'insumos',       l: '⛽ Insumos/Combustible', icon: <Fuel size={15} />,  color: 'text-orange-600', bg: 'bg-orange-50' },
  { v: 'equipos',       l: '📦 Equipos',         icon: <Boxes size={15} />,    color: 'text-purple-600', bg: 'bg-purple-50' },
  { v: 'otro',          l: '🏷️ Otro',            icon: <Package size={15} />,  color: 'text-gray-600',   bg: 'bg-gray-50' },
]

const UNIDADES = ['unidad', 'kg', 'g', 'litro', 'ml', 'galón', 'dosis', 'bulto', 'rollo', 'metro', 'caja', 'par', 'frasco', 'sobre']

function catInfo(v: string) { return CATEGORIAS.find(c => c.v === v) ?? CATEGORIAS[5] }
function n(v: unknown): number { return Number(v) || 0 }

function fmtPesos(v: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(v)
}
function fmtFecha(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function diasHastaVencimiento(fecha: string | null | undefined): number | null {
  if (!fecha) return null
  const diff = new Date(fecha + 'T23:59:59').getTime() - Date.now()
  return Math.ceil(diff / 86_400_000)
}

// ── Componente ──────────────────────────────────────────────────
export function Inventario() {
  const { finca } = useAuthStore()
  const HOY = new Date().toISOString().slice(0, 10)

  const [items, setItems] = useState<InvType[]>([])
  const [cargando, setCargando] = useState(true)
  const [tablaFaltante, setTablaFaltante] = useState(false)

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [eliminando, setEliminando] = useState<InvType | null>(null)

  // Modal movimiento (entrada/salida rápida)
  const [movModal, setMovModal] = useState<{ item: InvType; tipo: 'entrada' | 'salida' } | null>(null)
  const [movCantidad, setMovCantidad] = useState('')

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [ordenar, setOrdenar] = useState<'nombre' | 'cantidad' | 'valor' | 'vencimiento'>('nombre')

  // Campos formulario
  const [fNombre, setFNombre] = useState('')
  const [fCategoria, setFCategoria] = useState('medicamentos')
  const [fCantidad, setFCantidad] = useState('')
  const [fUnidad, setFUnidad] = useState('unidad')
  const [fCosto, setFCosto] = useState('')
  const [fVencimiento, setFVencimiento] = useState('')
  const [fProveedor, setFProveedor] = useState('')
  const [fCantidadMinima, setFCantidadMinima] = useState('')
  const [fAlertaBajo, setFAlertaBajo] = useState(true)

  // ═══ CARGA ═══
  async function cargar() {
    if (!finca?.id) { setCargando(false); return }
    setCargando(true)
    try {
      const { data, error: err } = await supabase
        .from('inventario')
        .select('*')
        .eq('finca_id', finca.id)
        .order('nombre')

      if (err) {
        if (err.code === '42P01' || err.message?.includes('does not exist')) {
          setTablaFaltante(true)
        }
        setCargando(false)
        return
      }
      setItems(data ?? [])
      setTablaFaltante(false)
    } catch { /* red */ }
    setCargando(false)
  }
  useEffect(() => { cargar() }, [finca?.id])

  // ═══ FORMULARIO ═══
  function limpiarForm() {
    setFNombre(''); setFCategoria('medicamentos'); setFCantidad('')
    setFUnidad('unidad'); setFCosto(''); setFVencimiento('')
    setFProveedor(''); setFCantidadMinima(''); setFAlertaBajo(true)
    setEditandoId(null); setError('')
  }

  function abrirNuevo() {
    limpiarForm()
    setModalAbierto(true)
  }

  function abrirEditar(item: InvType) {
    setEditandoId(item.id)
    setFNombre(item.nombre)
    setFCategoria(item.categoria ?? 'otro')
    setFCantidad(String(n(item.cantidad)))
    setFUnidad(item.unidad ?? 'unidad')
    setFCosto(item.costo_unitario != null ? String(item.costo_unitario) : '')
    setFVencimiento(item.fecha_vencimiento ?? '')
    setFProveedor(item.proveedor ?? '')
    setFCantidadMinima(item.cantidad_minima != null ? String(item.cantidad_minima) : '')
    setFAlertaBajo(item.alerta_bajo ?? true)
    setError('')
    setModalAbierto(true)
  }

  async function guardar() {
    if (!fNombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!fCantidad || Number(fCantidad) < 0) { setError('La cantidad es obligatoria'); return }
    if (!finca?.id) return
    setGuardando(true); setError('')

    const payload: any = {
      finca_id: finca.id,
      nombre: fNombre.trim(),
      categoria: fCategoria,
      cantidad: Number(fCantidad),
      unidad: fUnidad,
      costo_unitario: fCosto ? Number(fCosto) : null,
      fecha_vencimiento: fVencimiento || null,
      proveedor: fProveedor.trim() || null,
      cantidad_minima: fCantidadMinima ? Number(fCantidadMinima) : 0,
      alerta_bajo: fAlertaBajo,
    }

    try {
      const res = editandoId
        ? await supabase.from('inventario').update(payload).eq('id', editandoId).select().single()
        : await supabase.from('inventario').insert([payload]).select().single()

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
    await supabase.from('inventario').delete().eq('id', eliminando.id)
    setItems(prev => prev.filter(i => i.id !== eliminando.id))
    setEliminando(null)
  }

  // ═══ MOVIMIENTO RÁPIDO ═══
  async function ejecutarMovimiento() {
    if (!movModal || !movCantidad || Number(movCantidad) <= 0) return
    const cant = Number(movCantidad)
    const nueva = movModal.tipo === 'entrada'
      ? n(movModal.item.cantidad) + cant
      : Math.max(0, n(movModal.item.cantidad) - cant)

    await supabase.from('inventario').update({ cantidad: nueva }).eq('id', movModal.item.id)
    setMovModal(null)
    setMovCantidad('')
    requestAnimationFrame(() => cargar())
  }

  // ═══ FILTRADO Y ORDENAMIENTO ═══
  const itemsFiltrados = items
    .filter(i => {
      if (filtroCategoria !== 'todos' && i.categoria !== filtroCategoria) return false
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase()
        if (!i.nombre.toLowerCase().includes(q) &&
            !(i.proveedor ?? '').toLowerCase().includes(q) &&
            !(i.categoria ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      switch (ordenar) {
        case 'cantidad': return n(a.cantidad) - n(b.cantidad)
        case 'valor': return (n(b.cantidad) * n(b.costo_unitario)) - (n(a.cantidad) * n(a.costo_unitario))
        case 'vencimiento': {
          const da = diasHastaVencimiento(a.fecha_vencimiento)
          const db = diasHastaVencimiento(b.fecha_vencimiento)
          if (da === null && db === null) return 0
          if (da === null) return 1
          if (db === null) return -1
          return da - db
        }
        default: return a.nombre.localeCompare(b.nombre)
      }
    })

  // ═══ STATS ═══
  const stats = {
    total: items.length,
    valorTotal: items.reduce((s, i) => s + n(i.cantidad) * n(i.costo_unitario), 0),
    bajoStock: items.filter(i => i.alerta_bajo && n(i.cantidad) <= n(i.cantidad_minima)).length,
    porVencer: items.filter(i => {
      const d = diasHastaVencimiento(i.fecha_vencimiento)
      return d !== null && d >= 0 && d <= 30
    }).length,
    vencidos: items.filter(i => {
      const d = diasHastaVencimiento(i.fecha_vencimiento)
      return d !== null && d < 0
    }).length,
  }

  // ═══ TABLA FALTANTE ═══
  if (tablaFaltante) {
    const sql = `create table inventario (
  id uuid primary key default gen_random_uuid(),
  finca_id uuid references fincas(id) on delete cascade not null,
  categoria text default 'otro',
  nombre text not null,
  cantidad numeric(10,2) not null default 0,
  unidad text default 'unidad',
  costo_unitario numeric(12,2),
  fecha_vencimiento date,
  proveedor text,
  alerta_bajo boolean default true,
  cantidad_minima numeric(10,2) default 0,
  registrado_por text,
  fecha_creacion timestamptz default now(),
  fecha_actualizacion timestamptz default now()
);
alter table inventario enable row level security;
create policy "Acceso por finca" on inventario for all using (
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
              <h3 className="font-bold text-gray-900">Tabla "inventario" no encontrada</h3>
              <p className="text-sm text-gray-500 mt-1">Ejecuta este SQL en Supabase → SQL Editor:</p>
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
          <h2 className="text-lg font-bold text-gray-900">Inventario General</h2>
          <p className="text-sm text-gray-500">Medicamentos, herramientas, alimentos, insumos y equipos</p>
        </div>
        <Button onClick={abrirNuevo}><Plus size={16} /> Agregar Producto</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { l: 'Productos',    v: stats.total,       icon: <Package size={18} />,       c: 'text-gray-700',  bg: 'bg-gray-50' },
          { l: 'Valor total',  v: fmtPesos(stats.valorTotal), icon: <ShoppingCart size={18} />, c: 'text-green-700', bg: 'bg-green-50' },
          { l: 'Stock bajo',   v: stats.bajoStock,   icon: <TrendingDown size={18} />,  c: 'text-orange-700', bg: 'bg-orange-50' },
          { l: 'Por vencer',   v: stats.porVencer,   icon: <AlertTriangle size={18} />, c: 'text-yellow-700', bg: 'bg-yellow-50' },
          { l: 'Vencidos',     v: stats.vencidos,     icon: <AlertTriangle size={18} />, c: 'text-red-700',   bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.l} className={`${s.bg} rounded-xl p-3 flex items-center gap-3`}>
            <div className={s.c}>{s.icon}</div>
            <div>
              <p className={`text-lg font-bold ${s.c}`}>{s.v}</p>
              <p className="text-xs text-gray-500">{s.l}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros por categoría */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFiltroCategoria('todos')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filtroCategoria === 'todos' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Todos ({items.length})
        </button>
        {CATEGORIAS.map(c => {
          const count = items.filter(i => i.categoria === c.v).length
          if (count === 0) return null
          return (
            <button key={c.v} onClick={() => setFiltroCategoria(c.v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${filtroCategoria === c.v ? 'bg-green-600 text-white' : `${c.bg} ${c.color} hover:opacity-80`}`}>
              {c.icon} {c.l.split(' ').slice(1).join(' ')} ({count})
            </button>
          )
        })}
      </div>

      {/* Buscador + orden */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto, proveedor..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown size={13} className="text-gray-400" />
          <select value={ordenar} onChange={e => setOrdenar(e.target.value as any)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="nombre">Nombre A-Z</option>
            <option value="cantidad">Menor stock</option>
            <option value="valor">Mayor valor</option>
            <option value="vencimiento">Próximos a vencer</option>
          </select>
        </div>
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
      ) : itemsFiltrados.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package size={28} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">
              {items.length === 0 ? 'Sin productos — agrega el primero' : 'No hay productos con estos filtros'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {itemsFiltrados.map(item => {
            const cat = catInfo(item.categoria ?? 'otro')
            const diasVenc = diasHastaVencimiento(item.fecha_vencimiento)
            const stockBajo = item.alerta_bajo && n(item.cantidad) <= n(item.cantidad_minima)
            const vencido = diasVenc !== null && diasVenc < 0
            const porVencer = diasVenc !== null && diasVenc >= 0 && diasVenc <= 30
            const valorItem = n(item.cantidad) * n(item.costo_unitario)

            return (
              <div key={item.id}
                className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
                  vencido ? 'border-red-300' : stockBajo ? 'border-orange-300' : 'border-gray-200'
                }`}>
                {/* Header con categoría */}
                <div className={`px-4 py-2 flex items-center justify-between ${cat.bg}`}>
                  <span className={`text-xs font-medium flex items-center gap-1 ${cat.color}`}>
                    {cat.icon} {cat.l.split(' ').slice(1).join(' ')}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => abrirEditar(item)}
                      className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-white/70 transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => setEliminando(item)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-white/70 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Cuerpo */}
                <div className="px-4 py-3 flex flex-col gap-2">
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">{item.nombre}</h3>

                  {/* Cantidad */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-2xl font-bold ${stockBajo ? 'text-orange-600' : 'text-gray-900'}`}>
                        {n(item.cantidad)}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{item.unidad ?? 'unidad'}</span>
                    </div>
                    {/* Botones entrada/salida */}
                    <div className="flex gap-1">
                      <button onClick={() => { setMovModal({ item, tipo: 'entrada' }); setMovCantidad('') }}
                        className="px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors flex items-center gap-0.5">
                        <TrendingUp size={11} /> +
                      </button>
                      <button onClick={() => { setMovModal({ item, tipo: 'salida' }); setMovCantidad('') }}
                        className="px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors flex items-center gap-0.5">
                        <TrendingDown size={11} /> −
                      </button>
                    </div>
                  </div>

                  {/* Barra de stock */}
                  {item.alerta_bajo && n(item.cantidad_minima) > 0 && (
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                        <span>Stock</span>
                        <span>Mín: {n(item.cantidad_minima)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${stockBajo ? 'bg-orange-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, (n(item.cantidad) / n(item.cantidad_minima)) * 50)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Info adicional */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 mt-1">
                    {item.costo_unitario != null && n(item.costo_unitario) > 0 && (
                      <span>{fmtPesos(n(item.costo_unitario))}/{item.unidad ?? 'u'}</span>
                    )}
                    {valorItem > 0 && (
                      <span className="font-semibold text-green-700">Total: {fmtPesos(valorItem)}</span>
                    )}
                    {item.proveedor && <span>📍 {item.proveedor}</span>}
                  </div>

                  {/* Alertas */}
                  {stockBajo && (
                    <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                      <AlertTriangle size={11} className="text-orange-600" />
                      <span className="text-[10px] font-semibold text-orange-700">Stock bajo</span>
                    </div>
                  )}
                  {vencido && (
                    <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded px-2 py-1">
                      <AlertTriangle size={11} className="text-red-600" />
                      <span className="text-[10px] font-semibold text-red-700">Vencido ({fmtFecha(item.fecha_vencimiento)})</span>
                    </div>
                  )}
                  {porVencer && !vencido && (
                    <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                      <AlertTriangle size={11} className="text-yellow-600" />
                      <span className="text-[10px] font-semibold text-yellow-700">Vence en {diasVenc} días ({fmtFecha(item.fecha_vencimiento)})</span>
                    </div>
                  )}
                  {!vencido && !porVencer && item.fecha_vencimiento && (
                    <span className="text-[10px] text-gray-400">Vence: {fmtFecha(item.fecha_vencimiento)}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ MODAL CREAR/EDITAR ═══ */}
      <Modal abierto={modalAbierto} onCerrar={() => { setModalAbierto(false); limpiarForm() }}
        titulo={editandoId ? 'Editar Producto' : 'Agregar Producto'} tamano="lg">
        <div className="flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle size={14} className="text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Input label="Nombre del producto *" placeholder="Ej: Ivermectina 3.15%, Machete, Sal mineral..."
            value={fNombre} onChange={e => setFNombre(e.target.value)} />

          {/* Categoría */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Categoría</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIAS.map(c => (
                <button key={c.v} onClick={() => setFCategoria(c.v)}
                  className={`py-2 px-2 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-1 ${
                    fCategoria === c.v
                      ? `${c.bg} ${c.color} ring-2 ring-offset-1 ring-green-400 border-transparent`
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}>
                  {c.icon} {c.l.split(' ').slice(1).join(' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="Cantidad *" type="number" min="0" step="0.1" placeholder="0"
              value={fCantidad} onChange={e => setFCantidad(e.target.value)} />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Unidad</label>
              <select value={fUnidad} onChange={e => setFUnidad(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <Input label="Costo unitario ($)" type="number" min="0" placeholder="15000"
              value={fCosto} onChange={e => setFCosto(e.target.value)} />
          </div>

          {fCantidad && fCosto && Number(fCantidad) > 0 && Number(fCosto) > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800">
              Valor total: <strong>{fmtPesos(Number(fCantidad) * Number(fCosto))}</strong>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha vencimiento" type="date"
              value={fVencimiento} onChange={e => setFVencimiento(e.target.value)} />
            <Input label="Proveedor" placeholder="Ej: Almacén El Campo"
              value={fProveedor} onChange={e => setFProveedor(e.target.value)} />
          </div>

          {/* Alerta de stock bajo */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={fAlertaBajo}
                onChange={e => setFAlertaBajo(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
              <span className="text-sm font-medium text-gray-700">Alertar cuando el stock sea bajo</span>
            </label>
            {fAlertaBajo && (
              <Input label="Cantidad mínima" type="number" min="0" placeholder="Ej: 5"
                value={fCantidadMinima} onChange={e => setFCantidadMinima(e.target.value)} />
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variante="secundario" onClick={() => { setModalAbierto(false); limpiarForm() }}>
              Cancelar
            </Button>
            <Button onClick={guardar} cargando={guardando}>
              {editandoId ? 'Guardar cambios' : 'Agregar producto'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══ MODAL MOVIMIENTO RÁPIDO ═══ */}
      <Modal abierto={!!movModal} onCerrar={() => setMovModal(null)}
        titulo={movModal?.tipo === 'entrada' ? 'Registrar Entrada' : 'Registrar Salida'} tamano="sm">
        <div className="flex flex-col gap-4">
          <div className={`rounded-lg p-3 ${movModal?.tipo === 'entrada' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className="text-sm font-semibold text-gray-900">{movModal?.item.nombre}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Stock actual: <strong>{n(movModal?.item.cantidad)} {movModal?.item.unidad}</strong>
            </p>
          </div>
          <Input
            label={movModal?.tipo === 'entrada' ? 'Cantidad a agregar' : 'Cantidad a retirar'}
            type="number" min="1" step="1" placeholder="Ej: 10"
            value={movCantidad} onChange={e => setMovCantidad(e.target.value)} />
          {movCantidad && Number(movCantidad) > 0 && (
            <p className="text-xs text-gray-500">
              Nuevo stock: <strong>
                {movModal?.tipo === 'entrada'
                  ? n(movModal?.item.cantidad) + Number(movCantidad)
                  : Math.max(0, n(movModal?.item.cantidad ?? 0) - Number(movCantidad))
                } {movModal?.item.unidad}
              </strong>
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variante="secundario" onClick={() => setMovModal(null)}>Cancelar</Button>
            <Button onClick={ejecutarMovimiento}>
              {movModal?.tipo === 'entrada' ? 'Registrar entrada' : 'Registrar salida'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══ MODAL ELIMINAR ═══ */}
      <Modal abierto={!!eliminando} onCerrar={() => setEliminando(null)} titulo="Eliminar Producto" tamano="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">¿Eliminar <strong>{eliminando?.nombre}</strong> del inventario? No se puede deshacer.</p>
          <div className="flex justify-end gap-3">
            <Button variante="secundario" onClick={() => setEliminando(null)}>Cancelar</Button>
            <Button variante="peligro" onClick={confirmarEliminar}>Sí, eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
