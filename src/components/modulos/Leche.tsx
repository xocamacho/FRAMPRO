import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import { agregarALaCola } from '@/services/offlineSync'
import type { LecheDiaria } from '@/types'
import {
  Plus, Pencil, Trash2, AlertTriangle,
  ChevronLeft, ChevronRight, Milk,
  Beef, DollarSign, BarChart3, Database,
  TrendingDown, AlertCircle, Lock,
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────
function n(v: unknown): number { return Number(v) || 0 }

function fmtPesos(v: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(v)
}
function fmtFecha(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    weekday: 'short', day: '2-digit', month: 'short',
  })
}
function mesLabel(y: number, m: number) {
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
}

const DESTINOS = [
  { v: 'queso',       l: '🧀 Todo para queso',       color: 'bg-amber-100 text-amber-800' },
  { v: 'venta',       l: '💰 Todo para venta',        color: 'bg-green-100 text-green-800' },
  { v: 'mixto',       l: '🔀 Mixto (queso + venta)',  color: 'bg-blue-100 text-blue-800'  },
  { v: 'autoconsumo', l: '🏠 Autoconsumo',            color: 'bg-gray-100  text-gray-700'  },
]

// Umbral de caída drástica (%)
const UMBRAL_CAIDA = 20

// ── Componente ───────────────────────────────────────────────────
export function Leche() {
  const { finca, usuario } = useAuthStore()
  const esAdmin = !usuario?.rol || usuario.rol === 'admin' || usuario.rol === 'propietario'
  const ahora = new Date()
  const HOY   = ahora.toISOString().slice(0, 10)

  const [registros,       setRegistros]       = useState<LecheDiaria[]>([])
  const [cargando,        setCargando]        = useState(true)
  const [tablaFaltante,   setTablaFaltante]   = useState(false)
  const [mesVista,        setMesVista]        = useState({ y: ahora.getFullYear(), m: ahora.getMonth() + 1 })
  const [vista,           setVista]           = useState<'mes' | 'historial'>('mes')

  const [modalAbierto,    setModalAbierto]    = useState(false)
  const [editandoId,      setEditandoId]      = useState<string | null>(null)
  const [guardando,       setGuardando]       = useState(false)
  const [error,           setError]           = useState('')
  const [eliminando,      setEliminando]      = useState<LecheDiaria | null>(null)

  // Alerta caída drástica
  const [alertaCaida,     setAlertaCaida]     = useState<{ pct: number; promedio: number; actual: number } | null>(null)
  const [razonCaida,      setRazonCaida]      = useState('')
  const [modalRazon,      setModalRazon]      = useState(false)
  const [pendienteCaida,  setPendienteCaida]  = useState<any>(null) // payload listo para guardar

  // Campos comunes (trabajador + admin)
  const [fFecha,   setFFecha]   = useState(HOY)
  const [fVacas,   setFVacas]   = useState('')
  const [fLitros,  setFLitros]  = useState('')
  const [fNotas,   setFNotas]   = useState('')

  // Campos solo admin
  const [fDestino, setFDestino] = useState('queso')
  const [fLitrosQ, setFLitrosQ] = useState('')
  const [fLitrosV, setFLitrosV] = useState('')
  const [fPrecioL, setFPrecioL] = useState('')
  const [fKilosQ,  setFKilosQ]  = useState('')
  const [fPrecioQ, setFPrecioQ] = useState('')

  // ═══ CARGA ═══
  async function cargar() {
    if (!finca?.id) { setCargando(false); return }
    setCargando(true)
    try {
      const { data, error: err } = await supabase
        .from('leche_diaria')
        .select('*')
        .eq('finca_id', finca.id)
        .order('fecha', { ascending: false })

      if (err) {
        if (err.message?.includes('relation') || err.message?.includes('does not exist') || err.code === '42P01') {
          setTablaFaltante(true)
        }
        setRegistros([])
      } else {
        setTablaFaltante(false)
        setRegistros((data ?? []) as LecheDiaria[])
      }
    } catch {
      setRegistros([])
    }
    setCargando(false)
  }

  useEffect(() => { cargar() }, [finca?.id])

  // ═══ CALCULAR PROMEDIO MÓVIL (últimos 14 días, excluyendo hoy) ═══
  function calcularPromedio(fechaExcluir?: string): number {
    const hace14 = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10)
    const base = registros.filter(r =>
      r.fecha >= hace14 &&
      r.fecha !== (fechaExcluir ?? HOY)
    )
    if (base.length < 3) return 0 // necesita mínimo 3 días para promediar
    return base.reduce((s, r) => s + n(r.litros_total), 0) / base.length
  }

  // ═══ MODAL ═══
  function abrirNuevo() {
    setEditandoId(null); setError('')
    setFFecha(HOY); setFVacas(''); setFLitros('')
    setFDestino('queso'); setFLitrosQ(''); setFLitrosV('')
    setFPrecioL(''); setFKilosQ(''); setFPrecioQ(''); setFNotas('')
    setModalAbierto(true)
  }

  function abrirEditar(r: LecheDiaria) {
    setEditandoId(r.id); setError('')
    setFFecha(r.fecha)
    setFVacas(String(r.vacas_ordenadas))
    setFLitros(String(r.litros_total))
    setFDestino(r.destino ?? 'queso')
    setFLitrosQ(r.litros_queso  != null ? String(r.litros_queso)    : '')
    setFLitrosV(r.litros_venta  != null ? String(r.litros_venta)    : '')
    setFPrecioL(r.precio_litro  != null ? String(r.precio_litro)    : '')
    setFKilosQ (r.kilos_queso   != null ? String(r.kilos_queso)     : '')
    setFPrecioQ(r.precio_queso_kg != null ? String(r.precio_queso_kg) : '')
    setFNotas(r.notas ?? '')
    setModalAbierto(true)
  }

  // ═══ GUARDAR CON VALIDACIÓN DE CAÍDA ═══
  async function guardar(razon?: string) {
    if (!fFecha || !fVacas || !fLitros) {
      setError('Fecha, vacas y litros son obligatorios')
      return
    }
    if (!finca?.id) { setError('No hay finca configurada'); return }

    setGuardando(true)
    setError('')

    const conQueso  = ['queso', 'mixto'].includes(fDestino)
    const conVenta  = ['venta', 'mixto'].includes(fDestino)
    const litrosNum = Number(fLitros)

    const payload: any = {
      finca_id:        finca.id,
      fecha:           fFecha,
      vacas_ordenadas: Number(fVacas),
      litros_total:    litrosNum,
      destino:         esAdmin ? fDestino : 'queso',
      litros_queso:    esAdmin && conQueso && fLitrosQ ? Number(fLitrosQ) : null,
      litros_venta:    esAdmin && conVenta && fLitrosV ? Number(fLitrosV) : null,
      precio_litro:    esAdmin && conVenta && fPrecioL ? Number(fPrecioL) : null,
      kilos_queso:     esAdmin && conQueso && fKilosQ  ? Number(fKilosQ)  : null,
      precio_queso_kg: esAdmin && conQueso && fPrecioQ ? Number(fPrecioQ) : null,
      notas:           fNotas.trim() || (razon ? `Razón caída: ${razon}` : null),
    }

    // ── Detección de caída drástica (solo trabajadores, para alertar al admin) ──
    if (!esAdmin && !editandoId && !razon) {
      const promedio = calcularPromedio(fFecha)
      if (promedio > 0) {
        const pct = ((promedio - litrosNum) / promedio) * 100
        if (pct >= UMBRAL_CAIDA) {
          // Guardar payload y pedir razón antes de continuar
          setPendienteCaida(payload)
          setAlertaCaida({ pct: Math.round(pct), promedio: Math.round(promedio * 10) / 10, actual: litrosNum })
          setRazonCaida('')
          setModalAbierto(false)
          setModalRazon(true)
          setGuardando(false)
          return
        }
      }
    }

    try {
      // ── Modo offline ──
      if (!navigator.onLine) {
        agregarALaCola({
          tabla: 'leche_diaria',
          operacion: editandoId ? 'update' : 'insert',
          payload,
          entidadId: editandoId ?? undefined,
          descripcion: `Registro leche ${payload.fecha}: ${payload.litros_total} litros`,
        })
        setModalAbierto(false)
        setGuardando(false)
        return
      }

      const { error: err } = editandoId
        ? await supabase.from('leche_diaria').update(payload).eq('id', editandoId)
        : await supabase.from('leche_diaria').insert([payload])

      if (err) {
        if (err.message?.includes('relation') || err.code === '42P01') {
          setTablaFaltante(true)
          setModalAbierto(false)
        } else {
          setError(`Error al guardar: ${err.message}`)
        }
      } else {
        setModalAbierto(false)
        setModalRazon(false)
        setPendienteCaida(null)
        setAlertaCaida(null)
        requestAnimationFrame(() => {
          const fechaGuardada = new Date(fFecha + 'T00:00:00')
          setMesVista({ y: fechaGuardada.getFullYear(), m: fechaGuardada.getMonth() + 1 })
          cargar()
        })
      }
    } catch (e: any) {
      setError(`Error inesperado: ${e?.message ?? 'Intenta de nuevo'}`)
    } finally {
      setGuardando(false)
    }
  }

  // ═══ CONFIRMAR RAZÓN DE CAÍDA ═══
  async function confirmarRazonCaida() {
    if (!razonCaida.trim()) { setError('Debes escribir la razón de la baja producción'); return }
    if (!pendienteCaida || !finca?.id) return
    setGuardando(true)
    const payloadConRazon = {
      ...pendienteCaida,
      notas: `[BAJA ${alertaCaida?.pct}%] ${razonCaida.trim()}`,
    }
    const { error: err } = await supabase.from('leche_diaria').insert([payloadConRazon])
    if (err) {
      setError(err.message)
    } else {
      setModalRazon(false)
      setPendienteCaida(null)
      setAlertaCaida(null)
      requestAnimationFrame(() => {
        const fechaGuardada = new Date(pendienteCaida.fecha + 'T00:00:00')
        setMesVista({ y: fechaGuardada.getFullYear(), m: fechaGuardada.getMonth() + 1 })
        cargar()
      })
    }
    setGuardando(false)
  }

  // ═══ ELIMINAR ═══
  async function confirmarEliminar() {
    if (!eliminando) return
    try { await supabase.from('leche_diaria').delete().eq('id', eliminando.id) } catch { /* */ }
    setEliminando(null)
    requestAnimationFrame(() => cargar())
  }

  // ═══ NAVEGACIÓN MES ═══
  function mesSig() { setMesVista(p => p.m === 12 ? { y: p.y + 1, m: 1 } : { y: p.y, m: p.m + 1 }) }
  function mesAnt() { setMesVista(p => p.m === 1 ? { y: p.y - 1, m: 12 } : { y: p.y, m: p.m - 1 }) }

  // ═══ CÁLCULOS DEL MES ═══
  const { y, m } = mesVista
  const delMes = registros.filter(r => {
    const d = new Date(r.fecha + 'T00:00:00')
    return d.getFullYear() === y && d.getMonth() + 1 === m
  })

  const totalLitros    = delMes.reduce((s, r) => s + n(r.litros_total), 0)
  const diasOrdenados  = delMes.length
  const promDiario     = diasOrdenados > 0 ? totalLitros / diasOrdenados : 0
  const promVacas      = diasOrdenados > 0
    ? delMes.reduce((s, r) => s + n(r.vacas_ordenadas), 0) / diasOrdenados : 0
  const totalKilosQ    = delMes.reduce((s, r) => s + n(r.kilos_queso), 0)
  const ingresoVenta   = delMes.reduce((s, r) => s + n(r.litros_venta) * n(r.precio_litro), 0)
  const ingresoQueso   = delMes.reduce((s, r) => s + n(r.kilos_queso)  * n(r.precio_queso_kg), 0)
  const ingresoTotal   = ingresoVenta + ingresoQueso

  const [ay, am] = m === 1 ? [y - 1, 12] : [y, m - 1]
  const totalAnt = registros
    .filter(r => { const d = new Date(r.fecha + 'T00:00:00'); return d.getFullYear() === ay && d.getMonth() + 1 === am })
    .reduce((s, r) => s + n(r.litros_total), 0)
  const tendencia = totalAnt > 0 ? ((totalLitros - totalAnt) / totalAnt) * 100 : null

  const diasDelMes   = new Date(y, m, 0).getDate()
  const maxLitrosMes = Math.max(1, ...delMes.map(r => n(r.litros_total)))
  const gridDias = Array.from({ length: diasDelMes }, (_, i) => {
    const dia   = i + 1
    const fecha = `${y}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return delMes.find(r => r.fecha === fecha) ?? null
  })

  // ─────────────────────────────────────────────────────────────
  if (tablaFaltante) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Milk size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Producción de Leche</h2>
              <p className="text-sm text-gray-500">Se necesita un paso inicial de configuración</p>
            </div>
          </div>
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Database size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Hay que crear la tabla en Supabase</p>
                  <p className="text-sm text-amber-700 mt-1">Este módulo usa una tabla nueva. Sigue estos pasos para habilitarla:</p>
                </div>
              </div>
              <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto select-all leading-relaxed">
{`create table leche_diaria (
  id uuid primary key default gen_random_uuid(),
  finca_id uuid references fincas(id) on delete cascade not null,
  fecha date not null,
  vacas_ordenadas integer not null,
  litros_total numeric(10,2) not null,
  destino text default 'queso',
  litros_queso numeric(10,2),
  litros_venta numeric(10,2),
  precio_litro numeric(10,2),
  kilos_queso numeric(10,2),
  precio_queso_kg numeric(10,2),
  notas text,
  fecha_creacion timestamptz default now()
);
alter table leche_diaria enable row level security;
create policy "acceso_finca" on leche_diaria
  for all using (
    finca_id in (select id from fincas where propietario_id = auth.uid())
  );`}
              </pre>
              <Button onClick={() => { setTablaFaltante(false); cargar() }} className="w-full justify-center">
                ✓ Ya lo hice — cargar módulo
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 flex flex-col gap-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Producción de Leche
            {!esAdmin && (
              <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock size={10} /> Vista trabajador
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500">
            {esAdmin ? 'Registro diario · Queso y ventas' : 'Registra el ordeño diario'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {esAdmin && (
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setVista('mes')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${vista === 'mes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                Por mes
              </button>
              <button onClick={() => setVista('historial')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${vista === 'historial' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                Historial
              </button>
            </div>
          )}
          <Button onClick={abrirNuevo}><Plus size={16} /> {esAdmin ? 'Registrar día' : 'Registrar ordeño'}</Button>
        </div>
      </div>

      {/* Spinner de carga */}
      <Card padding="none" style={{ display: cargando ? 'block' : 'none' }}>
        <div className="flex justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </Card>

      {/* Contenido */}
      <div className="flex flex-col gap-4" style={{ display: cargando ? 'none' : 'flex' }}>

        {/* ═══ VISTA TRABAJADOR SIMPLIFICADA ═══ */}
        {!esAdmin && (
          <div className="flex flex-col gap-4">
            {/* Stats simples */}
            <div className="grid grid-cols-2 gap-3">
              <Card padding="sm">
                <p className="text-xs text-gray-500">Litros hoy</p>
                {(() => {
                  const hoy = registros.find(r => r.fecha === HOY)
                  return hoy
                    ? <p className="text-2xl font-bold text-amber-600 mt-0.5">{n(hoy.litros_total).toFixed(0)} L</p>
                    : <p className="text-sm text-gray-400 mt-1">Sin registro hoy</p>
                })()}
              </Card>
              <Card padding="sm">
                <p className="text-xs text-gray-500">Promedio 7 días</p>
                {(() => {
                  const hace7 = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
                  const ult = registros.filter(r => r.fecha >= hace7)
                  const prom = ult.length > 0 ? ult.reduce((s, r) => s + n(r.litros_total), 0) / ult.length : 0
                  return <p className="text-2xl font-bold text-blue-600 mt-0.5">{prom > 0 ? `${prom.toFixed(1)} L` : '—'}</p>
                })()}
              </Card>
            </div>

            {/* Tabla reciente */}
            <Card padding="none">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Registros recientes</p>
              </div>
              {registros.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Milk size={28} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Sin registros — presiona "Registrar ordeño"</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Día</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Vacas</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Litros</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden sm:table-cell">Notas</th>
                        <th className="text-right px-4 py-2.5 font-medium text-gray-500">Acc.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registros.slice(0, 20).map(r => (
                        <tr key={r.id} className={`border-b border-gray-50 hover:bg-amber-50/30 transition-colors ${r.notas?.startsWith('[BAJA') ? 'bg-red-50/20' : ''}`}>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{fmtFecha(r.fecha)}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1 text-gray-700"><Beef size={12} className="text-gray-400" />{r.vacas_ordenadas}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-base font-bold text-amber-700">{n(r.litros_total).toFixed(0)}</span>
                            <span className="text-xs text-gray-400 ml-1">L</span>
                            {r.notas?.startsWith('[BAJA') && (
                              <span className="ml-1 text-[10px] text-red-600 font-semibold">↓ Baja</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-400 hidden sm:table-cell max-w-[200px] truncate">
                            {r.notas ?? '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => abrirEditar(r)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Pencil size={13} /></button>
                              <button onClick={() => setEliminando(r)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ═══ VISTA ADMIN COMPLETA ═══ */}
        {esAdmin && (
          <>
            {vista === 'mes' && (
              <div className="flex flex-col gap-4">
                {/* Navegación mes */}
                <div className="flex items-center justify-between">
                  <button onClick={mesAnt} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    <ChevronLeft size={16} /> Anterior
                  </button>
                  <h3 className="text-sm font-semibold text-gray-900 capitalize">{mesLabel(y, m)}</h3>
                  <button onClick={mesSig} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    Siguiente <ChevronRight size={16} />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Total litros', valor: `${totalLitros.toFixed(0)} L`,
                      sub: tendencia !== null ? `${tendencia >= 0 ? '↑' : '↓'} ${Math.abs(tendencia).toFixed(0)}% vs mes ant.` : `${diasOrdenados} días de ordeño`,
                      icon: <Milk size={18} />, color: 'text-amber-600', bg: 'bg-amber-50',
                    },
                    {
                      label: 'Promedio diario', valor: `${promDiario.toFixed(1)} L`,
                      sub: `${promVacas.toFixed(1)} vacas/día promedio`,
                      icon: <BarChart3 size={18} />, color: 'text-blue-600', bg: 'bg-blue-50',
                    },
                    {
                      label: 'Queso producido', valor: `${totalKilosQ.toFixed(1)} kg`,
                      sub: ingresoQueso > 0 ? fmtPesos(ingresoQueso) : 'Sin precio registrado',
                      icon: <span className="text-lg leading-none">🧀</span>, color: 'text-yellow-700', bg: 'bg-yellow-50',
                    },
                    {
                      label: 'Ingresos del mes', valor: ingresoTotal > 0 ? fmtPesos(ingresoTotal) : '—',
                      sub: ingresoVenta > 0 ? `Leche: ${fmtPesos(ingresoVenta)}` : 'Sin registros de venta',
                      icon: <DollarSign size={18} />, color: 'text-green-600', bg: 'bg-green-50',
                    },
                  ].map(s => (
                    <Card key={s.label} padding="sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500">{s.label}</p>
                          <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.valor}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                        </div>
                        <span className={`p-2 rounded-lg ${s.bg} ${s.color} flex-shrink-0`}>{s.icon}</span>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Gráfico */}
                <Card padding="sm" style={{ display: delMes.length > 0 ? 'block' : 'none' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-800">Producción diaria</p>
                    <p className="text-xs text-gray-400">Máx: {maxLitrosMes.toFixed(0)} L</p>
                  </div>
                  <div className="flex items-end gap-0.5 h-24">
                    {gridDias.map((r, i) => {
                      const pct = r ? (n(r.litros_total) / maxLitrosMes) * 100 : 0
                      const tieneAlerta = r?.notas?.startsWith('[BAJA')
                      const clr = r
                        ? tieneAlerta ? 'bg-red-400'
                        : r.destino === 'queso' ? 'bg-amber-400'
                        : r.destino === 'venta' ? 'bg-green-400'
                        : r.destino === 'mixto' ? 'bg-blue-400'
                        : 'bg-gray-300'
                        : 'bg-transparent'
                      return (
                        <div key={i} className="flex flex-col items-center flex-1 min-w-0" title={r ? `Día ${i+1}: ${n(r.litros_total).toFixed(0)}L` : `Día ${i+1}: sin registro`}>
                          <div className="w-full flex flex-col justify-end" style={{ height: 80 }}>
                            <div className={`w-full rounded-t ${clr}`} style={{ height: r ? `${Math.max(pct, 3)}%` : 1 }} />
                          </div>
                          {diasDelMes <= 16 && <span className="text-[8px] text-gray-400 mt-0.5">{i + 1}</span>}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-4 mt-2 flex-wrap">
                    {[['bg-amber-400','Queso'],['bg-green-400','Venta'],['bg-blue-400','Mixto'],['bg-red-400','Baja registrada']].map(([c,l]) => (
                      <div key={l} className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-sm ${c}`} />
                        <span className="text-[10px] text-gray-500">{l}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Tabla detalle */}
                <Card padding="none">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">Detalle del mes</p>
                    <span className="text-xs text-gray-400">{diasOrdenados} / {diasDelMes} días registrados</span>
                  </div>
                  {delMes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <Milk size={28} className="text-gray-300 mb-2" />
                      <p className="text-sm text-gray-400">Sin registros en {mesLabel(y, m)}</p>
                      <button onClick={abrirNuevo} className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium">+ Registrar primer día del mes</button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left px-4 py-2.5 font-medium text-gray-500">Día</th>
                            <th className="text-left px-4 py-2.5 font-medium text-gray-500">Vacas</th>
                            <th className="text-left px-4 py-2.5 font-medium text-gray-500">Litros</th>
                            <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden sm:table-cell">Destino</th>
                            <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Queso</th>
                            <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Ingresos</th>
                            <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden lg:table-cell">Notas</th>
                            <th className="text-right px-4 py-2.5 font-medium text-gray-500">Acc.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...delMes].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(r => {
                            const ingreso = n(r.litros_venta) * n(r.precio_litro) + n(r.kilos_queso) * n(r.precio_queso_kg)
                            const dest    = DESTINOS.find(d => d.v === r.destino)
                            const tieneAlerta = r.notas?.startsWith('[BAJA')
                            return (
                              <tr key={r.id} className={`border-b border-gray-50 hover:bg-amber-50/30 transition-colors ${tieneAlerta ? 'bg-red-50/30' : ''}`}>
                                <td className="px-4 py-2.5 font-medium text-gray-900">
                                  {fmtFecha(r.fecha)}
                                  {tieneAlerta && <TrendingDown size={12} className="inline ml-1 text-red-500" />}
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-1 text-gray-700"><Beef size={12} className="text-gray-400" />{r.vacas_ordenadas}</div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className="text-base font-bold text-amber-700">{n(r.litros_total).toFixed(0)}</span>
                                  <span className="text-xs text-gray-400 ml-1">L</span>
                                </td>
                                <td className="px-4 py-2.5 hidden sm:table-cell">
                                  {dest && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dest.color}`}>{dest.l}</span>}
                                </td>
                                <td className="px-4 py-2.5 text-gray-700 hidden md:table-cell">
                                  {r.kilos_queso ? `${n(r.kilos_queso).toFixed(1)} kg` : '—'}
                                </td>
                                <td className="px-4 py-2.5 hidden md:table-cell">
                                  {ingreso > 0 ? <span className="text-green-700 font-semibold">{fmtPesos(ingreso)}</span> : <span className="text-gray-400 text-xs">—</span>}
                                </td>
                                <td className="px-4 py-2.5 text-gray-500 hidden lg:table-cell text-xs max-w-[160px] truncate">
                                  {r.notas ?? '—'}
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center justify-end gap-1">
                                    <button onClick={() => abrirEditar(r)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Pencil size={13} /></button>
                                    <button onClick={() => setEliminando(r)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot className="bg-amber-50 border-t-2 border-amber-200">
                          <tr>
                            <td className="px-4 py-2.5 font-bold text-gray-800 text-xs uppercase tracking-wide">Total</td>
                            <td className="px-4 py-2.5 text-xs text-gray-600">
                              {diasOrdenados > 0 ? `${(delMes.reduce((s,r)=>s+n(r.vacas_ordenadas),0)/diasOrdenados).toFixed(0)} prom` : '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="font-bold text-amber-700">{totalLitros.toFixed(0)}</span>
                              <span className="text-xs text-gray-400 ml-1">L</span>
                            </td>
                            <td className="hidden sm:table-cell" />
                            <td className="px-4 py-2.5 font-semibold text-gray-700 hidden md:table-cell">
                              {totalKilosQ > 0 ? `${totalKilosQ.toFixed(1)} kg` : '—'}
                            </td>
                            <td className="px-4 py-2.5 hidden md:table-cell">
                              {ingresoTotal > 0 ? <span className="font-bold text-green-700">{fmtPesos(ingresoTotal)}</span> : '—'}
                            </td>
                            <td className="hidden lg:table-cell" />
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ═══ VISTA HISTORIAL ═══ */}
            {vista === 'historial' && (
              <Card padding="none">
                {registros.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Milk size={32} className="text-gray-300 mb-3" />
                    <p className="text-base font-semibold text-gray-700">Sin registros de leche</p>
                    <button onClick={abrirNuevo} className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium">+ Registrar primer día</button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-500">Vacas</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-500">Litros</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Destino</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Queso</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Ingresos</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registros.map(r => {
                          const ingreso = n(r.litros_venta)*n(r.precio_litro) + n(r.kilos_queso)*n(r.precio_queso_kg)
                          const dest    = DESTINOS.find(d => d.v === r.destino)
                          return (
                            <tr key={r.id} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                              <td className="px-4 py-2.5 font-medium text-gray-900">{fmtFecha(r.fecha)}</td>
                              <td className="px-4 py-2.5 text-gray-700">{r.vacas_ordenadas}</td>
                              <td className="px-4 py-2.5">
                                <span className="font-bold text-amber-700">{n(r.litros_total).toFixed(0)}</span>
                                <span className="text-xs text-gray-400 ml-1">L</span>
                              </td>
                              <td className="px-4 py-2.5 hidden sm:table-cell">
                                {dest && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dest.color}`}>{dest.l}</span>}
                              </td>
                              <td className="px-4 py-2.5 text-gray-700 hidden md:table-cell">
                                {r.kilos_queso ? `${n(r.kilos_queso).toFixed(1)} kg` : '—'}
                              </td>
                              <td className="px-4 py-2.5 hidden md:table-cell">
                                {ingreso > 0 ? <span className="text-green-700 font-semibold">{fmtPesos(ingreso)}</span> : <span className="text-gray-400 text-xs">—</span>}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => abrirEditar(r)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Pencil size={14} /></button>
                                  <button onClick={() => setEliminando(r)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>

      {/* ════ MODAL REGISTRAR / EDITAR ════ */}
      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)}
        titulo={editandoId ? 'Editar registro' : (esAdmin ? 'Registrar producción del día' : 'Registrar ordeño de hoy')} tamano="lg">
        <div className="flex flex-col gap-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

          <Input label="Fecha *" type="date" value={fFecha} onChange={e => setFFecha(e.target.value)} />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">¿Cuántas vacas ordeñaste hoy? *</label>
              <input type="number" min="0" step="1" value={fVacas} onChange={e => setFVacas(e.target.value)}
                placeholder="Ej: 8"
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">¿Cuántos litros en total? *</label>
              <input type="number" min="0" step="0.5" value={fLitros} onChange={e => setFLitros(e.target.value)}
                placeholder="Ej: 85"
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>

          {fVacas && fLitros && Number(fVacas) > 0 && Number(fLitros) > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <Milk size={16} className="text-amber-600" />
              <p className="text-sm text-amber-800">
                Promedio: <strong>{(Number(fLitros) / Number(fVacas)).toFixed(1)} L por vaca</strong>
              </p>
            </div>
          )}

          {/* Sección queso/venta — solo admin */}
          {esAdmin && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">¿Qué se hace con la leche?</label>
                <div className="grid grid-cols-2 gap-2">
                  {DESTINOS.map(d => (
                    <button key={d.v} onClick={() => setFDestino(d.v)}
                      className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium text-left transition-colors ${fDestino === d.v ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                      {d.l}
                    </button>
                  ))}
                </div>
              </div>

              {(fDestino === 'queso' || fDestino === 'mixto') && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col gap-3">
                  <p className="text-xs font-semibold text-yellow-800">🧀 Datos del queso</p>
                  <div className="grid grid-cols-2 gap-3">
                    {fDestino === 'mixto' && (
                      <Input label="Litros para queso" type="number" step="0.1" placeholder="Ej: 60" value={fLitrosQ} onChange={e => setFLitrosQ(e.target.value)} />
                    )}
                    <Input label="Kilos de queso obtenidos" type="number" step="0.1" placeholder="Ej: 7.5" value={fKilosQ} onChange={e => setFKilosQ(e.target.value)} />
                    <Input label="Precio kg queso ($)" type="number" placeholder="Ej: 15000" value={fPrecioQ} onChange={e => setFPrecioQ(e.target.value)} />
                  </div>
                </div>
              )}

              {(fDestino === 'venta' || fDestino === 'mixto') && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex flex-col gap-3">
                  <p className="text-xs font-semibold text-green-800">💰 Datos de la venta</p>
                  <div className="grid grid-cols-2 gap-3">
                    {fDestino === 'mixto' && (
                      <Input label="Litros para venta" type="number" step="0.1" placeholder="Ej: 25" value={fLitrosV} onChange={e => setFLitrosV(e.target.value)} />
                    )}
                    <Input label="Precio por litro ($)" type="number" placeholder="Ej: 1200" value={fPrecioL} onChange={e => setFPrecioL(e.target.value)} />
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas (opcional)</label>
            <textarea value={fNotas} onChange={e => setFNotas(e.target.value)} rows={2}
              placeholder="Ej: Llovió, algunas vacas enfermas..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variante="secundario" onClick={() => setModalAbierto(false)}>Cancelar</Button>
            <Button onClick={() => guardar()} cargando={guardando}>
              {editandoId ? 'Guardar cambios' : 'Guardar registro'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ════ MODAL RAZÓN DE CAÍDA ════ */}
      <Modal abierto={modalRazon} onCerrar={() => { setModalRazon(false); setPendienteCaida(null) }}
        titulo="Producción baja detectada" tamano="md">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">
                Bajó un {alertaCaida?.pct}% respecto al promedio
              </p>
              <p className="text-sm text-red-700 mt-0.5">
                Promedio reciente: <strong>{alertaCaida?.promedio} L</strong> — Hoy registraste: <strong>{alertaCaida?.actual} L</strong>
              </p>
              <p className="text-xs text-red-600 mt-1">El administrador será notificado de esta baja.</p>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              ¿Cuál fue la razón de la baja producción? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={razonCaida}
              onChange={e => setRazonCaida(e.target.value)}
              rows={3}
              placeholder="Ej: Llovió mucho en la mañana, vaca enferma, corte de luz en la tarde..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variante="secundario" onClick={() => { setModalRazon(false); setPendienteCaida(null) }}>
              Cancelar
            </Button>
            <Button onClick={confirmarRazonCaida} cargando={guardando} variante="peligro">
              Registrar y notificar al admin
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal eliminar */}
      <Modal abierto={!!eliminando} onCerrar={() => setEliminando(null)} titulo="Eliminar registro" tamano="sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              ¿Eliminar el registro del <strong>{eliminando && fmtFecha(eliminando.fecha)}</strong>?
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variante="secundario" onClick={() => setEliminando(null)}>Cancelar</Button>
            <Button variante="peligro" onClick={confirmarEliminar}>Sí, eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
