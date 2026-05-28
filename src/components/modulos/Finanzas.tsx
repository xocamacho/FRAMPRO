import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import {
  Plus, Pencil, Trash2, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, ChevronLeft, ChevronRight, Search, Filter,
  Wallet, ArrowDownCircle, ArrowUpCircle, BarChart3, Receipt,
} from 'lucide-react'

// ── Tipos unificados ────────────────────────────────────────────
interface Movimiento {
  id: string
  finca_id: string
  tipo: 'ingreso' | 'egreso'
  fecha: string
  concepto: string | null
  categoria: string | null
  cantidad: number | null
  valor_total: number
  descripcion: string | null
  comprobante: string | null
  registrado_por: string | null
  fecha_creacion: string
}

// ── Constantes ──────────────────────────────────────────────────
const CATS_INGRESO = [
  { v: 'venta_leche',    l: '🥛 Venta de leche' },
  { v: 'venta_queso',    l: '🧀 Venta de queso' },
  { v: 'venta_animales', l: '🐄 Venta de animales' },
  { v: 'venta_cultivos', l: '🌿 Venta de cultivos' },
  { v: 'servicios',      l: '🔧 Servicios prestados' },
  { v: 'subsidio',       l: '🏛️ Subsidios/Apoyos' },
  { v: 'otro_ingreso',   l: '💰 Otro ingreso' },
]

const CATS_EGRESO = [
  { v: 'alimentacion',   l: '🌾 Alimentación animal' },
  { v: 'medicamentos',   l: '💊 Medicamentos/Veterinaria' },
  { v: 'mano_obra',      l: '👷 Mano de obra' },
  { v: 'combustible',    l: '⛽ Combustible' },
  { v: 'mantenimiento',  l: '🔩 Mantenimiento/Reparaciones' },
  { v: 'insumos',        l: '📦 Insumos generales' },
  { v: 'transporte',     l: '🚚 Transporte' },
  { v: 'servicios_pub',  l: '💡 Servicios públicos' },
  { v: 'arriendo',       l: '🏠 Arriendo' },
  { v: 'impuestos',      l: '📋 Impuestos/Legal' },
  { v: 'otro_egreso',    l: '💸 Otro egreso' },
]

function n(v: unknown): number { return Number(v) || 0 }

function fmtPesos(v: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(v)
}

function fmtFecha(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fmtFechaCorta(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short',
  })
}

function mesLabel(y: number, m: number) {
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
}

function catLabel(cat: string | null, tipo: string) {
  if (!cat) return tipo === 'ingreso' ? 'Otro ingreso' : 'Otro egreso'
  const lista = tipo === 'ingreso' ? CATS_INGRESO : CATS_EGRESO
  return lista.find(c => c.v === cat)?.l ?? cat
}

