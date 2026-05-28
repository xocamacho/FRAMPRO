import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Animal, Vacuna, Sanidad, Desparasitacion } from '@/types'
import {
  Plus, Syringe, Activity, Bug, Pencil, Trash2, Search,
  AlertTriangle, Clock, Beef, ChevronDown,
} from 'lucide-react'

// ── Tipos ──────────────────────────────────────────────────────
type Tab = 'vacunas' | 'salud' | 'desparasitacion'

const TIPOS_EVENTO = ['Enfermedad', 'Lesión', 'Cirugía', 'Chequeo rutinario', 'Emergencia', 'Otro']
const VIAS_ADMIN   = ['Oral', 'Intramuscular', 'Subcutánea', 'Intravenosa', 'Tópica', 'Otro']
const RESULTADOS   = ['En tratamiento', 'Recuperado', 'Crónico', 'Fallecido', 'Sin resultado']

// ── Helpers ─────────────────────────────────────────────────────
function fmtFecha(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function diasHasta(d: string | null | undefined): number | null {
  if (!d) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const meta = new Date(d + 'T00:00:00')
  return Math.ceil((meta.getTime() - hoy.getTime()) / 86_400_000)
}

function ChipFecha({ fecha }: { fecha: string | null | undefined }) {
  const dias = diasHasta(fecha)
  if (dias === null) return <span className="text-gray-400 text-xs">—</span>
  if (dias < 0)
    return <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
      Vencida hace {Math.abs(dias)}d
    </span>
  if (dias === 0)
    return <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">¡Hoy!</span>
  if (dias <= 7)
    return <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">En {dias}d</span>
  if (dias <= 30)
    return <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">En {dias}d</span>
  return <span className="text-xs text-gray-600">{fmtFecha(fecha)}</span>
}

function ChipResultado({ resultado }: { resultado: string | null | undefined }) {
  const r = resultado ?? ''
  if (!r || r === 'Sin resultado') return <Badge variante="gris">Pendiente</Badge>
  if (r === 'En tratamiento')    return <Badge variante="amarillo">En tratamiento</Badge>
  if (r === 'Recuperado')        return <Badge variante="verde">Recuperado</Badge>
  if (r === 'Crónico')           return <Badge variante="azul">Crónico</Badge>
  if (r === 'Fallecido')         return <Badge variante="rojo">Fallecido</Badge>
  return <Badge variante="gris">{r}</Badge>
}

// ── Componente principal ─────────────────────────────────────────
export function Salud() {
  const { finca } = useAuthStore()
  const HOY = new Date().toISOString().slice(0, 10)

  // ── Datos ──
  const [animales,  setAnimales]  = useState<Animal[]>([])
  const [vacunas,   setVacunas]   = useState<Vacuna[]>([])
  const [sanidad,   setSanidad]   = useState<Sanidad[]>([])
  const [despar,    setDespar]    = useState<Desparasitacion[]>([])
  const [cargando,  setCargando]  = useState(true)

  // ── UI ──
  const [tab,      setTab]      = useState<Tab>('vacunas')
  const [busqueda, setBusqueda] = useState('')

  // ── Modal ──
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId,   setEditandoId]   = useState<string | null>(null)
  const [guardando,    setGuardando]    = useState(false)
  const [error,        setError]        = useState('')
  const [eliminando, setEliminando] = useState<{ id: string; tipo: Tab; label: string } | null>(null)

  // ── Campos Vacuna ──
  const [vAnimal,  setVAnimal]  = useState('')
  const [vNombre,  setVNombre]  = useState('')
  const [vFecha,   setVFecha]   = useState(HOY)
  const [vProxima, setVProxima] = useState('')
  const [vLote,    setVLote]    = useState('')
  const [vVet,     setVVet]     = useState('')
  const [vNotas,   setVNotas]   = useState('')

  // ── Campos Sanidad ──
  const [sAnimal,    setSAnimal]    = useState('')
  const [sFecha,     setSFecha]     = useState(HOY)
  const [sTipo,      setSTipo]      = useState('')
  const [sDesc,      setSDesc]      = useState('')
  const [sDiag,      setSDiag]      = useState('')
  const [sTrat,      setSTrat]      = useState('')
  const [sResultado, setSResultado] = useState('')
  const [sVet,       setSVet]       = useState('')

  // ── Campos Desparasitación ──
  const [dAnimal,    setDAnimal]    = useState('')
  const [dFecha,     setDFecha]     = useState(HOY)
  const [dProducto,  setDProducto]  = useState('')
  const [dPrincipio, setDPrincipio] = useState('')
  const [dDosis,     setDDosis]     = useState('')
  const [dVia,       setDVia]       = useState('')
  const [dVet,       setDVet]       = useState('')
  const [dProxima,   setDProxima]   = useState('')

  // ═══ CARGA ═══
  async function cargar() {
    if (!finca?.id) { setCargando(false); return }
    setCargando(true)

    const { data: animData } = await supabase
      .from('animales')
      .select('id, nombre, numero_arete, foto_url, especie')
      .eq('finca_id', finca.id)
      .order('nombre')

    const anim = (animData ?? []) as Animal[]
    setAnimales(anim)

    if (anim.length > 0) {
      const ids = anim.map(a => a.id)
      const [{ data: vacData }, { data: sanData }, { data: desData }] = await Promise.all([
        supabase.from('vacunas').select('*').in('animal_id', ids).order('fecha_aplicacion', { ascending: false }),
        supabase.from('sanidad').select('*').in('animal_id', ids).order('fecha', { ascending: false }),
        supabase.from('desparasitaciones').select('*').in('animal_id', ids).order('fecha', { ascending: false }),
      ])
      setVacunas((vacData ?? []) as Vacuna[])
      setSanidad((sanData ?? []) as Sanidad[])
      setDespar((desData ?? []) as Desparasitacion[])
    } else {
      setVacunas([]); setSanidad([]); setDespar([])
    }

    setCargando(false)
  }

  useEffect(() => { cargar() }, [finca?.id])

  // ═══ HELPERS ═══
  function nombreAnimal(id: string) {
    const a = animales.find(x => x.id === id)
    if (!a) return '—'
    return a.nombre + (a.numero_arete ? ` (${a.numero_arete})` : '')
  }

  function fotoAnimal(id: string) {
    return animales.find(x => x.id === id)?.foto_url ?? null
  }

  // ═══ ABRIR MODAL CREAR ═══
  function abrirNuevo() {
    setEditandoId(null); setError('')
    if (tab === 'vacunas') {
      setVAnimal(''); setVNombre(''); setVFecha(HOY); setVProxima('')
      setVLote(''); setVVet(''); setVNotas('')
    } else if (tab === 'salud') {
      setSAnimal(''); setSFecha(HOY); setSTipo('Enfermedad'); setSDesc('')
      setSDiag(''); setSTrat(''); setSResultado('En tratamiento'); setSVet('')
    } else {
      setDAnimal(''); setDFecha(HOY); setDProducto(''); setDPrincipio('')
      setDDosis(''); setDVia('Intramuscular'); setDVet(''); setDProxima('')
    }
    setModalAbierto(true)
  }

  // ═══ ABRIR MODAL EDITAR ═══
  function abrirEditar(r: Vacuna | Sanidad | Desparasitacion, tipo: Tab) {
    setError(''); setEditandoId(r.id)
    if (tipo === 'vacunas') {
      const v = r as Vacuna
      setVAnimal(v.animal_id); setVNombre(v.nombre); setVFecha(v.fecha_aplicacion)
      setVProxima(v.proxima_dosis ?? ''); setVLote(v.lote ?? '')
      setVVet(v.veterinario ?? ''); setVNotas(v.notas ?? '')
    } else if (tipo === 'salud') {
      const s = r as Sanidad
      setSAnimal(s.animal_id); setSFecha(s.fecha); setSTipo(s.tipo_evento ?? '')
      setSDesc(s.descripcion); setSDiag(s.diagnostico ?? '')
      setSTrat(s.tratamiento ?? ''); setSResultado(s.resultado ?? ''); setSVet(s.veterinario ?? '')
    } else {
      const d = r as Desparasitacion
      setDAnimal(d.animal_id); setDFecha(d.fecha); setDProducto(d.producto)
      setDPrincipio(d.principio_activo ?? ''); setDDosis(d.dosis?.toString() ?? '')
      setDVia(d.via_administracion ?? ''); setDVet(d.veterinario ?? '')
      setDProxima(d.proxima_desparasitacion ?? '')
    }
    setModalAbierto(true)
  }

  // ═══ GUARDAR ═══
  async function guardar() {
    setGuardando(true); setError('')
    try {
      if (tab === 'vacunas') {
        if (!vAnimal || !vNombre.trim() || !vFecha) {
          setError('Animal, nombre de vacuna y fecha son obligatorios')
          setGuardando(false); return
        }
        const payload = {
          animal_id: vAnimal, nombre: vNombre.trim(), fecha_aplicacion: vFecha,
          proxima_dosis: vProxima || null, lote: vLote.trim() || null,
          veterinario: vVet.trim() || null, notas: vNotas.trim() || null,
        }
        const res = editandoId
          ? await supabase.from('vacunas').update(payload).eq('id', editandoId).select().single()
          : await supabase.from('vacunas').insert([payload]).select().single()
        if (res.error) { setError(res.error.message); setGuardando(false); return }

      } else if (tab === 'salud') {
        if (!sAnimal || !sFecha || !sDesc.trim()) {
          setError('Animal, fecha y descripción son obligatorios')
          setGuardando(false); return
        }
        const payload = {
          animal_id: sAnimal, fecha: sFecha, tipo_evento: sTipo || null,
          descripcion: sDesc.trim(), diagnostico: sDiag.trim() || null,
          tratamiento: sTrat.trim() || null, resultado: sResultado || null,
          veterinario: sVet.trim() || null,
        }
        const res = editandoId
          ? await supabase.from('sanidad').update(payload).eq('id', editandoId).select().single()
          : await supabase.from('sanidad').insert([payload]).select().single()
        if (res.error) { setError(res.error.message); setGuardando(false); return }

      } else {
        if (!dAnimal || !dFecha || !dProducto.trim()) {
          setError('Animal, fecha y producto son obligatorios')
          setGuardando(false); return
        }
        const payload = {
          animal_id: dAnimal, fecha: dFecha, producto: dProducto.trim(),
          principio_activo: dPrincipio.trim() || null,
          dosis: dDosis ? Number(dDosis) : null,
          via_administracion: dVia || null, veterinario: dVet.trim() || null,
          proxima_desparasitacion: dProxima || null,
        }
        const res = editandoId
          ? await supabase.from('desparasitaciones').update(payload).eq('id', editandoId).select().single()
          : await supabase.from('desparasitaciones').insert([payload]).select().single()
        if (res.error) { setError(res.error.message); setGuardando(false); return }
      }

      setModalAbierto(false)
      requestAnimationFrame(() => cargar())
    } catch {
      setError('Error al guardar. Intenta de nuevo.')
    }
    setGuardando(false)
  }

  // ═══ ELIMINAR ═══
  async function confirmarEliminar() {
    if (!eliminando) return
    const tabla = eliminando.tipo === 'vacunas'
      ? 'vacunas' : eliminando.tipo === 'salud'
      ? 'sanidad' : 'desparasitaciones'
    await supabase.from(tabla).delete().eq('id', eliminando.id)
    setEliminando(null)
    requestAnimationFrame(() => cargar())
  }

  // ═══ ESTADÍSTICAS ═══
  const stats = {
    vacunasProximas: vacunas.filter(v => {
      const d = diasHasta(v.proxima_dosis); return d !== null && d >= 0 && d <= 30
    }).length,
    vacunasVencidas: vacunas.filter(v => {
      const d = diasHasta(v.proxima_dosis); return d !== null && d < 0
    }).length,
    tratamientosActivos: sanidad.filter(s =>
      !s.resultado || s.resultado === 'En tratamiento' || s.resultado === 'Sin resultado'
    ).length,
    desparVencidas: despar.filter(d => {
      const dias = diasHasta(d.proxima_desparasitacion); return dias !== null && dias < 0
    }).length,
    desparProximas: despar.filter(d => {
      const dias = diasHasta(d.proxima_desparasitacion); return dias !== null && dias >= 0 && dias <= 30
    }).length,
  }

  // ═══ FILTROS ═══
  const animIds = busqueda
    ? animales.filter(a =>
        a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (a.numero_arete ?? '').toLowerCase().includes(busqueda.toLowerCase())
      ).map(a => a.id)
    : null // null = sin filtro

  const vacFiltr   = animIds ? vacunas.filter(v => animIds.includes(v.animal_id)) : vacunas
  const sanFiltr   = animIds ? sanidad.filter(s => animIds.includes(s.animal_id)) : sanidad
  const desFiltr   = animIds ? despar.filter(d => animIds.includes(d.animal_id)) : despar

  // ── Modal título ──
  const tituloModal =
    tab === 'vacunas'
      ? (editandoId ? 'Editar Vacuna' : 'Registrar Vacuna')
      : tab === 'salud'
      ? (editandoId ? 'Editar Evento Sanitario' : 'Nuevo Evento Sanitario')
      : (editandoId ? 'Editar Desparasitación' : 'Registrar Desparasitación')

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 flex flex-col gap-4">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Salud & Vacunas</h2>
          <p className="text-sm text-gray-500">Historial sanitario del hato</p>
        </div>
        <Button onClick={abrirNuevo}>
          <Plus size={16} />
          {tab === 'vacunas' ? 'Registrar Vacuna' : tab === 'salud' ? 'Nuevo Evento' : 'Desparasitar'}
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Vacunas próximas',
            valor: stats.vacunasProximas,
            sub: `${stats.vacunasVencidas} vencidas`,
            icon: <Syringe size={18} />,
            color: stats.vacunasVencidas > 0 ? 'text-red-600' : stats.vacunasProximas > 0 ? 'text-amber-600' : 'text-green-600',
            bg: stats.vacunasVencidas > 0 ? 'bg-red-50' : 'bg-green-50',
          },
          {
            label: 'Tratamientos activos',
            valor: stats.tratamientosActivos,
            sub: 'en seguimiento',
            icon: <Activity size={18} />,
            color: stats.tratamientosActivos > 0 ? 'text-red-600' : 'text-green-600',
            bg: stats.tratamientosActivos > 0 ? 'bg-red-50' : 'bg-green-50',
          },
          {
            label: 'Despar. próximas',
            valor: stats.desparProximas,
            sub: `${stats.desparVencidas} vencidas`,
            icon: <Bug size={18} />,
            color: stats.desparVencidas > 0 ? 'text-red-600' : stats.desparProximas > 0 ? 'text-amber-600' : 'text-green-600',
            bg: stats.desparVencidas > 0 ? 'bg-red-50' : 'bg-green-50',
          },
          {
            label: 'Animales registrados',
            valor: animales.length,
            sub: 'en el hato',
            icon: <Beef size={18} />,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
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
              { key: 'vacunas',         label: 'Vacunas',         icon: <Syringe size={14} />,  n: vacunas.length },
              { key: 'salud',           label: 'Sanidad',         icon: <Activity size={14} />, n: sanidad.length },
              { key: 'desparasitacion', label: 'Desparasitación', icon: <Bug size={14} />,      n: despar.length },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center ${
                  tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t.icon} {t.label}
                {t.n > 0 && <span className={`px-1.5 py-px rounded-full text-[10px] font-bold ${tab === t.key ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{t.n}</span>}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Tabla ── */}
      {cargando ? (
        <Card>
          <div className="flex justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </Card>
      ) : animales.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Beef size={32} className="text-gray-300 mb-3" />
            <p className="text-base font-semibold text-gray-700">Sin animales registrados</p>
            <p className="text-sm text-gray-400 mt-1">Primero agrega animales en el módulo <strong>Animales</strong></p>
          </div>
        </Card>
      ) : (
        <>
          {/* ─── VACUNAS ─── */}
          {tab === 'vacunas' && (
            <Card padding="none">
              {vacFiltr.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Syringe size={28} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Sin vacunas registradas</p>
                  <button onClick={abrirNuevo} className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium">+ Registrar primera vacuna</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Animal</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Vacuna</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Fecha aplic.</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Próxima dosis</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Veterinario</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vacFiltr.map(v => (
                        <tr key={v.id} className="border-b border-gray-50 hover:bg-green-50/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {fotoAnimal(v.animal_id) ? (
                                <img src={fotoAnimal(v.animal_id)!} className="w-7 h-7 rounded-full object-cover" alt="" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                                  <Beef size={12} className="text-green-600" />
                                </div>
                              )}
                              <span className="font-medium text-gray-900 text-xs">{nombreAnimal(v.animal_id)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{v.nombre}</p>
                            {v.lote && <p className="text-xs text-gray-400">Lote: {v.lote}</p>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{fmtFecha(v.fecha_aplicacion)}</td>
                          <td className="px-4 py-3"><ChipFecha fecha={v.proxima_dosis} /></td>
                          <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{v.veterinario ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => abrirEditar(v, 'vacunas')}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setEliminando({ id: v.id, tipo: 'vacunas', label: `${v.nombre} — ${nombreAnimal(v.animal_id)}` })}
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

          {/* ─── SALUD / EVENTOS ─── */}
          {tab === 'salud' && (
            <Card padding="none">
              {sanFiltr.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Activity size={28} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Sin eventos sanitarios registrados</p>
                  <button onClick={abrirNuevo} className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium">+ Registrar primer evento</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Animal</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Fecha</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Tipo</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Descripción</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Veterinario</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sanFiltr.map(s => (
                        <tr key={s.id} className="border-b border-gray-50 hover:bg-green-50/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {fotoAnimal(s.animal_id) ? (
                                <img src={fotoAnimal(s.animal_id)!} className="w-7 h-7 rounded-full object-cover" alt="" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                                  <Beef size={12} className="text-green-600" />
                                </div>
                              )}
                              <span className="font-medium text-gray-900 text-xs">{nombreAnimal(s.animal_id)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{fmtFecha(s.fecha)}</td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {s.tipo_evento && <Badge variante="gris">{s.tipo_evento}</Badge>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-900 line-clamp-2 max-w-xs">{s.descripcion}</p>
                            {s.diagnostico && <p className="text-xs text-gray-400 mt-0.5">Dx: {s.diagnostico}</p>}
                          </td>
                          <td className="px-4 py-3"><ChipResultado resultado={s.resultado} /></td>
                          <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{s.veterinario ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => abrirEditar(s, 'salud')}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setEliminando({ id: s.id, tipo: 'salud', label: `${s.tipo_evento ?? 'Evento'} — ${nombreAnimal(s.animal_id)}` })}
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

          {/* ─── DESPARASITACIONES ─── */}
          {tab === 'desparasitacion' && (
            <Card padding="none">
              {desFiltr.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Bug size={28} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Sin desparasitaciones registradas</p>
                  <button onClick={abrirNuevo} className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium">+ Registrar desparasitación</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Animal</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Fecha</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Producto</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Dosis / Vía</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Próxima</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Veterinario</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {desFiltr.map(d => (
                        <tr key={d.id} className="border-b border-gray-50 hover:bg-green-50/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {fotoAnimal(d.animal_id) ? (
                                <img src={fotoAnimal(d.animal_id)!} className="w-7 h-7 rounded-full object-cover" alt="" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                                  <Beef size={12} className="text-green-600" />
                                </div>
                              )}
                              <span className="font-medium text-gray-900 text-xs">{nombreAnimal(d.animal_id)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{fmtFecha(d.fecha)}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{d.producto}</p>
                            {d.principio_activo && <p className="text-xs text-gray-400">{d.principio_activo}</p>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                            {d.dosis ? `${d.dosis} ml` : '—'}
                            {d.via_administracion ? ` · ${d.via_administracion}` : ''}
                          </td>
                          <td className="px-4 py-3"><ChipFecha fecha={d.proxima_desparasitacion} /></td>
                          <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{d.veterinario ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => abrirEditar(d, 'desparasitacion')}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setEliminando({ id: d.id, tipo: 'desparasitacion', label: `${d.producto} — ${nombreAnimal(d.animal_id)}` })}
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

      {/* ═════════════════════════════════════════════════════════
           MODAL CREAR / EDITAR
         ═════════════════════════════════════════════════════════ */}
      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo={tituloModal} tamano="xl">
        <div className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          {/* ── Formulario Vacuna ── */}
          {tab === 'vacunas' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Animal *</label>
                <select value={vAnimal} onChange={e => setVAnimal(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Seleccionar animal...</option>
                  {animales.map(a => <option key={a.id} value={a.id}>{a.nombre}{a.numero_arete ? ` (${a.numero_arete})` : ''}</option>)}
                </select>
              </div>

              <Input label="Nombre de la vacuna *" placeholder="Ej: Fiebre Aftosa, Brucelosis, Triple Bovina" value={vNombre} onChange={e => setVNombre(e.target.value)} />

              <div className="grid grid-cols-2 gap-4">
                <Input label="Fecha de aplicación *" type="date" value={vFecha} onChange={e => setVFecha(e.target.value)} />
                <Input label="Próxima dosis" type="date" value={vProxima} onChange={e => setVProxima(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Lote / Referencia" placeholder="Ej: L-2024-001" value={vLote} onChange={e => setVLote(e.target.value)} />
                <Input label="Veterinario" placeholder="Nombre del veterinario" value={vVet} onChange={e => setVVet(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Notas</label>
                <textarea value={vNotas} onChange={e => setVNotas(e.target.value)} rows={2}
                  placeholder="Observaciones adicionales..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
            </>
          )}

          {/* ── Formulario Sanidad ── */}
          {tab === 'salud' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Animal *</label>
                <select value={sAnimal} onChange={e => setSAnimal(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Seleccionar animal...</option>
                  {animales.map(a => <option key={a.id} value={a.id}>{a.nombre}{a.numero_arete ? ` (${a.numero_arete})` : ''}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Fecha del evento *" type="date" value={sFecha} onChange={e => setSFecha(e.target.value)} />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Tipo de evento</label>
                  <select value={sTipo} onChange={e => setSTipo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Sin tipo</option>
                    {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Descripción *</label>
                <textarea value={sDesc} onChange={e => setSDesc(e.target.value)} rows={2}
                  placeholder="Describe los síntomas o el evento observado..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Diagnóstico</label>
                  <textarea value={sDiag} onChange={e => setSDiag(e.target.value)} rows={2}
                    placeholder="Diagnóstico del veterinario..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Tratamiento</label>
                  <textarea value={sTrat} onChange={e => setSTrat(e.target.value)} rows={2}
                    placeholder="Medicamentos y dosis aplicadas..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Resultado</label>
                  <select value={sResultado} onChange={e => setSResultado(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Sin resultado aún</option>
                    {RESULTADOS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <Input label="Veterinario" placeholder="Nombre del veterinario" value={sVet} onChange={e => setSVet(e.target.value)} />
              </div>
            </>
          )}

          {/* ── Formulario Desparasitación ── */}
          {tab === 'desparasitacion' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Animal *</label>
                <select value={dAnimal} onChange={e => setDAnimal(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Seleccionar animal...</option>
                  {animales.map(a => <option key={a.id} value={a.id}>{a.nombre}{a.numero_arete ? ` (${a.numero_arete})` : ''}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Fecha *" type="date" value={dFecha} onChange={e => setDFecha(e.target.value)} />
                <Input label="Próxima desparasitación" type="date" value={dProxima} onChange={e => setDProxima(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Producto *" placeholder="Ej: Ivermectina, Albendazol" value={dProducto} onChange={e => setDProducto(e.target.value)} />
                <Input label="Principio activo" placeholder="Ej: Ivermectina 1%" value={dPrincipio} onChange={e => setDPrincipio(e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input label="Dosis (ml / cc)" type="number" placeholder="Ej: 5" value={dDosis} onChange={e => setDDosis(e.target.value)} />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Vía</label>
                  <select value={dVia} onChange={e => setDVia(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Sin especificar</option>
                    {VIAS_ADMIN.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <Input label="Veterinario" placeholder="Nombre" value={dVet} onChange={e => setDVet(e.target.value)} />
              </div>
            </>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variante="secundario" onClick={() => setModalAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} cargando={guardando}>
              {editandoId ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═════════════════════════════
           MODAL ELIMINAR
         ═════════════════════════════ */}
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
