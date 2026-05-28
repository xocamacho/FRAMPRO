import jsPDF from 'jspdf'

// ── Tipos ───────────────────────────────────────────────────────
interface AlertaReporte {
  tipo: string
  prioridad: string
  titulo: string
  detalle: string
  entidad?: string
  fecha?: string
}

interface DatosReporte {
  fincaNombre: string
  fincaUbicacion?: string
  veterinarioNombre?: string
  alertas: AlertaReporte[]
  notas?: string
  sugerenciaIA?: string
  totalAnimales?: number
  totalPotreros?: number
}

const TIPO_LABELS: Record<string, string> = {
  vacuna: 'Vacunación',
  reproduccion: 'Reproducción',
  pesaje: 'Pesajes',
  inventario: 'Inventario',
  tarea: 'Tareas',
  salud: 'Salud',
  leche: 'Producción',
}

const PRIORIDAD_LABELS: Record<string, string> = {
  critica: 'CRÍTICA',
  alta: 'ALTA',
  media: 'MEDIA',
  baja: 'BAJA',
}

// Colores por prioridad (RGB)
const PRIORIDAD_COLOR: Record<string, [number, number, number]> = {
  critica: [185, 28, 28],
  alta: [194, 65, 12],
  media: [161, 98, 7],
  baja: [29, 78, 216],
}

const TIPO_COLOR: Record<string, [number, number, number]> = {
  vacuna: [126, 34, 206],
  reproduccion: [190, 24, 93],
  pesaje: [37, 99, 235],
  inventario: [234, 88, 12],
  tarea: [217, 119, 6],
  salud: [220, 38, 38],
  leche: [161, 98, 7],
}