// ── Componente ──────────────────────────────────────────────────
export function Finanzas() {
  const { finca } = useAuthStore()
  const ahora = new Date()
  const HOY = ahora.toISOString().slice(0, 10)

  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [cargando, setCargando] = useState(true)
  const [tablaFaltante, setTablaFaltante] = useState(false)
  const [mesVista, setMesVista] = useState({ y: ahora.getFullYear(), m: ahora.getMonth() + 1 })

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [eliminando, setEliminando] = useState<Movimiento | null>(null)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'ingreso' | 'egreso'>('todos')
  const [busqueda, setBusqueda] = useState('')

  // Campos formulario
  const [fTipo, setFTipo] = useState<'ingreso' | 'egreso'>('ingreso')
  const [fFecha, setFFecha] = useState(HOY)
  const [fConcepto, setFConcepto] = useState('')
  const [fCategoria, setFCategoria] = useState('')
  const [fValor, setFValor] = useState('')
  const [fCantidad, setFCantidad] = useState('')
  const [fDescripcion, setFDescripcion] = useState('')

  // ═══ CARGA ═══
  async function cargar() {
    if (!finca?.id) { setCargando(false); return }
    setCargando(true)
    try {
      const { data, error: err } = await supabase
        .from('finanzas')
        .select('*')
        .eq('finca_id', finca.id)
        .order('fecha', { ascending: false })

      if (err) {
        if (err.code === '42P01' || err.message?.includes('does not exist')) {
          setTablaFaltante(true)
        }
        setCargando(false)
        return
      }
      setMovimientos((data ?? []) as Movimiento[])
      setTablaFaltante(false)
    } catch { /* red */ }
    setCargando(false)
  }
  useEffect(() => { cargar() }, [finca?.id])

  // ═══ NAVEGACIÓN MES ═══
  function mesSig() {
    setMesVista(p => p.m === 12 ? { y: p.y + 1, m: 1 } : { y: p.y, m: p.m + 1 })
  }
  function mesAnt() {
    setMesVista(p => p.m === 1 ? { y: p.y - 1, m: 12 } : { y: p.y, m: p.m - 1 })
  }

  // ═══ FORMULARIO ═══
  function limpiarForm() {
    setFTipo('ingreso'); setFFecha(HOY); setFConcepto('')
    setFCategoria(''); setFValor(''); setFCantidad('')
    setFDescripcion(''); setEditandoId(null); setError('')
  }

  function abrirNuevo(tipo: 'ingreso' | 'egreso') {
    limpiarForm()
    setFTipo(tipo)
    setFCategoria(tipo === 'ingreso' ? 'venta_leche' : 'alimentacion')
    setModalAbierto(true)
  }

  function abrirEditar(mov: Movimiento) {
    setEditandoId(mov.id)
    setFTipo(mov.tipo)
    setFFecha(mov.fecha)
    setFConcepto(mov.concepto ?? '')
    setFCategoria(mov.categoria ?? '')
    setFValor(String(n(mov.valor_total)))
    setFCantidad(mov.cantidad != null ? String(mov.cantidad) : '')
    setFDescripcion(mov.descripcion ?? '')
    setError('')
    setModalAbierto(true)
  }

  async function guardar() {
    if (!fValor || Number(fValor) <= 0) { setError('El valor es obligatorio y debe ser mayor a 0'); return }
    if (!fFecha) { setError('La fecha es obligatoria'); return }
    if (!finca?.id) return
    setGuardando(true); setError('')

    const payload: any = {
      finca_id: finca.id,
      tipo: fTipo,
      fecha: fFecha,
      concepto: fConcepto.trim() || null,
      categoria: fCategoria || null,
      valor_total: Number(fValor),
      cantidad: fCantidad ? Number(fCantidad) : null,
      descripcion: fDescripcion.trim() || null,
    }

    try {
      const res = editandoId
        ? await supabase.from('finanzas').update(payload).eq('id', editandoId).select().single()
        : await supabase.from('finanzas').insert([payload]).select().single()

      if (res.error) { setError(res.error.message) }
      else {
        setModalAbierto(false)
        limpiarForm()
        requestAnimationFrame(() => {
          const f = new Date(fFecha + 'T00:00:00')
          setMesVista({ y: f.getFullYear(), m: f.getMonth() + 1 })
          cargar()
        })
      }
    } catch { setError('Error al guardar') }
    finally { setGuardando(false) }
  }

  async function confirmarEliminar() {
    if (!eliminando) return
    await supabase.from('finanzas').delete().eq('id', eliminando.id)
    setMovimientos(prev => prev.filter(m => m.id !== eliminando.id))
    setEliminando(null)
  }

  // ═══ DATOS DEL MES ═══
  const { y, m } = mesVista
  const delMes = movimientos.filter(mov => {
    const d = new Date(mov.fecha + 'T00:00:00')
    return d.getFullYear() === y && d.getMonth() + 1 === m
  })

  const ingresosMes = delMes.filter(m => m.tipo === 'ingreso')
  const egresosMes = delMes.filter(m => m.tipo === 'egreso')
  const totalIngresos = ingresosMes.reduce((s, m) => s + n(m.valor_total), 0)
  const totalEgresos = egresosMes.reduce((s, m) => s + n(m.valor_total), 0)
  const balance = totalIngresos - totalEgresos

  // Mes anterior para tendencia
  const [ay, am] = m === 1 ? [y - 1, 12] : [y, m - 1]
  const mesAntData = movimientos.filter(mov => {
    const d = new Date(mov.fecha + 'T00:00:00')
    return d.getFullYear() === ay && d.getMonth() + 1 === am
  })
  const balanceAnt = mesAntData.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + n(m.valor_total), 0)
    - mesAntData.filter(m => m.tipo === 'egreso').reduce((s, m) => s + n(m.valor_total), 0)

  // Desglose por categoría
  function desgloseCat(tipo: 'ingreso' | 'egreso') {
    const lista = tipo === 'ingreso' ? ingresosMes : egresosMes
    const map: Record<string, number> = {}
    lista.forEach(m => {
      const k = m.categoria ?? 'otro'
      map[k] = (map[k] ?? 0) + n(m.valor_total)
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total]) => ({ cat, total, label: catLabel(cat, tipo) }))
  }

  // Gráfico diario del mes
  const diasDelMes = new Date(y, m, 0).getDate()
  const gridDias = Array.from({ length: diasDelMes }, (_, i) => {
    const dia = i + 1
    const fecha = `${y}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    const ing = delMes.filter(m => m.fecha === fecha && m.tipo === 'ingreso').reduce((s, m) => s + n(m.valor_total), 0)
    const egr = delMes.filter(m => m.fecha === fecha && m.tipo === 'egreso').reduce((s, m) => s + n(m.valor_total), 0)
    return { dia, ing, egr }
  })
  const maxDia = Math.max(1, ...gridDias.map(d => Math.max(d.ing, d.egr)))

  // Filtrado para la tabla
  const movsFiltrados = delMes
    .filter(mov => {
      if (filtroTipo !== 'todos' && mov.tipo !== filtroTipo) return false
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase()
        if (!(mov.concepto ?? '').toLowerCase().includes(q) &&
            !(mov.descripcion ?? '').toLowerCase().includes(q) &&
            !(mov.categoria ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  // ═══ TABLA FALTANTE ═══
  if (tablaFaltante) {
    const sql = `create table finanzas (
  id uuid primary key default gen_random_uuid(),
  finca_id uuid references fincas(id) on delete cascade not null,
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  fecha date not null,
  concepto text,
  categoria text,
  cantidad numeric(10,2),
  valor_total numeric(14,2) not null,
  descripcion text,
  comprobante text,
  registrado_por text,
  fecha_creacion timestamptz default now()
);
alter table finanzas enable row level security;
create policy "Acceso por finca" on finanzas for all using (
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
              <h3 className="font-bold text-gray-900">Tabla "finanzas" no encontrada</h3>
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
          <h2 className="text-lg font-bold text-gray-900">Finanzas</h2>
          <p className="text-sm text-gray-500">Ingresos, egresos y rentabilidad de la finca</p>
        </div>
        <div className="flex gap-2">
          <Button variante="secundario" onClick={() => abrirNuevo('egreso')}>
            <ArrowUpCircle size={16} className="text-red-500" /> Egreso
          </Button>
          <Button onClick={() => abrirNuevo('ingreso')}>
            <ArrowDownCircle size={16} /> Ingreso
          </Button>
        </div>
      </div>

      {/* Navegación mes */}
      <div className="flex items-center justify-between">
        <button onClick={mesAnt}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <ChevronLeft size={16} /> Anterior
        </button>
        <h3 className="text-sm font-semibold text-gray-900 capitalize">{mesLabel(y, m)}</h3>
        <button onClick={mesSig}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          Siguiente <ChevronRight size={16} />
        </button>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card padding="sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500">Ingresos</p>
              <p className="text-2xl font-bold text-green-600 mt-0.5">{fmtPesos(totalIngresos)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{ingresosMes.length} movimientos</p>
            </div>
            <span className="p-2 rounded-lg bg-green-50 text-green-600"><TrendingUp size={18} /></span>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500">Egresos</p>
              <p className="text-2xl font-bold text-red-600 mt-0.5">{fmtPesos(totalEgresos)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{egresosMes.length} movimientos</p>
            </div>
            <span className="p-2 rounded-lg bg-red-50 text-red-600"><TrendingDown size={18} /></span>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500">Balance</p>
              <p className={`text-2xl font-bold mt-0.5 ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {balance >= 0 ? '+' : ''}{fmtPesos(balance)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {balanceAnt !== 0
                  ? `Mes ant: ${balanceAnt >= 0 ? '+' : ''}${fmtPesos(balanceAnt)}`
                  : 'Sin datos mes anterior'}
              </p>
            </div>
            <span className={`p-2 rounded-lg ${balance >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              <Wallet size={18} />
            </span>
          </div>
        </Card>
      </div>

      {cargando ? (
        <Card>
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Gráfico diario */}
          {delMes.length > 0 && (
            <Card padding="sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-800">Flujo diario</p>
                <div className="flex gap-3">
                  {[['bg-green-400', 'Ingresos'], ['bg-red-400', 'Egresos']].map(([c, l]) => (
                    <div key={l} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-sm ${c}`} />
                      <span className="text-[10px] text-gray-500">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-0.5 h-20">
                {gridDias.map((d, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 min-w-0 gap-px"
                    title={`Día ${d.dia}: +${fmtPesos(d.ing)} / -${fmtPesos(d.egr)}`}>
                    <div className="w-full flex flex-col justify-end" style={{ height: 34 }}>
                      <div className="w-full bg-green-400 rounded-t"
                        style={{ height: d.ing > 0 ? `${Math.max((d.ing / maxDia) * 100, 4)}%` : 0 }} />
                    </div>
                    <div className="w-full flex flex-col justify-start" style={{ height: 34 }}>
                      <div className="w-full bg-red-400 rounded-b"
                        style={{ height: d.egr > 0 ? `${Math.max((d.egr / maxDia) * 100, 4)}%` : 0 }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Desglose por categoría */}
          {delMes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Ingresos por categoría */}
              {totalIngresos > 0 && (
                <Card padding="sm">
                  <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                    <TrendingUp size={12} className="text-green-500" /> Ingresos por categoría
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {desgloseCat('ingreso').map(({ cat, total, label }) => (
                      <div key={cat} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-700 truncate">{label}</span>
                            <span className="font-semibold text-green-700">{fmtPesos(total)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full">
                            <div className="h-full bg-green-400 rounded-full"
                              style={{ width: `${(total / totalIngresos) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {/* Egresos por categoría */}
              {totalEgresos > 0 && (
                <Card padding="sm">
                  <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                    <TrendingDown size={12} className="text-red-500" /> Egresos por categoría
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {desgloseCat('egreso').map(({ cat, total, label }) => (
                      <div key={cat} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-700 truncate">{label}</span>
                            <span className="font-semibold text-red-700">{fmtPesos(total)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full">
                            <div className="h-full bg-red-400 rounded-full"
                              style={{ width: `${(total / totalEgresos) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Filtros tabla */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar concepto, descripción..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {([['todos', 'Todos'], ['ingreso', 'Ingresos'], ['egreso', 'Egresos']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setFiltroTipo(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filtroTipo === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de movimientos */}
          <Card padding="none">
            {movsFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <DollarSign size={28} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">
                  {delMes.length === 0 ? 'Sin movimientos este mes' : 'Sin resultados con estos filtros'}
                </p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => abrirNuevo('ingreso')} className="text-sm text-green-600 hover:text-green-700 font-medium">+ Ingreso</button>
                  <button onClick={() => abrirNuevo('egreso')} className="text-sm text-red-600 hover:text-red-700 font-medium">+ Egreso</button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8"></th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Fecha</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Concepto</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden sm:table-cell">Categoría</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500">Valor</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movsFiltrados.map(mov => (
                      <tr key={mov.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2.5">
                          {mov.tipo === 'ingreso'
                            ? <ArrowDownCircle size={16} className="text-green-500" />
                            : <ArrowUpCircle size={16} className="text-red-500" />}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{fmtFechaCorta(mov.fecha)}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">
                            {mov.concepto || catLabel(mov.categoria, mov.tipo)}
                          </p>
                          {mov.descripcion && (
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{mov.descripcion}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <span className="text-xs text-gray-500">{catLabel(mov.categoria, mov.tipo)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`font-bold ${mov.tipo === 'ingreso' ? 'text-green-700' : 'text-red-700'}`}>
                            {mov.tipo === 'ingreso' ? '+' : '-'}{fmtPesos(n(mov.valor_total))}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => abrirEditar(mov)}
                              className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setEliminando(mov)}
                              className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-gray-600 uppercase">
                        Total del mes
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {balance >= 0 ? '+' : ''}{fmtPesos(balance)}
                        </span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ═══ MODAL CREAR/EDITAR ═══ */}
      <Modal abierto={modalAbierto} onCerrar={() => { setModalAbierto(false); limpiarForm() }}
        titulo={editandoId ? 'Editar Movimiento' : (fTipo === 'ingreso' ? 'Registrar Ingreso' : 'Registrar Egreso')} tamano="lg">
        <div className="flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle size={14} className="text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Tipo */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => { setFTipo('ingreso'); setFCategoria('venta_leche') }}
              className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                fTipo === 'ingreso' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500'
              }`}>
              <ArrowDownCircle size={16} /> Ingreso
            </button>
            <button onClick={() => { setFTipo('egreso'); setFCategoria('alimentacion') }}
              className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                fTipo === 'egreso' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500'
              }`}>
              <ArrowUpCircle size={16} /> Egreso
            </button>
          </div>

          {/* Categoría */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Categoría</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
              {(fTipo === 'ingreso' ? CATS_INGRESO : CATS_EGRESO).map(c => (
                <button key={c.v} onClick={() => setFCategoria(c.v)}
                  className={`text-left px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    fCategoria === c.v
                      ? `${fTipo === 'ingreso' ? 'bg-green-50 border-green-400 text-green-800' : 'bg-red-50 border-red-400 text-red-800'} ring-1 ring-offset-1 ${fTipo === 'ingreso' ? 'ring-green-400' : 'ring-red-400'}`
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}>
                  {c.l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha *" type="date" value={fFecha} onChange={e => setFFecha(e.target.value)} />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Valor total ($) *</label>
              <input type="number" min="0" step="100" value={fValor} onChange={e => setFValor(e.target.value)}
                placeholder="Ej: 250000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Concepto (opcional)" placeholder="Ej: Venta 50L leche"
              value={fConcepto} onChange={e => setFConcepto(e.target.value)} />
            <Input label="Cantidad (opcional)" type="number" placeholder="Ej: 50"
              value={fCantidad} onChange={e => setFCantidad(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Descripción (opcional)</label>
            <textarea value={fDescripcion} onChange={e => setFDescripcion(e.target.value)}
              placeholder="Detalles adicionales del movimiento..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variante="secundario" onClick={() => { setModalAbierto(false); limpiarForm() }}>
              Cancelar
            </Button>
            <Button onClick={guardar} cargando={guardando}>
              {editandoId ? 'Guardar cambios' : (fTipo === 'ingreso' ? 'Registrar ingreso' : 'Registrar egreso')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══ MODAL ELIMINAR ═══ */}
      <Modal abierto={!!eliminando} onCerrar={() => setEliminando(null)} titulo="Eliminar Movimiento" tamano="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            ¿Eliminar este {eliminando?.tipo === 'ingreso' ? 'ingreso' : 'egreso'} de{' '}
            <strong>{eliminando ? fmtPesos(n(eliminando.valor_total)) : ''}</strong>? No se puede deshacer.
          </p>
          <div className="flex justify-end gap-3">
            <Button variante="secundario" onClick={() => setEliminando(null)}>Cancelar</Button>
            <Button variante="peligro" onClick={confirmarEliminar}>Sí, eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
