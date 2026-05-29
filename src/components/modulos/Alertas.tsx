import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import { consultarIA } from '@/services/groqAPI'
import { generarReporteVeterinarioPDF } from '@/services/reportePDF'
import {
  Bell, Syringe, Milk, Package,
  Scale, ClipboardList, AlertTriangle, CheckCircle2,
  Clock, ChevronDown, ChevronUp, RefreshCw, ShieldAlert,
  Heart, Pill, Calendar, Sparkles, Brain, Lightbulb,
  TrendingUp, Shield, Stethoscope, FileText,
  Square, CheckSquare, ClipboardCopy, Download,
} from 'lucide-react'

// ── Tipos ───────────────────────────────────────────────────────
interface Alerta {
  id: string
  tipo: 'vacuna' | 'reproduccion' | 'pesaje' | 'inventario' | 'tarea' | 'salud' | 'leche'
  prioridad: 'critica' | 'alta' | 'media' | 'baja'
  titulo: string
  detalle: string
  entidad?: string
  entidadId?: string
  fecha?: string
}

interface Recomendacion {
  icono: 'urgente' | 'salud' | 'produccion' | 'mejora' | 'general'
  titulo: string
  detalle: string
}

const PRIORIDAD_CONFIG = {
  critica:  { label: 'Crítica',  color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    dot: 'bg-red-500',    order: 0 },
  alta:     { label: 'Alta',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500', order: 1 },
  media:    { label: 'Media',    color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-500', order: 2 },
  baja:     { label: 'Baja',     color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-400',   order: 3 },
}

const TIPO_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  vacuna:       { icon: <Syringe size={14} />,      label: 'Vacunación',    color: 'text-purple-600' },
  reproduccion: { icon: <Heart size={14} />,         label: 'Reproducción',  color: 'text-pink-600' },
  pesaje:       { icon: <Scale size={14} />,         label: 'Pesaje',        color: 'text-blue-600' },
  inventario:   { icon: <Package size={14} />,       label: 'Inventario',    color: 'text-orange-600' },
  tarea:        { icon: <ClipboardList size={14} />,  label: 'Tareas',        color: 'text-amber-600' },
  salud:        { icon: <Pill size={14} />,          label: 'Salud',         color: 'text-red-600' },
  leche:        { icon: <Milk size={14} />,          label: 'Producción',    color: 'text-amber-700' },
}

const RECO_ICON: Record<string, React.ReactNode> = {
  urgente:    <ShieldAlert size={18} className="text-red-500" />,
  salud:      <Stethoscope size={18} className="text-pink-500" />,
  produccion: <TrendingUp size={18} className="text-green-500" />,
  mejora:     <Lightbulb size={18} className="text-yellow-500" />,
  general:    <Shield size={18} className="text-blue-500" />,
}

function diasEntre(fecha: string): number {
  return Math.ceil((new Date(fecha + 'T23:59:59').getTime() - Date.now()) / 86_400_000)
}

// ── Componente ──────────────────────────────────────────────────
export function Alertas() {
  const { finca, usuario } = useAuthStore()
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todos')
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set())

  // ── IA State ──
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([])
  const [iaAnalizando, setIaAnalizando] = useState(false)
  const [iaError, setIaError] = useState('')
  const [iaExpandido, setIaExpandido] = useState(true)
  const [iaResumen, setIaResumen] = useState('')

  // ── Reporte Vet State ──
  const [reporteModalAbierto, setReporteModalAbierto] = useState(false)
  const [reporteSeleccionadas, setReporteSeleccionadas] = useState<Set<string>>(new Set())
  const [reporteNotas, setReporteNotas] = useState('')
  const [reporteIAGenerando, setReporteIAGenerando] = useState(false)
  const [reporteIASugerencia, setReporteIASugerencia] = useState('')
  const [reporteVetNombre, setReporteVetNombre] = useState('')
  const [generandoPDF, setGenerandoPDF] = useState(false)

  // Datos extra para IA
  const [datosExtraRef, setDatosExtraRef] = useState<Record<string, any>>({})

  function toggleExpand(id: string) {
    setExpandidas(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ═══ ANÁLISIS IA ═══
  async function analizarConIA(alertasData: Alerta[], datosExtra: Record<string, any>) {
    setIaAnalizando(true)
    setIaError('')
    setRecomendaciones([])
    setIaResumen('')

    try {
      const resumenAlertas = {
        total: alertasData.length,
        criticas: alertasData.filter(a => a.prioridad === 'critica').length,
        altas: alertasData.filter(a => a.prioridad === 'alta').length,
        medias: alertasData.filter(a => a.prioridad === 'media').length,
        bajas: alertasData.filter(a => a.prioridad === 'baja').length,
        por_tipo: {} as Record<string, number>,
        detalles_criticos: alertasData
          .filter(a => a.prioridad === 'critica' || a.prioridad === 'alta')
          .slice(0, 15)
          .map(a => `[${a.tipo}/${a.prioridad}] ${a.titulo}: ${a.detalle}`),
        detalles_medios: alertasData
          .filter(a => a.prioridad === 'media')
          .slice(0, 10)
          .map(a => `[${a.tipo}] ${a.titulo}`),
      }
      alertasData.forEach(a => {
        resumenAlertas.por_tipo[a.tipo] = (resumenAlertas.por_tipo[a.tipo] || 0) + 1
      })

      const prompt = `Analiza las alertas de esta finca ganadera colombiana y genera recomendaciones prácticas.

DATOS DE LA FINCA:
- Total animales: ${datosExtra.totalAnimales ?? '?'}
- Total potreros: ${datosExtra.totalPotreros ?? '?'}
- Nombre finca: ${finca?.nombre ?? 'No especificado'}

RESUMEN DE ALERTAS:
${JSON.stringify(resumenAlertas, null, 2)}

INSTRUCCIONES:
Responde SOLO en formato JSON válido, sin markdown ni texto extra. El JSON debe tener esta estructura exacta:
{
  "resumen": "Un párrafo corto (máximo 3 oraciones) describiendo el estado general de la finca",
  "recomendaciones": [
    {
      "icono": "urgente|salud|produccion|mejora|general",
      "titulo": "Título corto de la recomendación",
      "detalle": "Explicación práctica de qué hacer, con pasos concretos si aplica"
    }
  ]
}

Reglas:
- Máximo 6 recomendaciones, mínimo 2
- Prioriza las alertas críticas y altas
- Sé específico: incluye productos, dosis, tiempos colombianos
- Si hay vacunas vencidas, recomienda plan de vacunación inmediato
- Si hay inventario agotado, sugiere cantidades a comprar
- Si hay partos próximos, recomienda preparación
- Si hay tareas vencidas, sugiere priorización
- Si no hay alertas críticas, enfócate en prevención y mejora
- Usa "icono": "urgente" solo para lo más crítico
- Lenguaje práctico de finca, no académico`

      const respuestaRaw = await consultarIA(prompt)

      let jsonStr = respuestaRaw.trim()
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) jsonStr = jsonMatch[1].trim()
      const firstBrace = jsonStr.indexOf('{')
      const lastBrace = jsonStr.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1)
      }

      const parsed = JSON.parse(jsonStr)
      setIaResumen(parsed.resumen || '')
      setRecomendaciones(
        (parsed.recomendaciones || []).map((r: any) => ({
          icono: ['urgente', 'salud', 'produccion', 'mejora', 'general'].includes(r.icono) ? r.icono : 'general',
          titulo: String(r.titulo || ''),
          detalle: String(r.detalle || ''),
        }))
      )
    } catch (e: any) {
      const msg = e?.message || 'Error desconocido'
      if (msg.includes('conectar') || msg.includes('fetch') || msg.includes('localhost')) {
        setIaError('No se pudo conectar con la IA. Verifica tu conexión a internet.')
      } else if (msg.includes('JSON') || msg.includes('parse') || msg.includes('Unexpected')) {
        setIaError('La IA respondió en un formato inesperado. Intenta de nuevo.')
      } else {
        setIaError(`Error IA: ${msg}`)
      }
    } finally {
      setIaAnalizando(false)
    }
  }

  // ═══ REPORTE VET — SUGERIR CON IA ═══
  async function sugerirReporteIA() {
    const seleccionadas = alertas.filter(a => reporteSeleccionadas.has(a.id))
    if (seleccionadas.length === 0) return
    setReporteIAGenerando(true)
    setReporteIASugerencia('')

    try {
      const prompt = `Eres un veterinario colombiano con 20 años de experiencia. Se te pide preparar notas para una visita veterinaria a la finca "${finca?.nombre ?? 'N/A'}".

ALERTAS SELECCIONADAS PARA LA VISITA:
${seleccionadas.map((a, i) => `${i + 1}. [${a.tipo.toUpperCase()} - ${a.prioridad}] ${a.titulo}: ${a.detalle}`).join('\n')}

DATOS GENERALES:
- Total animales en finca: ${datosExtraRef.totalAnimales ?? '?'}

Genera un resumen profesional pero práctico para entregarle al veterinario. Incluye:
1. Resumen de la situación (2-3 oraciones)
2. Lista de prioridades que el veterinario debe atender en esta visita (ordenadas por urgencia)
3. Preguntas que el ganadero debería hacerle al veterinario sobre estos temas
4. Insumos/medicamentos que posiblemente se necesiten tener a la mano

Formato: texto plano en español, con viñetas. NO uses markdown, NO uses JSON. Máximo 400 palabras.`

      const respuesta = await consultarIA(prompt)
      setReporteIASugerencia(respuesta)
    } catch {
      setReporteIASugerencia('No se pudo generar la sugerencia IA. Verifica la conexión con el backend.')
    } finally {
      setReporteIAGenerando(false)
    }
  }

  // ═══ REPORTE VET — GENERAR PDF ═══
  function generarPDF() {
    const seleccionadas = alertas.filter(a => reporteSeleccionadas.has(a.id))
    if (seleccionadas.length === 0) return
    setGenerandoPDF(true)
    try {
      generarReporteVeterinarioPDF({
        fincaNombre: finca?.nombre ?? 'Mi Finca',
        fincaUbicacion: finca?.ubicacion ?? undefined,
        veterinarioNombre: reporteVetNombre || undefined,
        alertas: seleccionadas.map(a => ({
          tipo: a.tipo,
          prioridad: a.prioridad,
          titulo: a.titulo,
          detalle: a.detalle,
          entidad: a.entidad,
          fecha: a.fecha,
        })),
        notas: reporteNotas || undefined,
        sugerenciaIA: reporteIASugerencia || undefined,
        totalAnimales: datosExtraRef.totalAnimales,
        totalPotreros: datosExtraRef.totalPotreros,
      })
    } catch (e) {
      console.error('Error generando PDF:', e)
    } finally {
      setGenerandoPDF(false)
    }
  }

  function copiarReporte() {
    const seleccionadas = alertas.filter(a => reporteSeleccionadas.has(a.id))
    const agrupadas: Record<string, Alerta[]> = {}
    seleccionadas.forEach(a => {
      const key = TIPO_CONFIG[a.tipo]?.label ?? a.tipo
      if (!agrupadas[key]) agrupadas[key] = []
      agrupadas[key].push(a)
    })

    let texto = `REPORTE VETERINARIO — ${finca?.nombre ?? 'Finca'}\n`
    texto += `Fecha: ${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`
    if (reporteVetNombre) texto += `Veterinario: ${reporteVetNombre}\n`
    texto += `${'═'.repeat(50)}\n\n`

    Object.entries(agrupadas).forEach(([tipo, als]) => {
      texto += `▸ ${tipo.toUpperCase()} (${als.length})\n`
      als.forEach(a => {
        texto += `  [${PRIORIDAD_CONFIG[a.prioridad].label}] ${a.titulo}\n`
        texto += `  ${a.detalle}\n\n`
      })
    })

    if (reporteNotas) {
      texto += `\n${'─'.repeat(50)}\nNOTAS ADICIONALES:\n${reporteNotas}\n`
    }

    if (reporteIASugerencia) {
      texto += `\n${'─'.repeat(50)}\nANÁLISIS IA:\n${reporteIASugerencia}\n`
    }

    navigator.clipboard.writeText(texto).catch(() => {})
  }

  // ═══ REPORTE — TOGGLE ALERTA ═══
  function toggleReporteAlerta(id: string) {
    setReporteSeleccionadas(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function seleccionarTodas() {
    setReporteSeleccionadas(new Set(alertas.map(a => a.id)))
  }

  function seleccionarPorTipo(tipo: string) {
    setReporteSeleccionadas(prev => {
      const next = new Set(prev)
      alertas.filter(a => a.tipo === tipo).forEach(a => next.add(a.id))
      return next
    })
  }

  function seleccionarCriticasAltas() {
    setReporteSeleccionadas(prev => {
      const next = new Set(prev)
      alertas.filter(a => a.prioridad === 'critica' || a.prioridad === 'alta').forEach(a => next.add(a.id))
      return next
    })
  }

  // ═══ ESCANEO DE ALERTAS ═══
  async function escanear() {
    if (!finca?.id) { setCargando(false); return }
    setCargando(true)
    const nuevas: Alerta[] = []
    let counter = 0
    const uid = () => `alerta-${++counter}`
    const datosExtra: Record<string, any> = {}

    try {
      // ── 1. Vacunas vencidas o próximas ──
      const { data: vacunas } = await supabase
        .from('vacunas')
        .select('id, animal_id, nombre, proxima_dosis')
        .not('proxima_dosis', 'is', null)

      const { data: animales } = await supabase
        .from('animales')
        .select('id, nombre, numero_arete')
        .eq('finca_id', finca.id)

      datosExtra.totalAnimales = (animales ?? []).length

      const animalMap: Record<string, string> = {}
      ;(animales ?? []).forEach((a: any) => {
        animalMap[a.id] = `${a.nombre}${a.numero_arete ? ` (${a.numero_arete})` : ''}`
      })
      const animalIds = new Set((animales ?? []).map((a: any) => a.id))

      ;(vacunas ?? []).forEach((v: any) => {
        if (!animalIds.has(v.animal_id)) return
        const dias = diasEntre(v.proxima_dosis)
        if (dias < 0) {
          nuevas.push({
            id: uid(), tipo: 'vacuna', prioridad: 'critica',
            titulo: `Vacuna "${v.nombre}" vencida`,
            detalle: `${animalMap[v.animal_id] ?? 'Animal'} — venció hace ${Math.abs(dias)} días (${v.proxima_dosis})`,
            entidad: animalMap[v.animal_id], entidadId: v.animal_id, fecha: v.proxima_dosis,
          })
        } else if (dias <= 7) {
          nuevas.push({
            id: uid(), tipo: 'vacuna', prioridad: 'alta',
            titulo: `Vacuna "${v.nombre}" en ${dias} días`,
            detalle: `${animalMap[v.animal_id] ?? 'Animal'} — programada para ${v.proxima_dosis}`,
            entidad: animalMap[v.animal_id], entidadId: v.animal_id, fecha: v.proxima_dosis,
          })
        } else if (dias <= 30) {
          nuevas.push({
            id: uid(), tipo: 'vacuna', prioridad: 'media',
            titulo: `Vacuna "${v.nombre}" próxima`,
            detalle: `${animalMap[v.animal_id] ?? 'Animal'} — en ${dias} días (${v.proxima_dosis})`,
            entidad: animalMap[v.animal_id], entidadId: v.animal_id, fecha: v.proxima_dosis,
          })
        }
      })

      // ── 2. Inseminaciones pendientes de diagnóstico ──
      const { data: insems } = await supabase
        .from('inseminaciones')
        .select('id, vaca_id, fecha_inseminacion, resultado')

      ;(insems ?? []).forEach((ins: any) => {
        if (!animalIds.has(ins.vaca_id)) return
        if (ins.resultado === 'pendiente' || !ins.resultado) {
          const dias = -diasEntre(ins.fecha_inseminacion)
          if (dias >= 28) {
            nuevas.push({
              id: uid(), tipo: 'reproduccion', prioridad: dias >= 45 ? 'alta' : 'media',
              titulo: 'Diagnóstico de preñez pendiente',
              detalle: `${animalMap[ins.vaca_id] ?? 'Vaca'} — inseminada hace ${dias} días (${ins.fecha_inseminacion}). Ya se puede diagnosticar.`,
              entidad: animalMap[ins.vaca_id], entidadId: ins.vaca_id, fecha: ins.fecha_inseminacion,
            })
          }
        }
      })

      // ── 3. Partos próximos (gestación ~283 días en bovinos) ──
      ;(insems ?? []).forEach((ins: any) => {
        if (!animalIds.has(ins.vaca_id)) return
        if (ins.resultado === 'positivo' || ins.resultado === 'preñada') {
          const fechaParto = new Date(ins.fecha_inseminacion + 'T00:00:00')
          fechaParto.setDate(fechaParto.getDate() + 283)
          const fp = fechaParto.toISOString().slice(0, 10)
          const dias = diasEntre(fp)
          if (dias >= 0 && dias <= 30) {
            nuevas.push({
              id: uid(), tipo: 'reproduccion', prioridad: dias <= 7 ? 'critica' : 'alta',
              titulo: `Parto estimado en ${dias} días`,
              detalle: `${animalMap[ins.vaca_id] ?? 'Vaca'} — parto estimado ${fp}`,
              entidad: animalMap[ins.vaca_id], entidadId: ins.vaca_id, fecha: fp,
            })
          }
        }
      })

      // ── 4. Animales sin pesaje reciente (>90 días) ──
      const { data: pesajes } = await supabase
        .from('pesajes')
        .select('animal_id, fecha')
        .order('fecha', { ascending: false })

      const ultimoPesaje: Record<string, string> = {}
      ;(pesajes ?? []).forEach((p: any) => {
        if (!ultimoPesaje[p.animal_id]) ultimoPesaje[p.animal_id] = p.fecha
      })

      ;(animales ?? []).forEach((a: any) => {
        const ult = ultimoPesaje[a.id]
        if (!ult) {
          nuevas.push({
            id: uid(), tipo: 'pesaje', prioridad: 'baja',
            titulo: 'Sin pesajes registrados',
            detalle: `${animalMap[a.id]} nunca ha sido pesado`,
            entidad: animalMap[a.id], entidadId: a.id,
          })
        } else {
          const dias = -diasEntre(ult)
          if (dias > 90) {
            nuevas.push({
              id: uid(), tipo: 'pesaje', prioridad: 'media',
              titulo: `${dias} días sin pesar`,
              detalle: `${animalMap[a.id]} — último pesaje: ${ult}`,
              entidad: animalMap[a.id], entidadId: a.id, fecha: ult,
            })
          }
        }
      })

      // ── 5. Inventario: stock bajo y vencidos ──
      const { data: inventario } = await supabase
        .from('inventario')
        .select('id, nombre, cantidad, cantidad_minima, alerta_bajo, fecha_vencimiento')
        .eq('finca_id', finca.id)

      ;(inventario ?? []).forEach((item: any) => {
        const cant = Number(item.cantidad) || 0
        const min = Number(item.cantidad_minima) || 0
        if (item.alerta_bajo && cant <= min) {
          nuevas.push({
            id: uid(), tipo: 'inventario', prioridad: cant === 0 ? 'critica' : 'alta',
            titulo: cant === 0 ? `${item.nombre} agotado` : `${item.nombre} — stock bajo`,
            detalle: `Cantidad: ${cant} (mínimo: ${min})`,
            entidad: item.nombre, entidadId: item.id,
          })
        }
        if (item.fecha_vencimiento) {
          const dias = diasEntre(item.fecha_vencimiento)
          if (dias < 0) {
            nuevas.push({
              id: uid(), tipo: 'inventario', prioridad: 'critica',
              titulo: `${item.nombre} vencido`,
              detalle: `Venció hace ${Math.abs(dias)} días (${item.fecha_vencimiento})`,
              entidad: item.nombre, entidadId: item.id, fecha: item.fecha_vencimiento,
            })
          } else if (dias <= 30) {
            nuevas.push({
              id: uid(), tipo: 'inventario', prioridad: dias <= 7 ? 'alta' : 'media',
              titulo: `${item.nombre} vence en ${dias} días`,
              detalle: `Fecha vencimiento: ${item.fecha_vencimiento}`,
              entidad: item.nombre, entidadId: item.id, fecha: item.fecha_vencimiento,
            })
          }
        }
      })

      // ── 6. Tareas vencidas ──
      const { data: tareas } = await supabase
        .from('tareas')
        .select('id, titulo, estado, fecha_vencimiento, asignado_a')
        .eq('finca_id', finca.id)
        .in('estado', ['pendiente', 'en_progreso'])

      ;(tareas ?? []).forEach((t: any) => {
        if (!t.fecha_vencimiento) return
        const dias = diasEntre(t.fecha_vencimiento)
        if (dias < 0) {
          nuevas.push({
            id: uid(), tipo: 'tarea', prioridad: 'alta',
            titulo: `Tarea vencida: ${t.titulo}`,
            detalle: `Venció hace ${Math.abs(dias)} días${t.asignado_a ? ` — Asignada a: ${t.asignado_a}` : ''}`,
            entidad: t.titulo, entidadId: t.id, fecha: t.fecha_vencimiento,
          })
        } else if (dias <= 3) {
          nuevas.push({
            id: uid(), tipo: 'tarea', prioridad: 'media',
            titulo: `Tarea por vencer: ${t.titulo}`,
            detalle: `Vence en ${dias} día${dias !== 1 ? 's' : ''}${t.asignado_a ? ` — ${t.asignado_a}` : ''}`,
            entidad: t.titulo, entidadId: t.id, fecha: t.fecha_vencimiento,
          })
        }
      })

      // ── 7. Desparasitaciones próximas ──
      const { data: despars } = await supabase
        .from('desparasitaciones')
        .select('id, animal_id, producto, proxima_desparasitacion')
        .not('proxima_desparasitacion', 'is', null)

      ;(despars ?? []).forEach((d: any) => {
        if (!animalIds.has(d.animal_id)) return
        const dias = diasEntre(d.proxima_desparasitacion)
        if (dias < 0) {
          nuevas.push({
            id: uid(), tipo: 'salud', prioridad: 'alta',
            titulo: `Desparasitación vencida`,
            detalle: `${animalMap[d.animal_id] ?? 'Animal'} — "${d.producto}" venció hace ${Math.abs(dias)} días`,
            entidad: animalMap[d.animal_id], entidadId: d.animal_id, fecha: d.proxima_desparasitacion,
          })
        } else if (dias <= 14) {
          nuevas.push({
            id: uid(), tipo: 'salud', prioridad: 'media',
            titulo: `Desparasitación en ${dias} días`,
            detalle: `${animalMap[d.animal_id] ?? 'Animal'} — "${d.producto}" el ${d.proxima_desparasitacion}`,
            entidad: animalMap[d.animal_id], entidadId: d.animal_id, fecha: d.proxima_desparasitacion,
          })
        }
      })

      // ── 8. Contar potreros ──
      const { count: potrerosCount } = await supabase
        .from('potreros')
        .select('id', { count: 'exact', head: true })
        .eq('finca_id', finca.id)
      datosExtra.totalPotreros = potrerosCount ?? 0

    } catch (e) {
      // Algunas tablas pueden no existir
    }

    nuevas.sort((a, b) => PRIORIDAD_CONFIG[a.prioridad].order - PRIORIDAD_CONFIG[b.prioridad].order)
    setAlertas(nuevas)
    setDatosExtraRef(datosExtra)
    setCargando(false)

    if (nuevas.length > 0) {
      analizarConIA(nuevas, datosExtra)
    }
  }

  useEffect(() => { escanear() }, [finca?.id])

  // ═══ FILTRADO ═══
  const alertasFiltradas = alertas.filter(a => {
    if (descartadas.has(a.id)) return false
    if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) return false
    if (filtroPrioridad !== 'todos' && a.prioridad !== filtroPrioridad) return false
    return true
  })

  const stats = {
    total: alertas.length - descartadas.size,
    criticas: alertas.filter(a => a.prioridad === 'critica' && !descartadas.has(a.id)).length,
    altas: alertas.filter(a => a.prioridad === 'alta' && !descartadas.has(a.id)).length,
    medias: alertas.filter(a => a.prioridad === 'media' && !descartadas.has(a.id)).length,
    bajas: alertas.filter(a => a.prioridad === 'baja' && !descartadas.has(a.id)).length,
  }

  const tiposPresentes = [...new Set(alertas.filter(a => !descartadas.has(a.id)).map(a => a.tipo))]

  // ═══ AGRUPAR PARA REPORTE ═══
  function alertasAgrupadas(ids: Set<string>) {
    const seleccionadas = alertas.filter(a => ids.has(a.id))
    const agrupadas: Record<string, Alerta[]> = {}
    seleccionadas.forEach(a => {
      const key = a.tipo
      if (!agrupadas[key]) agrupadas[key] = []
      agrupadas[key].push(a)
    })
    return agrupadas
  }

  // ═══ RENDER ═══
  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Alertas Inteligentes
            <span className="flex items-center gap-1 text-xs font-medium bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-2 py-0.5 rounded-full">
              <Sparkles size={10} /> IA
            </span>
          </h2>
          <p className="text-sm text-gray-500">Escaneo automático + recomendaciones con IA</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variante="secundario" onClick={() => { setReporteSeleccionadas(new Set()); setReporteNotas(''); setReporteIASugerencia(''); setReporteVetNombre(''); setReporteModalAbierto(true) }}>
            <FileText size={14} /> Reporte Vet
          </Button>
          <Button variante="secundario" onClick={escanear} cargando={cargando}>
            <RefreshCw size={14} /> Actualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { l: 'Total',    v: stats.total,    icon: <Bell size={18} />, bg2: 'bg-gray-50', c2: 'text-gray-700' },
          { l: 'Críticas', v: stats.criticas, icon: <ShieldAlert size={18} />, bg2: PRIORIDAD_CONFIG.critica.bg, c2: PRIORIDAD_CONFIG.critica.color },
          { l: 'Altas',    v: stats.altas,    icon: <AlertTriangle size={18} />, bg2: PRIORIDAD_CONFIG.alta.bg, c2: PRIORIDAD_CONFIG.alta.color },
          { l: 'Medias',   v: stats.medias,   icon: <Clock size={18} />, bg2: PRIORIDAD_CONFIG.media.bg, c2: PRIORIDAD_CONFIG.media.color },
          { l: 'Bajas',    v: stats.bajas,    icon: <Bell size={18} />, bg2: PRIORIDAD_CONFIG.baja.bg, c2: PRIORIDAD_CONFIG.baja.color },
        ].map(s => (
          <div key={s.l} className={`${s.bg2} rounded-xl p-3 flex items-center gap-3`}>
            <div className={s.c2}>{s.icon}</div>
            <div>
              <p className={`text-xl font-bold ${s.c2}`}>{s.v}</p>
              <p className="text-xs text-gray-500">{s.l}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ PANEL IA ═══ */}
      {(iaAnalizando || recomendaciones.length > 0 || iaError) && (
        <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-2xl border border-purple-200/60 shadow-sm overflow-hidden">
          <button
            onClick={() => setIaExpandido(!iaExpandido)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-purple-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-sm">
                <Brain size={18} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  Análisis IA
                  {iaAnalizando && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full animate-pulse">
                      Analizando...
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">Recomendaciones basadas en tus datos reales</p>
              </div>
            </div>
            <span className="text-gray-400">
              {iaExpandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          {iaExpandido && (
            <div className="px-5 pb-5">
              {iaAnalizando && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center animate-pulse">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-purple-300 animate-ping" />
                  </div>
                  <p className="text-sm text-purple-700 font-medium">Analizando {alertas.length} alertas con IA...</p>
                  <p className="text-xs text-gray-400">Generando recomendaciones personalizadas</p>
                </div>
              )}

              {iaError && !iaAnalizando && (
                <div className="bg-white/70 rounded-xl p-4 border border-red-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-700">{iaError}</p>
                      <button
                        onClick={() => analizarConIA(alertas, datosExtraRef)}
                        className="mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium underline"
                      >
                        Reintentar análisis
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!iaAnalizando && recomendaciones.length > 0 && (
                <div className="flex flex-col gap-3">
                  {iaResumen && (
                    <div className="bg-white/70 rounded-xl p-4 border border-purple-100">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Brain size={16} className="text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-purple-600 mb-1">Diagnóstico general</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{iaResumen}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recomendaciones.map((rec, i) => (
                      <div key={i} className="bg-white/80 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {RECO_ICON[rec.icono] ?? RECO_ICON.general}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 mb-1">{rec.titulo}</p>
                            <p className="text-xs text-gray-600 leading-relaxed">{rec.detalle}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => analizarConIA(alertas, datosExtraRef)}
                    className="self-center flex items-center gap-1.5 text-xs text-purple-500 hover:text-purple-700 font-medium mt-1 transition-colors"
                  >
                    <Sparkles size={12} /> Generar nuevas recomendaciones
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filtros por tipo */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFiltroTipo('todos')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filtroTipo === 'todos' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Todas
        </button>
        {tiposPresentes.map(t => {
          const cfg = TIPO_CONFIG[t]
          if (!cfg) return null
          const count = alertas.filter(a => a.tipo === t && !descartadas.has(a.id)).length
          return (
            <button key={t} onClick={() => setFiltroTipo(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${filtroTipo === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {cfg.icon} {cfg.label} ({count})
            </button>
          )
        })}
        <span className="w-px bg-gray-200 mx-1" />
        {(['critica', 'alta', 'media', 'baja'] as const).map(p => {
          const cfg = PRIORIDAD_CONFIG[p]
          const count = alertas.filter(a => a.prioridad === p && !descartadas.has(a.id)).length
          if (count === 0) return null
          return (
            <button key={p} onClick={() => setFiltroPrioridad(filtroPrioridad === p ? 'todos' : p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${filtroPrioridad === p ? `${cfg.bg} ${cfg.color}` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Cargando */}
      {cargando ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="animate-spin h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-400">Escaneando datos de la finca...</p>
          </div>
        </Card>
      ) : alertasFiltradas.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <p className="text-base font-semibold text-gray-800">Todo en orden</p>
            <p className="text-sm text-gray-400 mt-1">
              {alertas.length === 0 ? 'No se encontraron alertas en tus datos' : 'Todas las alertas han sido descartadas o filtradas'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {alertasFiltradas.map(alerta => {
            const pri = PRIORIDAD_CONFIG[alerta.prioridad]
            const tipo = TIPO_CONFIG[alerta.tipo]
            const expandida = expandidas.has(alerta.id)

            return (
              <div key={alerta.id}
                className={`bg-white rounded-xl border ${pri.border} shadow-sm overflow-hidden transition-all`}>
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50"
                  onClick={() => toggleExpand(alerta.id)}>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pri.dot}`} />
                  <span className={`flex-shrink-0 ${tipo?.color ?? 'text-gray-500'}`}>
                    {tipo?.icon ?? <Bell size={14} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{alerta.titulo}</p>
                    {!expandida && (
                      <p className="text-xs text-gray-400 truncate">{alerta.detalle}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${pri.bg} ${pri.color} flex-shrink-0`}>
                    {pri.label}
                  </span>
                  <span className="text-gray-300 flex-shrink-0">
                    {expandida ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </div>

                {expandida && (
                  <div className={`px-4 py-3 border-t ${pri.border} ${pri.bg}`}>
                    <p className="text-sm text-gray-700 mb-2">{alerta.detalle}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {alerta.entidad && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          📍 {alerta.entidad}
                        </span>
                      )}
                      {alerta.fecha && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={10} /> {alerta.fecha}
                        </span>
                      )}
                      <span className={`text-xs flex items-center gap-1 ${tipo?.color ?? 'text-gray-500'}`}>
                        {tipo?.icon} {tipo?.label}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={(e) => { e.stopPropagation(); setDescartadas(prev => new Set(prev).add(alerta.id)) }}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1">
                        <CheckCircle2 size={12} /> Descartar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Descartadas */}
      {descartadas.size > 0 && (
        <button onClick={() => setDescartadas(new Set())}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors self-center mt-2">
          Mostrar {descartadas.size} alerta{descartadas.size > 1 ? 's' : ''} descartada{descartadas.size > 1 ? 's' : ''}
        </button>
      )}

      {/* ═══ MODAL REPORTE VETERINARIO ═══ */}
      <Modal abierto={reporteModalAbierto} onCerrar={() => setReporteModalAbierto(false)}
        titulo="Generar Reporte Veterinario" tamano="2xl">
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">

          {/* Info del vet */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del veterinario (opcional)</label>
            <input
              type="text"
              value={reporteVetNombre}
              onChange={e => setReporteVetNombre(e.target.value)}
              placeholder="Dr. Juan Pérez"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Selección rápida */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Seleccionar alertas para el reporte</p>
            <div className="flex gap-2 flex-wrap mb-3">
              <button onClick={seleccionarCriticasAltas}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors">
                Críticas + Altas
              </button>
              <button onClick={seleccionarTodas}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors">
                Todas
              </button>
              <button onClick={() => setReporteSeleccionadas(new Set())}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors">
                Ninguna
              </button>
              <span className="w-px bg-gray-200 mx-0.5" />
              {tiposPresentes.map(t => {
                const cfg = TIPO_CONFIG[t]
                if (!cfg) return null
                return (
                  <button key={t} onClick={() => seleccionarPorTipo(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors flex items-center gap-1">
                    {cfg.icon} {cfg.label}
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-gray-400 mb-2">
              {reporteSeleccionadas.size} de {alertas.length} seleccionadas
            </p>
          </div>

          {/* Lista de alertas con checkboxes agrupadas */}
          <div className="flex flex-col gap-3">
            {Object.entries(alertasAgrupadas(new Set(alertas.map(a => a.id)))).map(([tipo, als]) => {
              const cfg = TIPO_CONFIG[tipo]
              const todasSeleccionadas = als.every(a => reporteSeleccionadas.has(a.id))
              return (
                <div key={tipo} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Header del grupo */}
                  <button
                    onClick={() => {
                      setReporteSeleccionadas(prev => {
                        const next = new Set(prev)
                        if (todasSeleccionadas) {
                          als.forEach(a => next.delete(a.id))
                        } else {
                          als.forEach(a => next.add(a.id))
                        }
                        return next
                      })
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    {todasSeleccionadas ? (
                      <CheckSquare size={16} className="text-green-600" />
                    ) : (
                      <Square size={16} className="text-gray-400" />
                    )}
                    <span className={`${cfg?.color ?? 'text-gray-500'}`}>{cfg?.icon}</span>
                    <span className="text-sm font-semibold text-gray-800">{cfg?.label ?? tipo}</span>
                    <span className="text-xs text-gray-400 ml-auto">{als.length}</span>
                  </button>

                  {/* Items */}
                  <div className="divide-y divide-gray-100">
                    {als.map(a => {
                      const pri = PRIORIDAD_CONFIG[a.prioridad]
                      const seleccionada = reporteSeleccionadas.has(a.id)
                      return (
                        <button
                          key={a.id}
                          onClick={() => toggleReporteAlerta(a.id)}
                          className={`w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${seleccionada ? 'bg-green-50/30' : ''}`}
                        >
                          {seleccionada ? (
                            <CheckSquare size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Square size={14} className="text-gray-300 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">{a.titulo}</p>
                            <p className="text-xs text-gray-400 truncate">{a.detalle}</p>
                          </div>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${pri.bg} ${pri.color}`}>
                            {pri.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Notas adicionales */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notas adicionales para el veterinario</label>
            <textarea
              value={reporteNotas}
              onChange={e => setReporteNotas(e.target.value)}
              placeholder="Ej: La vaca #23 viene cojeando desde el lunes. El becerro nuevo no quiere tomar leche..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Sugerencia IA */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-purple-800 flex items-center gap-1.5">
                <Sparkles size={14} /> Sugerencias IA para la visita
              </p>
              <button
                onClick={sugerirReporteIA}
                disabled={reporteIAGenerando || reporteSeleccionadas.size === 0}
                className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                {reporteIAGenerando ? (
                  <>
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generando...
                  </>
                ) : (
                  <>
                    <Brain size={12} /> Generar sugerencias
                  </>
                )}
              </button>
            </div>
            {reporteSeleccionadas.size === 0 && (
              <p className="text-xs text-purple-400">Selecciona alertas para que la IA pueda analizar la situación</p>
            )}
            {reporteIASugerencia && (
              <div className="mt-2 bg-white/60 rounded-lg p-3 border border-purple-100">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{reporteIASugerencia}</p>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 sticky bottom-0 bg-white py-3">
            <p className="text-xs text-gray-400">
              {reporteSeleccionadas.size} alertas en el reporte
            </p>
            <div className="flex gap-2">
              <Button variante="secundario" onClick={() => setReporteModalAbierto(false)}>
                Cancelar
              </Button>
              <Button
                variante="secundario"
                onClick={() => { copiarReporte(); }}
                disabled={reporteSeleccionadas.size === 0}
              >
                <ClipboardCopy size={14} /> Copiar texto
              </Button>
              <Button
                onClick={generarPDF}
                disabled={reporteSeleccionadas.size === 0 || generandoPDF}
                cargando={generandoPDF}
              >
                <Download size={14} /> Descargar PDF
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