// ── Generador de PDF ────────────────────────────────────────────
export function generarReporteVeterinarioPDF(datos: DatosReporte): void {
  const doc = new jsPDF('p', 'mm', 'letter')
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const ML = 18  // margen izquierdo
  const MR = 18  // margen derecho
  const CW = W - ML - MR  // content width
  let y = 0

  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  function checkPage(needed: number) {
    if (y + needed > H - 25) {
      // Footer
      addFooter()
      doc.addPage()
      y = 18
    }
  }

  function addFooter() {
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text('Generado por FincaPro — Sistema de Gestión Ganadera', ML, H - 10)
    doc.text(`Página ${doc.getNumberOfPages()}`, W - MR, H - 10, { align: 'right' })
  }

  // ═══════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════
  y = 16

  // Barra superior verde
  doc.setFillColor(22, 101, 52) // green-800
  doc.rect(0, 0, W, 4, 'F')

  // Título
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(17, 24, 39)
  doc.text('Reporte para Visita Veterinaria', ML, y)
  y += 8

  // Línea separadora
  doc.setDrawColor(22, 101, 52)
  doc.setLineWidth(0.5)
  doc.line(ML, y, W - MR, y)
  y += 6

  // Info de la finca
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(75, 85, 99)
  doc.text(`Finca:`, ML, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 24, 39)
  doc.text(datos.fincaNombre, ML + 14, y)
  y += 5

  if (datos.fincaUbicacion) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text(`Ubicación: ${datos.fincaUbicacion}`, ML, y)
    y += 5
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text(`Fecha: ${fechaHoy}`, ML, y)

  if (datos.veterinarioNombre) {
    doc.text(`Veterinario: ${datos.veterinarioNombre}`, W / 2, y)
  }
  y += 4

  // Datos generales
  if (datos.totalAnimales || datos.totalPotreros) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    const info: string[] = []
    if (datos.totalAnimales) info.push(`${datos.totalAnimales} animales`)
    if (datos.totalPotreros) info.push(`${datos.totalPotreros} potreros`)
    doc.text(info.join(' | '), ML, y)
    y += 4
  }

  y += 3

  // ═══════════════════════════════════════════════════════════════
  // RESUMEN DE PRIORIDADES
  // ═══════════════════════════════════════════════════════════════
  const conteos = {
    critica: datos.alertas.filter(a => a.prioridad === 'critica').length,
    alta: datos.alertas.filter(a => a.prioridad === 'alta').length,
    media: datos.alertas.filter(a => a.prioridad === 'media').length,
    baja: datos.alertas.filter(a => a.prioridad === 'baja').length,
  }

  // Cajas de resumen
  const boxW = (CW - 9) / 4
  const boxH = 14
  const boxStartX = ML

  const boxes: { label: string; count: number; color: [number, number, number]; bg: [number, number, number] }[] = [
    { label: 'Críticas',  count: conteos.critica, color: [153, 27, 27],   bg: [254, 226, 226] },
    { label: 'Altas',     count: conteos.alta,    color: [154, 52, 18],   bg: [255, 237, 213] },
    { label: 'Medias',    count: conteos.media,   color: [133, 77, 14],   bg: [254, 249, 195] },
    { label: 'Bajas',     count: conteos.baja,    color: [30, 64, 175],   bg: [219, 234, 254] },
  ]

  boxes.forEach((box, i) => {
    const bx = boxStartX + i * (boxW + 3)
    doc.setFillColor(...box.bg)
    doc.roundedRect(bx, y, boxW, boxH, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...box.color)
    doc.text(String(box.count), bx + boxW / 2, y + 7.5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(box.label, bx + boxW / 2, y + 12, { align: 'center' })
  })

  y += boxH + 6

  // ═══════════════════════════════════════════════════════════════
  // ALERTAS AGRUPADAS POR TIPO
  // ═══════════════════════════════════════════════════════════════
  const agrupadas: Record<string, AlertaReporte[]> = {}
  datos.alertas.forEach(a => {
    if (!agrupadas[a.tipo]) agrupadas[a.tipo] = []
    agrupadas[a.tipo].push(a)
  })

  // Ordenar grupos: primero los que tienen críticas
  const gruposOrdenados = Object.entries(agrupadas).sort((a, b) => {
    const aCrit = a[1].filter(x => x.prioridad === 'critica').length
    const bCrit = b[1].filter(x => x.prioridad === 'critica').length
    return bCrit - aCrit
  })

  gruposOrdenados.forEach(([tipo, als]) => {
    checkPage(20)

    // Header del grupo
    const tipoColor = TIPO_COLOR[tipo] ?? [75, 85, 99]
    doc.setFillColor(tipoColor[0], tipoColor[1], tipoColor[2])
    doc.roundedRect(ML, y, CW, 7, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text(`  ${(TIPO_LABELS[tipo] ?? tipo).toUpperCase()}`, ML + 1, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`${als.length} alerta${als.length > 1 ? 's' : ''}  `, W - MR - 1, y + 5, { align: 'right' })
    y += 10

    // Items
    als.forEach((a, idx) => {
      checkPage(16)

      const priColor = PRIORIDAD_COLOR[a.prioridad] ?? [107, 114, 128]

      // Dot de prioridad
      doc.setFillColor(...priColor)
      doc.circle(ML + 3, y + 1.5, 1.5, 'F')

      // Prioridad label
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...priColor)
      doc.text(`[${PRIORIDAD_LABELS[a.prioridad] ?? a.prioridad}]`, ML + 7, y + 2.5)

      // Título
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(31, 41, 55)
      const tituloX = ML + 7 + doc.getTextWidth(`[${PRIORIDAD_LABELS[a.prioridad] ?? a.prioridad}] `)
      const tituloMaxW = W - MR - tituloX
      const tituloLines = doc.splitTextToSize(a.titulo, tituloMaxW)
      doc.text(tituloLines[0], tituloX, y + 2.5)
      y += 5

      // Detalle
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(107, 114, 128)
      const detalleLines = doc.splitTextToSize(a.detalle, CW - 8)
      detalleLines.slice(0, 3).forEach((line: string) => {
        checkPage(5)
        doc.text(line, ML + 7, y)
        y += 3.5
      })

      // Entidad y fecha en línea
      if (a.entidad || a.fecha) {
        doc.setFontSize(7)
        doc.setTextColor(156, 163, 175)
        const info: string[] = []
        if (a.entidad) info.push(a.entidad)
        if (a.fecha) info.push(a.fecha)
        doc.text(info.join(' — '), ML + 7, y)
        y += 3.5
      }

      // Separador sutil entre items
      if (idx < als.length - 1) {
        doc.setDrawColor(229, 231, 235)
        doc.setLineWidth(0.2)
        doc.line(ML + 7, y, W - MR, y)
        y += 2
      }
    })

    y += 5
  })

  // ═══════════════════════════════════════════════════════════════
  // NOTAS ADICIONALES
  // ═══════════════════════════════════════════════════════════════
  if (datos.notas && datos.notas.trim()) {
    checkPage(20)

    doc.setFillColor(249, 250, 251)
    doc.roundedRect(ML, y, CW, 7, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(55, 65, 81)
    doc.text('  NOTAS ADICIONALES', ML + 1, y + 5)
    y += 10

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(75, 85, 99)
    const notasLines = doc.splitTextToSize(datos.notas, CW - 4)
    notasLines.forEach((line: string) => {
      checkPage(5)
      doc.text(line, ML + 2, y)
      y += 4
    })
    y += 4
  }

  // ═══════════════════════════════════════════════════════════════
  // SUGERENCIAS IA
  // ═══════════════════════════════════════════════════════════════
  if (datos.sugerenciaIA && datos.sugerenciaIA.trim()) {
    checkPage(20)

    doc.setFillColor(237, 233, 254) // purple-100
    doc.roundedRect(ML, y, CW, 7, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(88, 28, 135) // purple-800
    doc.text('  ANÁLISIS Y SUGERENCIAS (IA)', ML + 1, y + 5)
    y += 10

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(75, 85, 99)
    const iaLines = doc.splitTextToSize(datos.sugerenciaIA, CW - 4)
    iaLines.forEach((line: string) => {
      checkPage(4.5)
      doc.text(line, ML + 2, y)
      y += 3.8
    })
    y += 6
  }

  // ═══════════════════════════════════════════════════════════════
  // SECCIÓN DE FIRMAS
  // ═══════════════════════════════════════════════════════════════
  checkPage(35)
  y += 8

  doc.setDrawColor(156, 163, 175)
  doc.setLineWidth(0.3)

  // Firma ganadero
  const firmaW = (CW - 20) / 2
  doc.line(ML, y + 15, ML + firmaW, y + 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)
  doc.text('Firma del Ganadero', ML + firmaW / 2, y + 19, { align: 'center' })

  // Firma veterinario
  const firmaX2 = ML + firmaW + 20
  doc.line(firmaX2, y + 15, firmaX2 + firmaW, y + 15)
  doc.text('Firma del Veterinario', firmaX2 + firmaW / 2, y + 19, { align: 'center' })

  if (datos.veterinarioNombre) {
    doc.setFontSize(7)
    doc.setTextColor(156, 163, 175)
    doc.text(datos.veterinarioNombre, firmaX2 + firmaW / 2, y + 23, { align: 'center' })
  }

  // ═══════════════════════════════════════════════════════════════
  // FOOTER en todas las páginas
  // ═══════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text('Generado por FincaPro — Sistema de Gestión Ganadera', ML, H - 10)
    doc.text(`Página ${i} de ${totalPages}`, W - MR, H - 10, { align: 'right' })
    doc.text(fechaHoy, W / 2, H - 10, { align: 'center' })

    // Línea footer
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.2)
    doc.line(ML, H - 14, W - MR, H - 14)
  }

  // ═══════════════════════════════════════════════════════════════
  // GUARDAR
  // ═══════════════════════════════════════════════════════════════
  const fechaArchivo = new Date().toISOString().slice(0, 10)
  doc.save(`Reporte_Veterinario_${datos.fincaNombre.replace(/\s+/g, '_')}_${fechaArchivo}.pdf`)
}
