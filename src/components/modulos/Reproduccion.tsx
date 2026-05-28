import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Animal, Inseminacion, Parto } from '@/types'
import {
  Plus, Heart, Baby, Pencil, Trash2, Search,
  AlertTriangle, Beef, CalendarDays, TrendingUp,
} from 'lucide-react'

// ── Constantes ───────────────────────────────────────────────────
type Tab = 'inseminaciones' | 'partos'

const TIPOS_INSEM  = ['Inseminación Artificial', 'IATF', 'Monta Natural', 'Transferencia de Embrión']
const RESULTADOS_I = ['Pendiente', 'Preñada', 'Vacía', 'Repetidora', 'Absorbida']
const TIPOS_PARTO  = ['Normal', 'Distócico', 'Cesárea', 'Gemelar', 'Aborto']

const DIAS_GESTACION = 280 // promedio bovino

// ── Helpers ──────────────────────────────────────────────────────
function fmtFecha(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function diasDesde(d: string): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  return Math.floor((hoy.getTime() - new Date(d + 'T00:00:00').getTime()) / 86_400_000)
}

function diasHasta(d: string): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(d + 'T00:00:00').getTime() - hoy.getTime()) / 86_400_000)
}

function fechaParto(fechaInsem: string): string {
  const f = new Date(fechaInsem + 'T00:00:00')
  f.setDate(f.getDate() + DIAS_GESTACION)
  return f.toISOString().slice(0, 10)
}

