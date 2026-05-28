import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ImageEditor } from '@/components/ui/ImageEditor'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import { agregarALaCola } from '@/services/offlineSync'
import type { Animal, Potrero } from '@/types'
import { Plus, Search, Filter, Beef, Pencil, Trash2, Eye, X, ChevronDown, Camera, Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react'
import jsPDF from 'jspdf'

const RAZAS = [
  'Brahman', 'Gyr', 'Guzerat', 'Holstein', 'Jersey', 'Pardo Suizo',
  'Simmental', 'Angus', 'Charolais', 'Senepol', 'Girolando',
  'F1 (Holstein x Brahman)', 'Mestizo', 'Otra',
]

const ESTADOS = ['sano', 'enfermo', 'prenada', 'lactando', 'reproductor']

interface FilaImportacion {
  nombre: string
  sexo: string
  especie: string
  raza: string
  numero_arete: string
  chip_ica: string
  peso_kg: string
  bcs: string
  estado: string
  fecha_nacimiento: string
  color_marcas: string
  es_ajena: string
  propietario_ajena: string
  _errores: string[]
  _fila: number
}

const CABECERAS_CSV = [
  'nombre', 'sexo', 'especie', 'raza', 'numero_arete', 'chip_ica',
  'peso_kg', 'bcs', 'estado', 'fecha_nacimiento', 'color_marcas',
  'es_ajena', 'propietario_ajena',
]

export function Animales() {
  const { finca } = useAuthStore()

  // ── Estado ──
  const [animales, setAnimales] = useState<Animal[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroSexo, setFiltroSexo] = useState<'todos' | 'macho' | 'hembra'>('todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'sano' | 'enfermo' | 'prenada' | 'lactando' | 'reproductor'>('todos')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)

  // ── Modal Crear/Editar ──
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Animal | null>(null)
  const [nombre, setNombre] = useState('')
  const [sexo, setSexo] = useState<'macho' | 'hembra'>('hembra')
  const [especie, setEspecie] = useState('bovino')
  const [raza, setRaza] = useState('')
  const [razaCustom, setRazaCustom] = useState('')
  const [arete, setArete] = useState('')
  const [chipICA, setChipICA] = useState('')
  const [peso, setPeso] = useState('')
  const [bcs, setBCS] = useState('')
  const [estado, setEstado] = useState<'sano' | 'enfermo' | 'prenada' | 'lactando' | 'reproductor'>('sano')
  const [fechaNac, setFechaNac] = useState('')
  const [colorMarcas, setColorMarcas] = useState('')
  const [esAjena, setEsAjena] = useState(false)
  const [duenoAjena, setDuenoAjena] = useState('')
  const [foto, setFoto] = useState<string | null>(null)
  const [cargandoFoto, setCargandoFoto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [editorFotoAbierto, setEditorFotoAbierto] = useState(false)

  // ── Modal Detalle ──
  const [animalDetalle, setAnimalDetalle] = useState<Animal | null>(null)

  // ── Modal Eliminar ──
  const [eliminando, setEliminando] = useState<Animal | null>(null)

  // ── Modal Importar Masivo ──
  const [modalImportar, setModalImportar] = useState(false)
  const [importarPaso, setImportarPaso] = useState<'upload' | 'preview' | 'resultado'>('upload')
  const [filasImportar, setFilasImportar] = useState<FilaImportacion[]>([])
  const [importando, setImportando] = useState(false)
  const [resultadoImport, setResultadoImport] = useState({ ok: 0, errores: 0 })

  // ── Potreros (para selector) ──
  const [potreros, setPotreros] = useState<Potrero[]>([])
  const [potreroId, setPotreroId] = useState('')

  // ═══ CARGAR ANIMALES ═══
  async function cargarAnimales() {
    if (!finca?.id) {
      setCargando(false)
      return
    }
    setCargando(true)
    try {
      const { data, error: err } = await supabase
        .from('animales')
        .select('*')
        .eq('finca_id', finca.id)
        .order('fecha_creacion', { ascending: false })

      if (err) {
        console.error('❌ Error cargando animales:', err)
      } else {
        console.log('✅ Animales cargados:', data?.length ?? 0)
        setAnimales(data ?? [])
      }
    } catch (err) {
      console.error('❌ Error en cargarAnimales:', err)
    }
    setCargando(false)
  }

  async function cargarPotreros() {
    if (!finca?.id) return
    const { data } = await supabase
      .from('potreros')
      .select('id, nombre, estado, color_hex')
      .eq('finca_id', finca.id)
      .order('nombre')
    setPotreros((data as Potrero[]) ?? [])
  }

  useEffect(() => {
    cargarAnimales()
    cargarPotreros()
  }, [finca?.id])

  // ═══ GUARDAR FOTO EDITADA ═══
  async function guardarFotoEditada(blob: Blob) {
    if (!finca?.id) {
      setError('No hay finca asociada')
      return
    }

    setCargandoFoto(true)
    console.log('📸 Guardando foto editada')

    try {
      const ext = 'jpg'
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      const path = `animales/${finca.id}/${filename}`

      // Convertir blob a File
      const file = new File([blob], filename, { type: 'image/jpeg' })

      const { data, error: uploadError } = await supabase.storage.from('fotos').upload(path, file, {
        upsert: false,
        contentType: 'image/jpeg',
      })

      if (uploadError) {
        console.error('❌ Error Supabase al subir:', uploadError)
        setError('No se puede guardar la foto. Intenta de nuevo.')
      } else {
        const { data: urlData } = supabase.storage.from('fotos').getPublicUrl(path)
        setFoto(urlData.publicUrl)
        setEditorFotoAbierto(false)
        console.log('✅ Foto editada y subida:', urlData.publicUrl)
      }
    } catch (err) {
      console.error('❌ Error:', err)
      setError('Error al guardar la foto.')
    }

    setCargandoFoto(false)
  }

  // ═══ SUBIR FOTO ═══
  async function subirFoto(file: File) {
    if (!finca?.id) {
      setError('No hay finca asociada')
      return
    }
    setCargandoFoto(true)
    console.log('📸 Iniciando subida de foto:', file.name)

    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? '')) {
        setError('Formato no permitido. Usa JPG, PNG, GIF o WebP')
        setCargandoFoto(false)
        return
      }

      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      const path = `animales/${finca.id}/${filename}`

      console.log('🔄 Subiendo a:', path)

      const { data, error: uploadError } = await supabase.storage.from('fotos').upload(path, file, {
        upsert: false,
        contentType: file.type,
      })

      if (uploadError) {
        console.error('❌ Error Supabase al subir:', uploadError)
        console.error('Código:', uploadError.statusCode)
        console.error('Mensaje:', uploadError.message)

        // Si el bucket no existe, lo creamos y volvemos a intentar
        if (uploadError.statusCode === 404 || uploadError.message.includes('not found')) {
          console.log('🔨 Creando bucket fotos...')
          const { error: createError } = await supabase.storage.createBucket('fotos', {
            public: true,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
          })

          if (createError) {
            console.error('❌ Error creando bucket:', createError)
            setError('No se puede guardar la foto. Continúa sin ella.')
            setCargandoFoto(false)
            return
          }

          // Reintentamos subir
          const { data: retryData, error: retryError } = await supabase.storage.from('fotos').upload(path, file, {
            upsert: false,
            contentType: file.type,
          })

          if (retryError) {
            console.error('❌ Error en reintento:', retryError)
            setError('No se puede guardar la foto. Continúa sin ella.')
            setCargandoFoto(false)
            return
          }

          const { data: urlData } = supabase.storage.from('fotos').getPublicUrl(path)
          setFoto(urlData.publicUrl)
          console.log('✅ Foto subida después de crear bucket:', urlData.publicUrl)
        } else {
          setError('No se puede guardar la foto. Continúa sin ella.')
          console.warn('⚠️ La foto es opcional, puedes continuar sin ella')
        }
      } else {
        const { data: urlData } = supabase.storage.from('fotos').getPublicUrl(path)
        setFoto(urlData.publicUrl)
        console.log('✅ Foto subida exitosamente:', urlData.publicUrl)
      }
    } catch (err) {
      console.error('❌ Error subiendo foto:', err)
      setError('No se puede guardar la foto. Continúa sin ella.')
    }
    setCargandoFoto(false)
  }

  // ═══ FILTROS ═══
  const animalesFiltrados = animales.filter((a) => {
    const coincideBusqueda =
      a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.numero_arete?.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.raza?.toLowerCase().includes(busqueda.toLowerCase())

    const coincideSexo = filtroSexo === 'todos' || a.sexo === filtroSexo
    const coincideEstado = filtroEstado === 'todos' || a.estado === filtroEstado

    return coincideBusqueda && coincideSexo && coincideEstado
  })

  // ═══ STATS ═══
  const stats = {
    total: animales.length,
    hembras: animales.filter((a) => a.sexo === 'hembra').length,
    machos: animales.filter((a) => a.sexo === 'macho').length,
    enfermos: animales.filter((a) => a.estado === 'enfermo').length,
  }

  // ═══ ABRIR MODAL CREAR ═══
  function abrirCrear() {
    console.log('🔓 Abriendo modal crear')
    setEditando(null)
    setNombre('')
    setSexo('hembra')
    setEspecie('bovino')
    setRaza('')
    setRazaCustom('')
    setArete('')
    setChipICA('')
    setPeso('')
    setBCS('')
    setEstado('sano')
    setFechaNac('')
    setColorMarcas('')
    setEsAjena(false)
    setDuenoAjena('')
    setFoto(null)
    setPotreroId('')
    setError('')
    setModalAbierto(true)
  }

  // ═══ ABRIR MODAL EDITAR ═══
  function abrirEditar(animal: Animal) {
    setEditando(animal)
    setNombre(animal.nombre)
    setSexo(animal.sexo)
    setEspecie(animal.especie)
    setRaza(animal.raza ?? '')
    setRazaCustom('')
    setArete(animal.numero_arete ?? '')
    setChipICA(animal.chip_ica ?? '')
    setPeso(animal.peso_actual?.toString() ?? '')
    setBCS(animal.bcs_actual?.toString() ?? '')
    setEstado(animal.estado as any)
    setFechaNac(animal.fecha_nacimiento ?? '')
    setColorMarcas(animal.color_marcas ?? '')
    setEsAjena(animal.es_compania ?? false)
    setDuenoAjena(animal.propietario_compania ?? '')
    setFoto(animal.foto_url ?? null)
    setPotreroId(animal.potrero_id ?? '')
    setError('')
    setModalAbierto(true)
  }

  // ═══ GUARDAR ANIMAL ═══
  async function guardarAnimal() {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (!finca?.id) {
      setError('No hay finca asociada')
      return
    }

    setGuardando(true)
    setError('')

    const razaFinal = raza === 'Otra' ? razaCustom : raza

    const payload = {
      finca_id: finca.id,
      nombre: nombre.trim(),
      sexo,
      especie,
      raza: razaFinal || null,
      numero_arete: arete.trim() || null,
      chip_ica: chipICA.trim() || null,
      peso_actual: peso ? Number(peso) : null,
      bcs_actual: bcs ? Number(bcs) : null,
      estado,
      fecha_nacimiento: fechaNac || null,
      color_marcas: colorMarcas.trim() || null,
      es_compania: esAjena,
      propietario_compania: esAjena ? duenoAjena.trim() || null : null,
      foto_url: foto || null,
      potrero_id: potreroId || null,
    }

    try {
      // ── Modo offline: guardar en cola local ──
      if (!navigator.onLine) {
        const id_local = `offline-${Date.now()}`
        agregarALaCola({
          tabla: 'animales',
          operacion: editando ? 'update' : 'insert',
          payload: editando ? payload : { ...payload },
          entidadId: editando?.id,
          descripcion: `${editando ? 'Actualizar' : 'Crear'} animal: ${payload.nombre}`,
        })
        // Actualizar UI optimistamente
        if (!editando) {
          setAnimales(prev => [{ ...payload, id: id_local, fecha_creacion: new Date().toISOString() } as Animal, ...prev])
        } else {
          setAnimales(prev => prev.map(a => a.id === editando.id ? { ...a, ...payload } : a))
        }
        setModalAbierto(false)
        setEditando(null)
        setFoto(null)
        setGuardando(false)
        return
      }

      let result
      if (editando) {
        result = await supabase.from('animales').update(payload).eq('id', editando.id).select().single()
      } else {
        result = await supabase.from('animales').insert([payload]).select().single()
      }

      if (result.error) {
        setError(`Error: ${result.error.message}`)
      } else {
        setModalAbierto(false)
        setEditando(null)
        setFoto(null)
        requestAnimationFrame(() => cargarAnimales())
      }
    } catch (err) {
      console.error('❌ Error:', err)
      setError('Error al guardar. Intenta de nuevo.')
    }

    setGuardando(false)
  }

  // ═══ ELIMINAR ANIMAL ═══
  async function confirmarEliminar() {
    if (!eliminando) return

    try {
      const { error: err } = await supabase.from('animales').delete().eq('id', eliminando.id)

      if (err) {
        console.error('❌ Error eliminando:', err)
      } else {
        console.log('✅ Animal eliminado')
        setAnimales((prev) => prev.filter((a) => a.id !== eliminando.id))
        if (animalDetalle?.id === eliminando.id) setAnimalDetalle(null)
      }
    } catch (err) {
      console.error('❌ Error:', err)
    }

    setEliminando(null)
  }

  // ═══ DESCARGAR PLANTILLA CSV ═══
  function descargarPlantillaCSV() {
    const filaEjemplo1 = [
      'Estrella', 'hembra', 'bovino', 'Holstein', 'AR-001', '', '320', '3',
      'sano', '2021-05-15', 'Pinta negro con blanco', 'no', '',
    ]
    const filaEjemplo2 = [
      'Toro Grande', 'macho', 'bovino', 'Brahman', 'AR-002', 'ICA-9876', '550', '4',
      'sano', '2019-03-10', 'Gris claro', 'no', '',
    ]
    const filaEjemplo3 = [
      'La Mona', 'hembra', 'bovino', 'Mestizo', '', '', '280', '',
      'prenada', '2022-08-01', 'Amarilla', 'si', 'Carlos Pérez',
    ]
    const bom = '﻿'
    const lineas = [
      CABECERAS_CSV.join(','),
      filaEjemplo1.join(','),
      filaEjemplo2.join(','),
      filaEjemplo3.join(','),
    ]
    const csvContent = bom + lineas.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'Plantilla_Animales_FincaPro.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // ═══ DESCARGAR GUÍA PDF ═══
  function descargarGuiaPDF() {
    const doc = new jsPDF('p', 'mm', 'letter')
    const W = doc.internal.pageSize.getWidth()
    const H = doc.internal.pageSize.getHeight()
    const ML = 18, MR = 18, CW = W - ML - MR
    let y = 0

    // Barra verde superior
    doc.setFillColor(22, 101, 52)
    doc.rect(0, 0, W, 4, 'F')
    y = 18

    // Título
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(17, 24, 39)
    doc.text('Plantilla de Importación de Animales', ML, y)
    y += 7

    doc.setDrawColor(22, 101, 52)
    doc.setLineWidth(0.5)
    doc.line(ML, y, W - MR, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(75, 85, 99)
    doc.text('FincaPro — Sistema de Gestión Ganadera', ML, y)
    doc.setFontSize(9)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, W - MR, y, { align: 'right' })
    y += 10

    // Instrucciones
    doc.setFillColor(239, 246, 255)
    doc.roundedRect(ML, y, CW, 22, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 64, 175)
    doc.text('INSTRUCCIONES DE USO', ML + 4, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(55, 65, 81)
    const instrucciones = [
      '1. Descarga la plantilla CSV desde el botón "Descargar Plantilla CSV" en el módulo de Animales.',
      '2. Abre el archivo en Excel, Google Sheets o cualquier editor de hojas de cálculo.',
      '3. Completa los datos respetando los formatos indicados en esta guía. No modifiques los encabezados.',
      '4. Guarda el archivo en formato CSV y súbelo usando el botón "Importar Animales".',
    ]
    instrucciones.forEach((inst, i) => {
      doc.text(inst, ML + 4, y + 12 + i * 4)
    })
    y += 28

    // Tabla de campos
    doc.setFillColor(22, 101, 52)
    doc.rect(ML, y, CW, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    const cols = [0, 40, 20, 60, 30, 25]
    const xs = [ML + 2, ML + 40, ML + 62, ML + 84, ML + 148, ML + 148 + 28]
    doc.text('Campo', xs[0], y + 5.5)
    doc.text('¿Req?', xs[1] - 5, y + 5.5)
    doc.text('Tipo', xs[2] + 2, y + 5.5)
    doc.text('Valores permitidos', xs[3], y + 5.5)
    doc.text('Ejemplo', xs[4] + 5, y + 5.5)
    y += 10

    const campos = [
      ['nombre',           'SÍ',  'Texto',  'Cualquier nombre (máx. 100 chars)',       'Estrella, Toro #12'],
      ['sexo',             'SÍ',  'Texto',  'macho / hembra',                          'hembra'],
      ['especie',          'SÍ',  'Texto',  'bovino / equino / porcino',               'bovino'],
      ['raza',             'No',  'Texto',  'Ver lista de razas en la app',             'Brahman'],
      ['numero_arete',     'No',  'Texto',  'Código alfanumérico',                     'AR-001'],
      ['chip_ica',         'No',  'Texto',  'Código ICA del SINIGAN',                  'ICA-1234'],
      ['peso_kg',          'No',  'Número', 'Peso en kilogramos (sin unidad)',          '350'],
      ['bcs',              'No',  'Número', '1 (muy flaco) … 5 (obeso)',               '3'],
      ['estado',           'No',  'Texto',  'sano / enfermo / prenada / lactando / reproductor', 'sano'],
      ['fecha_nacimiento', 'No',  'Fecha',  'Formato AAAA-MM-DD',                      '2020-06-15'],
      ['color_marcas',     'No',  'Texto',  'Descripción libre',                       'Pinta negro con blanco'],
      ['es_ajena',         'No',  'Texto',  'si / no  (animal de compañía/ajeno)',     'no'],
      ['propietario_ajena','No',  'Texto',  'Nombre del dueño si es_ajena = si',       'Carlos Pérez'],
    ]

    campos.forEach((campo, idx) => {
      const bg = idx % 2 === 0 ? [249, 250, 251] : [255, 255, 255]
      doc.setFillColor(bg[0], bg[1], bg[2])
      doc.rect(ML, y, CW, 7, 'F')

      const esReq = campo[1] === 'SÍ'
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(esReq ? 22 : 75, esReq ? 101 : 85, esReq ? 52 : 99)
      doc.text(campo[0], xs[0], y + 4.5)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(esReq ? 185 : 107, esReq ? 28 : 114, esReq ? 28 : 128)
      doc.text(campo[1], xs[1] - 2, y + 4.5, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(75, 85, 99)
      doc.text(campo[2], xs[2] + 2, y + 4.5)
      doc.text(doc.splitTextToSize(campo[3], 62)[0], xs[3], y + 4.5)
      doc.text(campo[4], xs[4] + 5, y + 4.5)

      y += 7
    })

    // Separador
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.3)
    doc.line(ML, y + 2, W - MR, y + 2)
    y += 8

    // Nota importante
    doc.setFillColor(255, 251, 235)
    doc.roundedRect(ML, y, CW, 16, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(146, 64, 14)
    doc.text('NOTAS IMPORTANTES', ML + 4, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(78, 52, 46)
    doc.text('• La primera fila del CSV debe contener exactamente los nombres de columna mostrados arriba (sin tildes ni espacios).',  ML + 4, y + 11)
    doc.text('• Los campos con "SÍ" en la columna ¿Req? son obligatorios. Los demás pueden dejarse en blanco.', ML + 4, y + 15)
    y += 22

    // Footer
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text('Generado por FincaPro — Sistema de Gestión Ganadera', ML, H - 10)
    doc.text('Página 1 de 1', W - MR, H - 10, { align: 'right' })
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.2)
    doc.line(ML, H - 14, W - MR, H - 14)

    doc.save('Guia_Importacion_Animales_FincaPro.pdf')
  }

  // ═══ PARSEAR CSV ═══
  function parsearCSV(texto: string): FilaImportacion[] {
    const lineas = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
    if (lineas.length < 2) return []

    // Detectar encabezados (primera fila)
    const cabecera = lineas[0].split(',').map(c => c.trim().replace(/^"|"$/g, '').toLowerCase())

    const filas: FilaImportacion[] = []

    for (let i = 1; i < lineas.length; i++) {
      const valores = lineas[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const obj: Record<string, string> = {}
      cabecera.forEach((col, idx) => { obj[col] = valores[idx] ?? '' })

      const fila: FilaImportacion = {
        nombre:           (obj['nombre'] ?? '').trim(),
        sexo:             (obj['sexo'] ?? '').trim().toLowerCase(),
        especie:          (obj['especie'] ?? 'bovino').trim().toLowerCase(),
        raza:             (obj['raza'] ?? '').trim(),
        numero_arete:     (obj['numero_arete'] ?? '').trim(),
        chip_ica:         (obj['chip_ica'] ?? '').trim(),
        peso_kg:          (obj['peso_kg'] ?? '').trim(),
        bcs:              (obj['bcs'] ?? '').trim(),
        estado:           (obj['estado'] ?? 'sano').trim().toLowerCase(),
        fecha_nacimiento: (obj['fecha_nacimiento'] ?? '').trim(),
        color_marcas:     (obj['color_marcas'] ?? '').trim(),
        es_ajena:         (obj['es_ajena'] ?? 'no').trim().toLowerCase(),
        propietario_ajena:(obj['propietario_ajena'] ?? '').trim(),
        _errores: [],
        _fila: i + 1,
      }

      // Validaciones
      if (!fila.nombre) fila._errores.push('nombre es obligatorio')
      if (!['macho', 'hembra'].includes(fila.sexo)) fila._errores.push(`sexo inválido "${fila.sexo}"`)
      if (!['bovino', 'equino', 'porcino'].includes(fila.especie)) fila._errores.push(`especie inválida "${fila.especie}"`)
      if (fila.peso_kg && isNaN(Number(fila.peso_kg))) fila._errores.push('peso_kg debe ser número')
      if (fila.bcs && (isNaN(Number(fila.bcs)) || Number(fila.bcs) < 1 || Number(fila.bcs) > 5)) fila._errores.push('bcs debe ser 1-5')
      if (fila.estado && !['sano', 'enfermo', 'prenada', 'lactando', 'reproductor'].includes(fila.estado)) fila._errores.push(`estado inválido "${fila.estado}"`)
      if (fila.fecha_nacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fila.fecha_nacimiento)) fila._errores.push('fecha_nacimiento debe ser AAAA-MM-DD')

      filas.push(fila)
    }

    return filas
  }

  // ═══ MANEJAR ARCHIVO CSV ═══
  function manejarArchivoCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const texto = ev.target?.result as string
      const filas = parsearCSV(texto)
      setFilasImportar(filas)
      if (filas.length > 0) setImportarPaso('preview')
    }
    reader.readAsText(file, 'utf-8')
  }

  // ═══ IMPORTAR ANIMALES MASIVO ═══
  async function importarAnimalesMasivo() {
    if (!finca?.id) return
    setImportando(true)
    let ok = 0, errores = 0

    const filasBuenas = filasImportar.filter(f => f._errores.length === 0)

    // Insertar en lotes de 20
    const LOTE = 20
    for (let i = 0; i < filasBuenas.length; i += LOTE) {
      const lote = filasBuenas.slice(i, i + LOTE).map(f => ({
        finca_id:           finca.id,
        nombre:             f.nombre,
        sexo:               f.sexo as 'macho' | 'hembra',
        especie:            f.especie,
        raza:               f.raza || null,
        numero_arete:       f.numero_arete || null,
        chip_ica:           f.chip_ica || null,
        peso_actual:        f.peso_kg ? Number(f.peso_kg) : null,
        bcs_actual:         f.bcs ? Number(f.bcs) : null,
        estado:             f.estado || 'sano',
        fecha_nacimiento:   f.fecha_nacimiento || null,
        color_marcas:       f.color_marcas || null,
        es_compania:        f.es_ajena === 'si',
        propietario_compania: f.es_ajena === 'si' ? (f.propietario_ajena || null) : null,
        foto_url:           null,
        potrero_id:         null,
      }))

      const { error: err } = await supabase.from('animales').insert(lote)
      if (err) {
        console.error('Error importando lote:', err)
        errores += lote.length
      } else {
        ok += lote.length
      }
    }

    setResultadoImport({ ok, errores })
    setImportarPaso('resultado')
    setImportando(false)
    requestAnimationFrame(() => cargarAnimales())
  }

  function abrirImportar() {
    setImportarPaso('upload')
    setFilasImportar([])
    setResultadoImport({ ok: 0, errores: 0 })
    setModalImportar(true)
  }

  // ═══════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="p-6 flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Inventario de Animales</h2>
          <p className="text-sm text-gray-500">Gestiona tu hato ganadero</p>
        </div>
        <div className="flex gap-2">
          <Button variante="secundario" onClick={abrirImportar}>
            <Upload size={16} />
            Importar
          </Button>
          <Button onClick={abrirCrear}>
            <Plus size={16} />
            Agregar Animal
          </Button>
        </div>
      </div>

      {/* ── Búsqueda y Filtros ── */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre, arete o raza..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              icono={<Search size={14} />}
            />
          </div>
          <Button variante="secundario" onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}>
            <Filter size={16} />
            Filtros
            <ChevronDown size={14} className={`transition-transform ${filtrosAbiertos ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {filtrosAbiertos && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Sexo:</span>
              {(['todos', 'hembra', 'macho'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFiltroSexo(s)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    filtroSexo === s
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {s === 'todos' ? 'Todos' : s === 'hembra' ? '♀ Hembras' : '♂ Machos'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Estado:</span>
              {(['todos', 'sano', 'enfermo'] as const).map((e) => (
                <button
                  key={e}
                  onClick={() => setFiltroEstado(e as any)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    filtroEstado === e ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {e === 'todos' ? 'Todos' : e}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', valor: stats.total, var: 'gris' as const },
          { label: 'Hembras', valor: stats.hembras, var: 'verde' as const },
          { label: 'Machos', valor: stats.machos, var: 'azul' as const },
          { label: 'Enfermos', valor: stats.enfermos, var: 'rojo' as const },
        ].map((s) => (
          <Card key={s.label} padding="sm" className="text-center">
            <p className="text-2xl font-bold text-gray-900">{s.valor}</p>
            <Badge variante={s.var}>{s.label}</Badge>
          </Card>
        ))}
      </div>

      {/* ── Lista de Animales ── */}
      {cargando ? (
        <Card>
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </Card>
      ) : animalesFiltrados.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Beef size={28} className="text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Sin animales registrados</h3>
            <p className="text-sm text-gray-400 mt-1">Comienza agregando tu primer animal</p>
            <Button className="mt-4" onClick={abrirCrear}>
              <Plus size={16} />
              Agregar Animal
            </Button>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Arete</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Raza</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Sexo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Peso</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden xl:table-cell">Potrero</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {animalesFiltrados.map((animal) => (
                  <tr key={animal.id} className="border-b border-gray-50 hover:bg-green-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {animal.foto_url ? (
                          <img src={animal.foto_url} alt={animal.nombre} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <Beef size={14} className="text-green-600" />
                          </div>
                        )}
                        <p className="font-medium text-gray-900">{animal.nombre}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{animal.numero_arete ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{animal.raza ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variante={animal.sexo === 'hembra' ? 'verde' : 'azul'}>
                        {animal.sexo === 'hembra' ? '♀ H' : '♂ M'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                      {animal.peso_actual ? `${animal.peso_actual} kg` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variante={
                          animal.estado === 'sano'
                            ? 'verde'
                            : animal.estado === 'enfermo'
                              ? 'rojo'
                              : animal.estado === 'prenada'
                                ? 'azul'
                                : 'amarillo'
                        }
                      >
                        {animal.estado}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {(() => {
                        const pot = potreros.find((p) => p.id === animal.potrero_id)
                        if (!pot) return <span className="text-gray-400">—</span>
                        return (
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pot.color_hex ?? '#9ca3af' }} />
                            {pot.nombre}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setAnimalDetalle(animal)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => abrirEditar(animal)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setEliminando(animal)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ═════════════════════════════
           MODAL: CREAR / EDITAR
         ═════════════════════════════ */}
      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo={editando ? 'Editar Animal' : 'Nuevo Animal'} tamano="2xl">
        <div className="flex flex-col gap-5">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

          {/* FOTO */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            {foto ? (
              <img src={foto} alt="Foto" className="w-20 h-20 rounded-lg object-cover border border-gray-200" />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
                <Camera size={28} className="text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <button
                onClick={() => setEditorFotoAbierto(true)}
                disabled={cargandoFoto}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Camera size={16} />
                {cargandoFoto ? 'Subiendo...' : foto ? 'Cambiar foto' : 'Subir foto'}
              </button>
              <p className="text-xs text-gray-500 mt-2">JPG, PNG - Ajusta, recorta y rota (opcional)</p>
            </div>
          </div>

          {/* DATOS BÁSICOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nombre" placeholder="Ej: Estrella, #045" value={nombre} onChange={(e) => setNombre(e.target.value)} />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Sexo</label>
              <div className="flex gap-2">
                {(['hembra', 'macho'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSexo(s)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      sexo === s ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-300 text-gray-600'
                    }`}
                  >
                    {s === 'hembra' ? '♀ Hembra' : '♂ Macho'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Especie</label>
              <select
                value={especie}
                onChange={(e) => setEspecie(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="bovino">Bovino</option>
                <option value="equino">Equino</option>
                <option value="porcino">Porcino</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Raza</label>
              <select
                value={raza}
                onChange={(e) => setRaza(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Seleccionar raza...</option>
                {RAZAS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {raza === 'Otra' && (
            <Input label="Especifica la raza" placeholder="Ej: Criollo, Brahman Blanco" value={razaCustom} onChange={(e) => setRazaCustom(e.target.value)} />
          )}

          {/* IDENTIFICACIÓN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Número de Arete" placeholder="Ej: AR-001" value={arete} onChange={(e) => setArete(e.target.value)} />
            <Input label="Chip ICA" placeholder="Código ICA" value={chipICA} onChange={(e) => setChipICA(e.target.value)} />
          </div>

          {/* FECHA Y PESO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Fecha de Nacimiento" type="date" value={fechaNac} onChange={(e) => setFechaNac(e.target.value)} />
            <Input label="Peso (kg)" type="number" placeholder="Ej: 350" value={peso} onChange={(e) => setPeso(e.target.value)} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">BCS (1-5)</label>
              <select value={bcs} onChange={(e) => setBCS(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Sin BCS</option>
                <option value="1">1 - Muy flaco</option>
                <option value="2">2 - Flaco</option>
                <option value="3">3 - Ideal</option>
                <option value="4">4 - Gordo</option>
                <option value="5">5 - Obeso</option>
              </select>
            </div>
          </div>

          {/* CARACTERISTICAS */}
          <Input label="Color / Marcas" placeholder="Ej: Pinta negra con blanco, marca en oreja derecha" value={colorMarcas} onChange={(e) => setColorMarcas(e.target.value)} />

          {/* ESTADO */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Estado del Animal</label>
            <div className="flex flex-wrap gap-2">
              {ESTADOS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEstado(e as any)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    estado === e
                      ? 'bg-green-50 border-green-300 text-green-700 font-medium'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* POTRERO */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Potrero asignado
            </label>
            {potreros.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No hay potreros creados aún — créalos en el módulo Potreros</p>
            ) : (
              <select
                value={potreroId}
                onChange={(e) => setPotreroId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Sin asignar</option>
                {potreros.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* ANIMAL AJENO */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
              <input
                type="checkbox"
                id="esAjena"
                checked={esAjena}
                onChange={(e) => setEsAjena(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="esAjena" className="text-sm font-medium text-gray-700">
                Este animal es ajeno (propiedad compartida o a compañía)
              </label>
            </div>

            {esAjena && (
              <Input label="Nombre del dueño/copropietario" placeholder="Ej: Juan Pérez" value={duenoAjena} onChange={(e) => setDuenoAjena(e.target.value)} />
            )}
          </div>

          {/* BOTONES */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variante="secundario" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarAnimal} cargando={guardando}>
              {editando ? 'Guardar Cambios' : 'Agregar Animal'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═════════════════════════════
           MODAL: DETALLE
         ═════════════════════════════ */}
      <Modal abierto={!!animalDetalle} onCerrar={() => setAnimalDetalle(null)} titulo={animalDetalle?.nombre} tamano="2xl">
        {animalDetalle && (
          <div className="flex flex-col gap-6">
            {animalDetalle.foto_url && (
              <img src={animalDetalle.foto_url} alt={animalDetalle.nombre} className="w-full h-80 rounded-lg object-cover border border-gray-200" />
            )}

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Sexo', valor: animalDetalle.sexo === 'hembra' ? '♀ Hembra' : '♂ Macho' },
                { label: 'Especie', valor: animalDetalle.especie },
                { label: 'Raza', valor: animalDetalle.raza ?? '—' },
                { label: 'Arete', valor: animalDetalle.numero_arete ?? '—' },
                { label: 'Chip ICA', valor: animalDetalle.chip_ica ?? '—' },
                { label: 'Peso', valor: animalDetalle.peso_actual ? `${animalDetalle.peso_actual} kg` : '—' },
                { label: 'BCS', valor: animalDetalle.bcs_actual ? `${animalDetalle.bcs_actual}/5` : '—' },
                { label: 'Edad', valor: animalDetalle.fecha_nacimiento ? new Date(animalDetalle.fecha_nacimiento).toLocaleDateString('es-CO') : '—' },
                { label: 'Color/Marcas', valor: animalDetalle.color_marcas ?? '—' },
                { label: 'Estado', valor: animalDetalle.estado },
                {
                  label: 'Potrero',
                  valor: (() => {
                    const pot = potreros.find((p) => p.id === animalDetalle.potrero_id)
                    return pot?.nombre ?? '—'
                  })(),
                },
              ].map((item) => (
                <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{item.valor}</p>
                </div>
              ))}
            </div>

            {animalDetalle.es_compania && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-600 font-medium">⚠️ Animal Ajeno</p>
                <p className="text-sm text-amber-800 mt-1">Dueño/Copropietario: {animalDetalle.propietario_compania ?? 'Sin datos'}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                variante="peligro"
                tamano="sm"
                onClick={() => {
                  setAnimalDetalle(null)
                  setEliminando(animalDetalle)
                }}
              >
                <Trash2 size={14} />
                Eliminar
              </Button>
              <Button
                tamano="sm"
                onClick={() => {
                  setAnimalDetalle(null)
                  abrirEditar(animalDetalle)
                }}
              >
                <Pencil size={14} />
                Editar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═════════════════════════════
           MODAL: CONFIRMAR ELIMINAR
         ═════════════════════════════ */}
      <Modal abierto={!!eliminando} onCerrar={() => setEliminando(null)} titulo="Eliminar Animal" tamano="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            ¿Estás seguro de eliminar a <strong>{eliminando?.nombre}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-3">
            <Button variante="secundario" onClick={() => setEliminando(null)}>
              Cancelar
            </Button>
            <Button variante="peligro" onClick={confirmarEliminar}>
              Sí, eliminar
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═════════════════════════════
           MODAL: IMPORTAR MASIVO
         ═════════════════════════════ */}
      <Modal
        abierto={modalImportar}
        onCerrar={() => setModalImportar(false)}
        titulo="Importar Animales Masivo"
        tamano="2xl"
      >
        <div className="flex flex-col gap-5">

          {/* ── Paso 1: Upload ── */}
          {importarPaso === 'upload' && (
            <>
              {/* Botones descargar plantilla */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={descargarPlantillaCSV}
                  className="flex items-center gap-3 p-4 border-2 border-dashed border-green-300 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet size={20} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-green-800">Descargar Plantilla CSV</p>
                    <p className="text-xs text-green-600">Archivo Excel/Google Sheets con ejemplos</p>
                  </div>
                  <Download size={16} className="text-green-600 ml-auto flex-shrink-0" />
                </button>

                <button
                  onClick={descargarGuiaPDF}
                  className="flex items-center gap-3 p-4 border-2 border-dashed border-blue-300 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Download size={20} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-blue-800">Descargar Guía PDF</p>
                    <p className="text-xs text-blue-600">Referencia de campos y formatos permitidos</p>
                  </div>
                  <Download size={16} className="text-blue-600 ml-auto flex-shrink-0" />
                </button>
              </div>

              {/* Instrucciones */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-amber-700 mb-2">Pasos para importar:</p>
                <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
                  <li>Descarga la <strong>Plantilla CSV</strong> usando el botón de arriba</li>
                  <li>Ábrela en Excel o Google Sheets y completa los datos de tus animales</li>
                  <li>Guarda el archivo en formato <strong>CSV</strong> (no .xlsx)</li>
                  <li>Sube el archivo aquí para previsualizar e importar</li>
                </ol>
              </div>

              {/* Subir CSV */}
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-green-400 transition-colors">
                <Upload size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">Arrastra tu CSV aquí o haz clic</p>
                <p className="text-xs text-gray-400 mb-4">Solo archivos .csv</p>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-green-700 transition-colors">
                  <Upload size={16} />
                  Seleccionar CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={manejarArchivoCSV}
                  />
                </label>
              </div>
            </>
          )}

          {/* ── Paso 2: Preview ── */}
          {importarPaso === 'preview' && (
            <>
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{filasImportar.length}</p>
                  <p className="text-xs text-gray-500">Total filas</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-700">{filasImportar.filter(f => f._errores.length === 0).length}</p>
                  <p className="text-xs text-green-600">Listas para importar</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{filasImportar.filter(f => f._errores.length > 0).length}</p>
                  <p className="text-xs text-red-500">Con errores</p>
                </div>
              </div>

              {/* Tabla de preview */}
              <div className="overflow-x-auto max-h-72 border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Fila</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Estado</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Nombre</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Sexo</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Especie</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Raza</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Arete</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Peso</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Estado animal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasImportar.map((fila, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-gray-50 ${fila._errores.length > 0 ? 'bg-red-50' : 'hover:bg-green-50/30'}`}
                      >
                        <td className="px-3 py-2 text-gray-400">{fila._fila}</td>
                        <td className="px-3 py-2">
                          {fila._errores.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-green-700">
                              <CheckCircle2 size={13} /> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600" title={fila._errores.join('; ')}>
                              <AlertTriangle size={13} /> {fila._errores[0]}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900">{fila.nombre || <span className="text-red-400">—vacío—</span>}</td>
                        <td className="px-3 py-2 text-gray-600">{fila.sexo}</td>
                        <td className="px-3 py-2 text-gray-600">{fila.especie}</td>
                        <td className="px-3 py-2 text-gray-600">{fila.raza || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{fila.numero_arete || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{fila.peso_kg ? `${fila.peso_kg}kg` : '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{fila.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filasImportar.filter(f => f._errores.length > 0).length > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                  ⚠️ Las filas con errores serán omitidas. Corrige el CSV y vuelve a subir para incluirlas.
                </p>
              )}

              <div className="flex justify-between gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setImportarPaso('upload')}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  ← Volver
                </button>
                <Button
                  onClick={importarAnimalesMasivo}
                  cargando={importando}
                  disabled={filasImportar.filter(f => f._errores.length === 0).length === 0}
                >
                  Importar {filasImportar.filter(f => f._errores.length === 0).length} animales
                </Button>
              </div>
            </>
          )}

          {/* ── Paso 3: Resultado ── */}
          {importarPaso === 'resultado' && (
            <div className="flex flex-col items-center gap-6 py-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 size={40} className="text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900">Importación completada</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Se importaron <strong className="text-green-700">{resultadoImport.ok} animales</strong> correctamente
                  {resultadoImport.errores > 0 && (
                    <span className="text-red-500"> — {resultadoImport.errores} con error</span>
                  )}
                </p>
              </div>
              <Button onClick={() => setModalImportar(false)}>
                Listo
              </Button>
            </div>
          )}

        </div>
      </Modal>

      {/* ═════════════════════════════
           EDITOR DE IMAGEN
         ═════════════════════════════ */}
      <ImageEditor
        abierto={editorFotoAbierto}
        onCerrar={() => setEditorFotoAbierto(false)}
        onSave={guardarFotoEditada}
        imagenInicialUrl={foto ?? undefined}
      />
    </div>
  )
}
