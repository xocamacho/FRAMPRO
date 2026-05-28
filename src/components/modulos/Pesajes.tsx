import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Animal, Pesaje } from '@/types'
import {
  Plus, Scale, Search, Pencil, Trash2,
  TrendingUp, TrendingDown, Minus, AlertTriangle, Beef,
} from 'lucide-react'

function fmtFecha(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function GananciaChip({ ganancia }: { ganancia: number | null }) {
  if (ganancia === null) return <span className="text-gray-400 text-xs">Primer pesaje</span>
  const abs = Math.abs(ganancia).toFixed(1)
  if (ganancia > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
      <TrendingUp size={11} />+{abs} kg
    </span>
  )
  if (ganancia < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
      <TrendingDown size={11} />{abs} kg
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
      <Minus size={11} />Sin cambio
    </span>
  )
}

export function Pesajes() {
  const { finca } = useAuthStore()
  const HOY = new Date().toISOString().slice(0, 10)

  const [animales, setAnimales] = useState<Animal[]>([])
  const [pesajes,  setPesajes]  = useState<Pesaje[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [animalFiltro, setAnimalFiltro] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId,   setEditandoId]   = useState<string | null>(null)
  const [guardando,    setGuardando]    = useState(false)
  const [error,        setError]        = useState('')
  const [eliminando, setEliminando] = useState<Pesaje | null>(null)

  const [pAnimal,  setPAnimal]  = useState('')
  const [pFecha,   setPFecha]   = useState(HOY)
  const [pPeso,    setPPeso]    = useState('')
  const [pBCS,     setPBCS]     = useState('')
  const [pTempAmb, setPTempAmb] = useState('')

  async function cargar() {
    if (!finca?.id) { setCargando(false); return }
    setCargando(true)
    const { data: animData } = await supabase
      .from('animales').select('id, nombre, numero_arete, foto_url, especie, sexo, peso_actual')
      .eq('finca_id', finca.id).order('nombre')
    const anim = (animData ?? []) as Animal[]
    setAnimales(anim)
    if (anim.length > 0) {
      const { data: pesData } = await supabase
        .from('pesajes').select('*').in('animal_id', anim.map(a => a.id))
        .order('fecha', { ascending: false })
      setPesajes((pesData ?? []) as Pesaje[])
    } else { setPesajes([]) }
    setCargando(false)
  }
  useEffect(() => { cargar() }, [finca?.id])

  function nombreAnimal(id: string) {
    const a = animales.find(x => x.id === id)
    return a ? `${a.nombre}${a.numero_arete ? ` (${a.numero_arete})` : ''}` : '—'
  }
  function fotoAnimal(id: string) { return animales.find(x => x.id === id)?.foto_url ?? null }

  function calcGanancia(p: Pesaje): number | null {
    const prev = pesajes
      .filter(x => x.animal_id === p.animal_id && x.fecha < p.fecha)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
    if (!prev) return null
    return +(p.peso_kg - prev.peso_kg).toFixed(1)
  }

  function abrirNuevo() {
    setEditandoId(null); setError('')
    setPAnimal(animalFiltro); setPFecha(HOY); setPPeso(''); setPBCS(''); setPTempAmb('')
    setModalAbierto(true)
  }
  function abrirEditar(p: Pesaje) {
    setEditandoId(p.id); setError('')
    setPAnimal(p.animal_id); setPFecha(p.fecha); setPPeso(p.peso_kg.toString())
    setPBCS(p.bcs?.toString() ?? ''); setPTempAmb(p.temperatura_ambiente?.toString() ?? '')
    setModalAbierto(true)
  }

  async function guardar() {
    if (!pAnimal || !pFecha || !pPeso) { setError('Animal, fecha y peso son obligatorios'); return }
    setGuardando(true); setError('')
    const payload = {
      animal_id: pAnimal, fecha: pFecha, peso_kg: Number(pPeso),
      bcs: pBCS ? Number(pBCS) : null,
      temperatura_ambiente: pTempAmb ? Number(pTempAmb) : null,
    }
    const res = editandoId
      ? await supabase.from('pesajes').update(payload).eq('id', editandoId).select().single()
      : await supabase.from('pesajes').insert([payload]).select().single()
    if (res.error) { setError(res.error.message) }
    else {
      if (!editandoId) await supabase.from('animales').update({ peso_actual: Number(pPeso) }).eq('id', pAnimal)
      setModalAbierto(false)
      requestAnimationFrame(() => cargar())
    }
    setGuardando(false)
  }

  async function confirmarEliminar() {
    if (!eliminando) return
    await supabase.from('pesajes').delete().eq('id', eliminando.id)
    setEliminando(null)
    requestAnimationFrame(() => cargar())
  }

  // Stats
  const hace30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  const ultimosPesajes = animales.map(a => {
    return pesajes.filter(p => p.animal_id === a.id).sort((x, y) => y.fecha.localeCompare(x.fecha))[0] ?? null
  }).filter(Boolean) as Pesaje[]

  const pesoPromedio = ultimosPesajes.length > 0
    ? (ultimosPesajes.reduce((s, p) => s + p.peso_kg, 0) / ultimosPesajes.length).toFixed(0)
    : '—'

  const pesajesMes = pesajes.filter(p => p.fecha >= hace30).length

  // Filtros
  const animIds = busqueda
    ? animales.filter(a => a.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (a.numero_arete ?? '').toLowerCase().includes(busqueda.toLowerCase())).map(a => a.id)
    : null
  const pesFiltr = pesajes
    .filter(p => !animIds || animIds.includes(p.animal_id))
    .filter(p => !animalFiltro || p.animal_id === animalFiltro)

  return (
    <div className="p-6 flex flex-col gap-4">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Pesajes</h2>
          <p className="text-sm text-gray-500">Control de peso y condición corporal</p>
        </div>
        <Button onClick={abrirNuevo}><Plus size={16} />Registrar Pesaje</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Peso promedio hato', valor: pesoPromedio === '—' ? '—' : `${pesoPromedio} kg`, sub: `${ultimosPesajes.length} con último pesaje`, icon: <Scale size={18} />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pesajes este mes',   valor: pesajesMes,                                          sub: 'últimos 30 días',                             icon: <Scale size={18} />, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Animales',           valor: animales.length,                                     sub: `${animales.filter(a => a.sexo === 'hembra').length} hembras / ${animales.filter(a => a.sexo === 'macho').length} machos`, icon: <Beef size={18} />, color: 'text-amber-600', bg: 'bg-amber-50' },
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

      {/* Buscador + filtro animal */}
      <Card padding="sm">
        <Input placeholder="Buscar por nombre o arete..." value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setAnimalFiltro('') }}
          icono={<Search size={14} />} />
        {animales.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-500 flex-shrink-0">Filtrar animal:</span>
            <select
              value={animalFiltro}
              onChange={e => setAnimalFiltro(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Todos los animales ({animales.length})</option>
              {animales.map(a => (
                <option key={a.id} value={a.id}>
                  {a.nombre}{a.numero_arete ? ` (${a.numero_arete})` : ''}{a.peso_actual ? ` — ${a.peso_actual}kg` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </Card>

      {/* Tabla */}
      {cargando ? (
        <Card><div className="flex justify-center py-16"><svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div></Card>
      ) : animales.length === 0 ? (
        <Card><div className="flex flex-col items-center justify-center py-16 text-center"><Beef size={32} className="text-gray-300 mb-3" /><p className="font-semibold text-gray-700">Sin animales registrados</p><p className="text-sm text-gray-400 mt-1">Primero agrega animales en el módulo <strong>Animales</strong></p></div></Card>
      ) : (
        <Card padding="none">
          {pesFiltr.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Scale size={28} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">{animalFiltro ? 'Este animal no tiene pesajes' : 'Sin pesajes registrados'}</p>
              <button onClick={abrirNuevo} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">+ Registrar primer pesaje</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Animal</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Peso</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Variación</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">BCS</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Temp.</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pesFiltr.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {fotoAnimal(p.animal_id) ? <img src={fotoAnimal(p.animal_id)!} className="w-7 h-7 rounded-full object-cover" alt="" /> : <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center"><Beef size={12} className="text-blue-600" /></div>}
                          <span className="font-medium text-gray-900 text-xs">{nombreAnimal(p.animal_id)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fmtFecha(p.fecha)}</td>
                      <td className="px-4 py-3"><span className="text-base font-bold text-gray-900">{p.peso_kg}</span><span className="text-xs text-gray-400 ml-1">kg</span></td>
                      <td className="px-4 py-3"><GananciaChip ganancia={calcGanancia(p)} /></td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {p.bcs ? (<div className="flex items-center gap-1.5"><div className="flex gap-0.5">{[1,2,3,4,5].map(n => <div key={n} className={`w-2 h-2 rounded-full ${n <= (p.bcs ?? 0) ? 'bg-green-500' : 'bg-gray-200'}`} />)}</div><span className="text-xs text-gray-600">{p.bcs}/5</span></div>) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{p.temperatura_ambiente ? `${p.temperatura_ambiente}°C` : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => abrirEditar(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => setEliminando(p)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
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

      {/* Modal crear/editar */}
      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo={editandoId ? 'Editar Pesaje' : 'Registrar Pesaje'} tamano="lg">
        <div className="flex flex-col gap-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Animal *</label>
            <select value={pAnimal} onChange={e => setPAnimal(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Seleccionar animal...</option>
              {animales.map(a => <option key={a.id} value={a.id}>{a.nombre}{a.numero_arete ? ` (${a.numero_arete})` : ''}{a.peso_actual ? ` — último: ${a.peso_actual}kg` : ''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha *" type="date" value={pFecha} onChange={e => setPFecha(e.target.value)} />
            <Input label="Peso (kg) *" type="number" step="0.1" placeholder="Ej: 380.5" value={pPeso} onChange={e => setPPeso(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">BCS (1–5)</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setPBCS(pBCS === n.toString() ? '' : n.toString())}
                    className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-colors ${pBCS === n.toString() ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">{pBCS === '1' ? '1 — Muy flaco' : pBCS === '2' ? '2 — Flaco' : pBCS === '3' ? '3 — Ideal' : pBCS === '4' ? '4 — Gordo' : pBCS === '5' ? '5 — Obeso' : 'Sin BCS'}</p>
            </div>
            <Input label="Temperatura amb. (°C)" type="number" step="0.1" placeholder="Ej: 28" value={pTempAmb} onChange={e => setPTempAmb(e.target.value)} />
          </div>
          {pAnimal && pPeso && (() => {
            const ant = pesajes.filter(p => p.animal_id === pAnimal && (!editandoId || p.id !== editandoId)).sort((a,b) => b.fecha.localeCompare(a.fecha))[0]
            if (!ant) return null
            const diff = +(Number(pPeso) - ant.peso_kg).toFixed(1)
            return (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${diff >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {diff >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>Peso anterior: <strong>{ant.peso_kg} kg</strong> ({fmtFecha(ant.fecha)}) → {diff >= 0 ? '+' : ''}{diff} kg</span>
              </div>
            )
          })()}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variante="secundario" onClick={() => setModalAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} cargando={guardando}>{editandoId ? 'Guardar cambios' : 'Registrar'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal eliminar */}
      <Modal abierto={!!eliminando} onCerrar={() => setEliminando(null)} titulo="Eliminar Pesaje" tamano="sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">¿Eliminar pesaje de <strong>{eliminando && nombreAnimal(eliminando.animal_id)}</strong> ({eliminando?.peso_kg} kg)?</p>
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