// Chip del estado gestacional
function ChipGestacion({ fechaInsem }: { fechaInsem: string }) {
  const dias = diasDesde(fechaInsem)
  const restantes = DIAS_GESTACION - dias
  const pct = Math.min(100, Math.round((dias / DIAS_GESTACION) * 100))

  if (restantes <= 0)
    return <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">¡Parto inminente!</span>
  if (restantes <= 21)
    return <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">Faltan {restantes}d</span>
  if (restantes <= 60)
    return <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Faltan {restantes}d</span>

  const trimestre = dias < 90 ? '1er trim.' : dias < 180 ? '2do trim.' : '3er trim.'
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-600">{trimestre} · {dias}d</span>
      <div className="w-20 bg-gray-200 rounded-full h-1.5">
        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ChipResultadoInsem({ resultado }: { resultado?: string }) {
  const r = resultado ?? 'Pendiente'
  if (r === 'Preñada')    return <Badge variante="verde">🤰 Preñada</Badge>
  if (r === 'Vacía')      return <Badge variante="rojo">Vacía</Badge>
  if (r === 'Repetidora') return <Badge variante="naranja">Repetidora</Badge>
  if (r === 'Absorbida')  return <Badge variante="gris">Absorbida</Badge>
  return <Badge variante="amarillo">Pendiente</Badge>
}

// ── Componente principal ──────────────────────────────────────────
export function Reproduccion() {
  const { finca } = useAuthStore()
  const HOY = new Date().toISOString().slice(0, 10)
  const ANIO_ACTUAL = new Date().getFullYear()

  // ── Datos ──
  const [hembras,       setHembras]       = useState<Animal[]>([])
  const [inseminaciones, setInseminaciones] = useState<Inseminacion[]>([])
  const [partos,        setPartos]        = useState<Parto[]>([])
  const [cargando,      setCargando]      = useState(true)

  // ── UI ──
  const [tab,           setTab]           = useState<Tab>('inseminaciones')
  const [busqueda,      setBusqueda]      = useState('')
  const [filtroRes,     setFiltroRes]     = useState<string>('todos')

  // ── Modal ──
  const [modalAbierto,  setModalAbierto]  = useState(false)
  const [editandoId,    setEditandoId]    = useState<string | null>(null)
  const [guardando,     setGuardando]     = useState(false)
  const [error,         setError]         = useState('')
  const [eliminando, setEliminando] = useState<{ id: string; tipo: Tab; label: string } | null>(null)

  // ── Campos Inseminación ──
  const [iVaca,     setIVaca]     = useState('')
  const [iFecha,    setIFecha]    = useState(HOY)
  const [iTipo,     setITipo]     = useState('IATF')
  const [iSemen,    setISemen]    = useState('')
  const [iRes,      setIRes]      = useState('Pendiente')
  const [iDetec,    setIDetec]    = useState('')
  const [iSemanas,  setISemanas]  = useState('')

  // ── Campos Parto ──
  const [pMadre,    setPMadre]    = useState('')
  const [pFecha,    setPFecha]    = useState(HOY)
  const [pTipo,     setPTipo]     = useState('Normal')
  const [pSexoCria, setPSexoCria] = useState<'macho' | 'hembra' | ''>('')
  const [pPesoCria, setPPesoCria] = useState('')
  const [pCompl,    setPCompl]    = useState('')
  const [pVet,      setPVet]      = useState('')
  const [crearCria, setCrearCria] = useState(false)
  const [nombreCria,setNombreCria]= useState('')

  // ═══ CARGA ═══
  async function cargar() {
    if (!finca?.id) { setCargando(false); return }
    setCargando(true)

    const { data: animData } = await supabase
      .from('animales')
      .select('id, nombre, numero_arete, foto_url, especie, sexo')
      .eq('finca_id', finca.id)
      .eq('sexo', 'hembra')
      .order('nombre')

    const hem = (animData ?? []) as Animal[]
    setHembras(hem)

    if (hem.length > 0) {
      const ids = hem.map(a => a.id)
      const [{ data: insData }, { data: parData }] = await Promise.all([
        supabase.from('inseminaciones').select('*').in('vaca_id', ids).order('fecha_inseminacion', { ascending: false }),
        supabase.from('partos').select('*').in('madre_id', ids).order('fecha_parto', { ascending: false }),
      ])
      setInseminaciones((insData ?? []) as Inseminacion[])
      setPartos((parData ?? []) as Parto[])
    } else {
      setInseminaciones([]); setPartos([])
    }

    setCargando(false)
  }

  useEffect(() => { cargar() }, [finca?.id])

  // ─── Helpers ───
  function nombreHembra(id: string) {
    const a = hembras.find(x => x.id === id)
    return a ? `${a.nombre}${a.numero_arete ? ` (${a.numero_arete})` : ''}` : '—'
  }
  function fotoHembra(id: string) { return hembras.find(x => x.id === id)?.foto_url ?? null }

  // ═══ ABRIR MODAL CREAR ═══
  function abrirNuevo() {
    setEditandoId(null); setError('')
    if (tab === 'inseminaciones') {
      setIVaca(''); setIFecha(HOY); setITipo('IATF'); setISemen('')
      setIRes('Pendiente'); setIDetec(''); setISemanas('')
    } else {
      setPMadre(''); setPFecha(HOY); setPTipo('Normal'); setPSexoCria('')
      setPPesoCria(''); setPCompl(''); setPVet('')
      setCrearCria(false); setNombreCria('')
    }
    setModalAbierto(true)
  }

  // ═══ ABRIR EDITAR ═══
  function abrirEditar(r: Inseminacion | Parto, tipo: Tab) {
    setEditandoId(r.id); setError('')
    if (tipo === 'inseminaciones') {
      const i = r as Inseminacion
      setIVaca(i.vaca_id); setIFecha(i.fecha_inseminacion); setITipo(i.tipo ?? 'IATF')
      setISemen(i.semen_toro_raza ?? ''); setIRes(i.resultado ?? 'Pendiente')
      setIDetec(i.fecha_deteccion_prenez ?? ''); setISemanas(i.semanas_gestacion?.toString() ?? '')
    } else {
      const p = r as Parto
      setPMadre(p.madre_id); setPFecha(p.fecha_parto); setPTipo(p.tipo_parto ?? 'Normal')
      setPSexoCria((p.sexo_cria as any) ?? ''); setPPesoCria(p.peso_cria?.toString() ?? '')
      setPCompl(p.complicaciones ?? ''); setPVet(p.veterinario ?? '')
      setCrearCria(false); setNombreCria('')
    }
    setModalAbierto(true)
  }

  // ═══ GUARDAR ═══
  async function guardar() {
    setGuardando(true); setError('')
    try {
      if (tab === 'inseminaciones') {
        if (!iVaca || !iFecha) { setError('Selecciona la vaca y la fecha'); setGuardando(false); return }
        const payload = {
          vaca_id: iVaca, fecha_inseminacion: iFecha, tipo: iTipo,
          semen_toro_raza: iSemen.trim() || null,
          resultado: iRes,
          fecha_deteccion_prenez: iDetec || null,
          semanas_gestacion: iSemanas ? Number(iSemanas) : null,
        }
        const res = editandoId
          ? await supabase.from('inseminaciones').update(payload).eq('id', editandoId).select().single()
          : await supabase.from('inseminaciones').insert([payload]).select().single()
        if (res.error) { setError(res.error.message); setGuardando(false); return }

      } else {
        if (!pMadre || !pFecha) { setError('Selecciona la madre y la fecha'); setGuardando(false); return }
        const payload: any = {
          madre_id: pMadre, fecha_parto: pFecha, tipo_parto: pTipo,
          sexo_cria: pSexoCria || null,
          peso_cria: pPesoCria ? Number(pPesoCria) : null,
          complicaciones: pCompl.trim() || null,
          veterinario: pVet.trim() || null,
        }

        // Crear cría como animal si el usuario lo pidió
        if (!editandoId && crearCria && pSexoCria) {
          const madre = hembras.find(h => h.id === pMadre)
          const { data: criaData } = await supabase.from('animales').insert([{
            finca_id: finca!.id,
            nombre: nombreCria.trim() || `Cría de ${madre?.nombre ?? ''}`,
            sexo: pSexoCria,
            especie: madre?.especie ?? 'bovino',
            peso_actual: pPesoCria ? Number(pPesoCria) : null,
            fecha_nacimiento: pFecha,
            genealogia_madre_id: pMadre,
            estado: 'sano',
          }]).select().single()
          if (criaData) payload.cria_id = criaData.id
        }

        const res = editandoId
          ? await supabase.from('partos').update(payload).eq('id', editandoId).select().single()
          : await supabase.from('partos').insert([payload]).select().single()
        if (res.error) { setError(res.error.message); setGuardando(false); return }
      }

      setModalAbierto(false)
      requestAnimationFrame(() => cargar())
    } catch { setError('Error al guardar. Intenta de nuevo.') }
    setGuardando(false)
  }

  // ═══ ELIMINAR ═══
  async function confirmarEliminar() {
    if (!eliminando) return
    const tabla = eliminando.tipo === 'inseminaciones' ? 'inseminaciones' : 'partos'
    await supabase.from(tabla).delete().eq('id', eliminando.id)
    setEliminando(null)
    requestAnimationFrame(() => cargar())
  }

  // ═══ ESTADÍSTICAS ═══
  const prenadas  = inseminaciones.filter(i => i.resultado === 'Preñada')
  const totalIns  = inseminaciones.length
  const tasaPrenez = totalIns > 0 ? Math.round((prenadas.length / totalIns) * 100) : 0

  const proximosPartos = prenadas.filter(i => {
    const d = diasHasta(fechaParto(i.fecha_inseminacion))
    return d >= 0 && d <= 60
  }).length

  const partosAnio = partos.filter(p =>
    new Date(p.fecha_parto + 'T00:00:00').getFullYear() === ANIO_ACTUAL
  ).length

  // ═══ FILTROS ═══
  const hemIds = busqueda
    ? hembras.filter(h =>
        h.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (h.numero_arete ?? '').toLowerCase().includes(busqueda.toLowerCase())
      ).map(h => h.id)
    : null

  const insFiltr = inseminaciones
    .filter(i => !hemIds || hemIds.includes(i.vaca_id))
    .filter(i => filtroRes === 'todos' || i.resultado === filtroRes)

  const parFiltr = partos.filter(p => !hemIds || hemIds.includes(p.madre_id))

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 flex flex-col gap-4">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Reproducción</h2>
          <p className="text-sm text-gray-500">IATF, inseminaciones y partos</p>
        </div>
        <Button onClick={abrirNuevo}>
          <Plus size={16} />
          {tab === 'inseminaciones' ? 'Registrar Inseminación' : 'Registrar Parto'}
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Vacas preñadas',
            valor: prenadas.length,
            sub: `de ${hembras.length} hembras`,
            icon: <Heart size={18} />,
            color: prenadas.length > 0 ? 'text-pink-600' : 'text-gray-500',
            bg: prenadas.length > 0 ? 'bg-pink-50' : 'bg-gray-50',
          },
          {
            label: 'Próximos partos',
            valor: proximosPartos,
            sub: 'en los próximos 60 días',
            icon: <Baby size={18} />,
            color: proximosPartos > 0 ? 'text-amber-600' : 'text-gray-500',
            bg: proximosPartos > 0 ? 'bg-amber-50' : 'bg-gray-50',
          },
          {
            label: `Partos ${ANIO_ACTUAL}`,
            valor: partosAnio,
            sub: `${partos.length} histórico total`,
            icon: <CalendarDays size={18} />,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            label: 'Tasa de preñez',
            valor: `${tasaPrenez}%`,
            sub: `${totalIns} inseminaciones`,
            icon: <TrendingUp size={18} />,
            color: tasaPrenez >= 60 ? 'text-green-600' : tasaPrenez >= 40 ? 'text-amber-600' : 'text-red-500',
            bg: tasaPrenez >= 60 ? 'bg-green-50' : tasaPrenez >= 40 ? 'bg-amber-50' : 'bg-red-50',
          },
        ].map(s => (
          <Card key={s.label} padding="sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.valor}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
              <span className={`p-2 rounded-lg ${s.bg} ${s.color}`}>{s.icon}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Buscador + Tabs ── */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre o arete..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              icono={<Search size={14} />}
            />
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {([
              { key: 'inseminaciones', label: 'Inseminaciones', icon: <Heart size={14} />,       n: inseminaciones.length },
              { key: 'partos',         label: 'Partos',          icon: <Baby size={14} />,         n: partos.length },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center ${
                  tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t.icon} {t.label}
                {t.n > 0 && (
                  <span className={`px-1.5 py-px rounded-full text-[10px] font-bold ${tab === t.key ? 'bg-pink-100 text-pink-700' : 'bg-gray-200 text-gray-500'}`}>{t.n}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro resultado (solo en inseminaciones) */}
        {tab === 'inseminaciones' && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            <span className="text-xs font-medium text-gray-500">Resultado:</span>
            {['todos', ...RESULTADOS_I].map(r => (
              <button key={r} onClick={() => setFiltroRes(r)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  filtroRes === r
                    ? 'bg-pink-600 text-white border-pink-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>
                {r === 'todos' ? 'Todos' : r}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* ── Contenido ── */}
      {cargando ? (
        <Card>
          <div className="flex justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-pink-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </Card>
      ) : hembras.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Beef size={32} className="text-gray-300 mb-3" />
            <p className="text-base font-semibold text-gray-700">Sin hembras registradas</p>
            <p className="text-sm text-gray-400 mt-1">Primero agrega animales hembras en el módulo <strong>Animales</strong></p>
          </div>
        </Card>
      ) : (
        <>

          {/* ─── INSEMINACIONES ─── */}
          {tab === 'inseminaciones' && (
            <Card padding="none">
              {insFiltr.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Heart size={28} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Sin inseminaciones registradas</p>
                  <button onClick={abrirNuevo} className="mt-3 text-sm text-pink-600 hover:text-pink-700 font-medium">
                    + Registrar primera inseminación
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Vaca</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Fecha</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Tipo</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Semen / Toro</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Resultado</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Gestación / Parto</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insFiltr.map(i => {
                        const esPrenada = i.resultado === 'Preñada'
                        const fparto = esPrenada ? fechaParto(i.fecha_inseminacion) : null
                        return (
                          <tr key={i.id} className="border-b border-gray-50 hover:bg-pink-50/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {fotoHembra(i.vaca_id) ? (
                                  <img src={fotoHembra(i.vaca_id)!} className="w-7 h-7 rounded-full object-cover" alt="" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center">
                                    <Beef size={12} className="text-pink-500" />
                                  </div>
                                )}
                                <span className="font-medium text-gray-900 text-xs">{nombreHembra(i.vaca_id)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{fmtFecha(i.fecha_inseminacion)}</td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <Badge variante="gris">{i.tipo ?? '—'}</Badge>
                            </td>
                            <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{i.semen_toro_raza ?? '—'}</td>
                            <td className="px-4 py-3">
                              <ChipResultadoInsem resultado={i.resultado} />
                            </td>
                            <td className="px-4 py-3">
                              {esPrenada && fparto ? (
                                <div className="flex flex-col gap-1">
                                  <ChipGestacion fechaInsem={i.fecha_inseminacion} />
                                  <span className="text-xs text-gray-400">Parto est. {fmtFecha(fparto)}</span>
                                </div>
                              ) : (
                                i.fecha_deteccion_prenez
                                  ? <span className="text-xs text-gray-500">Detec. {fmtFecha(i.fecha_deteccion_prenez)}</span>
                                  : <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => abrirEditar(i, 'inseminaciones')}
                                  className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => setEliminando({ id: i.id, tipo: 'inseminaciones', label: `${i.tipo ?? 'Insem.'} — ${nombreHembra(i.vaca_id)}` })}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 size={14} />
                                </button>
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

          {/* ─── PARTOS ─── */}
          {tab === 'partos' && (
            <Card padding="none">
              {parFiltr.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Baby size={28} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Sin partos registrados</p>
                  <button onClick={abrirNuevo} className="mt-3 text-sm text-pink-600 hover:text-pink-700 font-medium">
                    + Registrar primer parto
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Madre</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Tipo</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Cría</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Complicaciones</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Veterinario</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parFiltr.map(p => (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-pink-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {fotoHembra(p.madre_id) ? (
                                <img src={fotoHembra(p.madre_id)!} className="w-7 h-7 rounded-full object-cover" alt="" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center">
                                  <Beef size={12} className="text-pink-500" />
                                </div>
                              )}
                              <span className="font-medium text-gray-900 text-xs">{nombreHembra(p.madre_id)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{fmtFecha(p.fecha_parto)}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <Badge variante={p.tipo_parto === 'Normal' ? 'verde' : p.tipo_parto === 'Cesárea' ? 'azul' : p.tipo_parto === 'Aborto' ? 'rojo' : 'amarillo'}>
                              {p.tipo_parto ?? 'Normal'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {p.sexo_cria ? (
                              <div>
                                <span className={`text-sm font-medium ${p.sexo_cria === 'hembra' ? 'text-pink-600' : 'text-blue-600'}`}>
                                  {p.sexo_cria === 'hembra' ? '♀ Hembra' : '♂ Macho'}
                                </span>
                                {p.peso_cria && <p className="text-xs text-gray-400">{p.peso_cria} kg</p>}
                                {p.cria_id && <p className="text-[10px] text-green-600 font-medium">✓ En inventario</p>}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                            {p.complicaciones
                              ? <span className="text-red-600 text-xs">{p.complicaciones}</span>
                              : <span className="text-green-600 text-xs">Sin complicaciones</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{p.veterinario ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => abrirEditar(p, 'partos')}
                                className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setEliminando({ id: p.id, tipo: 'partos', label: `Parto de ${nombreHembra(p.madre_id)} — ${fmtFecha(p.fecha_parto)}` })}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
           MODAL CREAR / EDITAR
         ═══════════════════════════════════════════════════════════ */}
      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo={tab === 'inseminaciones'
          ? (editandoId ? 'Editar Inseminación' : 'Registrar Inseminación / IATF')
          : (editandoId ? 'Editar Parto' : 'Registrar Parto')}
        tamano="xl"
      >
        <div className="flex flex-col gap-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

          {/* ── Formulario Inseminación ── */}
          {tab === 'inseminaciones' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Vaca *</label>
                <select value={iVaca} onChange={e => setIVaca(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                  <option value="">Seleccionar vaca...</option>
                  {hembras.map(h => <option key={h.id} value={h.id}>{h.nombre}{h.numero_arete ? ` (${h.numero_arete})` : ''}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Fecha inseminación *" type="date" value={iFecha} onChange={e => setIFecha(e.target.value)} />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Tipo</label>
                  <select value={iTipo} onChange={e => setITipo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                    {TIPOS_INSEM.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <Input
                label="Semen / Raza del toro"
                placeholder="Ej: Brahman rojo, Gyr MF456"
                value={iSemen}
                onChange={e => setISemen(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Resultado</label>
                  <select value={iRes} onChange={e => setIRes(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                    {RESULTADOS_I.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <Input
                  label="Fecha detección preñez"
                  type="date"
                  value={iDetec}
                  onChange={e => setIDetec(e.target.value)}
                />
              </div>

              {iRes === 'Preñada' && iFecha && (
                <div className="flex items-center gap-3 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                  <Baby size={18} className="text-pink-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-pink-800">Parto estimado</p>
                    <p className="text-sm text-pink-700">{fmtFecha(fechaParto(iFecha))} ({DIAS_GESTACION} días de gestación)</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Formulario Parto ── */}
          {tab === 'partos' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Madre *</label>
                <select value={pMadre} onChange={e => setPMadre(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                  <option value="">Seleccionar vaca...</option>
                  {hembras.map(h => <option key={h.id} value={h.id}>{h.nombre}{h.numero_arete ? ` (${h.numero_arete})` : ''}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Fecha del parto *" type="date" value={pFecha} onChange={e => setPFecha(e.target.value)} />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Tipo de parto</label>
                  <select value={pTipo} onChange={e => setPTipo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                    {TIPOS_PARTO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Cría */}
              <div className="p-4 bg-gray-50 rounded-lg flex flex-col gap-3">
                <p className="text-sm font-semibold text-gray-800">Datos de la cría</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Sexo de la cría</label>
                    <div className="flex gap-2">
                      {([['hembra', '♀ Hembra'], ['macho', '♂ Macho']] as const).map(([v, l]) => (
                        <button key={v} onClick={() => setPSexoCria(v)}
                          className={`flex-1 px-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            pSexoCria === v
                              ? 'bg-pink-50 border-pink-300 text-pink-700'
                              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input label="Peso al nacer (kg)" type="number" placeholder="Ej: 32" value={pPesoCria} onChange={e => setPPesoCria(e.target.value)} />
                </div>

                {/* Crear cría como animal — solo en modo crear */}
                {!editandoId && pSexoCria && (
                  <div className="border-t border-gray-200 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={crearCria} onChange={e => setCrearCria(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-400" />
                      <span className="text-sm font-medium text-gray-700">Agregar cría al inventario de animales</span>
                    </label>
                    {crearCria && (
                      <div className="mt-2">
                        <Input
                          label="Nombre de la cría"
                          placeholder={`Ej: Cría de ${hembras.find(h => h.id === pMadre)?.nombre ?? '...'}`}
                          value={nombreCria}
                          onChange={e => setNombreCria(e.target.value)}
                        />
                        <p className="text-xs text-gray-400 mt-1">Se creará como animal con la madre vinculada automáticamente</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Complicaciones</label>
                <textarea value={pCompl} onChange={e => setPCompl(e.target.value)} rows={2}
                  placeholder="Ej: Distocia, retención de placenta... (dejar vacío si no hubo)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
              </div>

              <Input label="Veterinario" placeholder="Nombre del veterinario (opcional)" value={pVet} onChange={e => setPVet(e.target.value)} />
            </>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variante="secundario" onClick={() => setModalAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} cargando={guardando}>
              {editandoId ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══ MODAL ELIMINAR ═══ */}
      <Modal abierto={!!eliminando} onCerrar={() => setEliminando(null)} titulo="Confirmar eliminación" tamano="sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              ¿Eliminar <strong>{eliminando?.label}</strong>? Esta acción no se puede deshacer.
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
