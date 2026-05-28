import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Finca } from '@/types'
import { Pencil, MapPin, FileText, Zap, AlertTriangle, Save, X, Upload, Sparkles, CheckCircle2 } from 'lucide-react'
import { consultarIA } from '@/services/groqAPI'

export function Finca() {
  const { usuario, finca, setFinca } = useAuthStore()
  const [editando, setEditando] = useState(false)
  const [creando, setCreando] = useState(!finca)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Formulario
  const [nombre, setNombre] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [hectareas, setHectareas] = useState('')
  const [numeroICA, setNumeroICA] = useState('')
  const [clima, setClima] = useState('')
  const [coordLat, setCoordLat] = useState('')
  const [coordLng, setCoordLng] = useState('')

  // Modal de confirmación
  const [modalConfirm, setModalConfirm] = useState(false)

  // IA extracción desde documento
  const [analizandoDoc, setAnalizandoDoc] = useState(false)
  const [docTexto, setDocTexto] = useState('')
  const [docResultado, setDocResultado] = useState<string | null>(null)

  useEffect(() => {
    // Solo cargar datos cuando se ABRE el modal de edición
    if ((editando || creando) && finca) {
      console.log('📂 Cargando datos de finca en estados locales:', finca)
      setNombre(finca.nombre)
      setUbicacion(finca.ubicacion ?? '')
      setHectareas(finca.hectareas?.toString() ?? '')
      setNumeroICA(finca.numero_ica ?? '')
      setClima(finca.clima ?? '')
      setCoordLat(finca.coordenadas_lat?.toString() ?? '')
      setCoordLng(finca.coordenadas_lng?.toString() ?? '')
    }
  }, [editando, creando, finca?.id])

  // ═══ LEER ARCHIVO DE TEXTO ═══
  function leerArchivo(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const texto = (e.target?.result as string) ?? ''
      setDocTexto(prev => prev ? prev + '\n' + texto : texto)
    }
    // PDFs y DOCX no dan texto limpio, pero igual intentamos
    reader.readAsText(file, 'utf-8')
  }

  // ═══ ANALIZAR DOCUMENTO CON IA ═══
  async function analizarDocumento() {
    const texto = docTexto.trim()
    if (!texto) return
    setAnalizandoDoc(true)
    setDocResultado(null)

    try {
      const prompt = `Eres un asistente para gestión de fincas ganaderas en Colombia.
Se te proporciona el siguiente texto de un documento con especificaciones de una finca.
Extrae SOLO la información disponible en el texto y devuelve un JSON con exactamente estas claves:
{
  "nombre": "nombre de la finca o null",
  "ubicacion": "municipio/departamento o null",
  "hectareas": número o null,
  "coordenadas_lat": número decimal (latitud) o null,
  "coordenadas_lng": número decimal (longitud) o null,
  "numero_ica": "código ICA o null",
  "clima": "tropical_bajo|tropical_medio|subtropical|templado o null"
}
Si el documento menciona coordenadas en formato grados-minutos-segundos, conviértelas a decimal.
Si hay magnitud y longitud como "N 4°34'12'' W 74°20'55''", conviértelas.
No inventes datos. Si no encuentras un campo, usa null.
Solo devuelve el JSON, sin explicación.

Texto del documento:
---
${texto.slice(0, 4000)}
---`

      const respuesta = await consultarIA(prompt)

      // Extraer JSON
      const ini = respuesta.indexOf('{')
      const fin = respuesta.lastIndexOf('}')
      if (ini === -1 || fin === -1) throw new Error('No JSON en respuesta')
      const datos = JSON.parse(respuesta.slice(ini, fin + 1))

      // Auto-rellenar campos
      const resumen: string[] = []
      if (datos.nombre && !nombre) { setNombre(datos.nombre); resumen.push(`Nombre: ${datos.nombre}`) }
      if (datos.ubicacion && !ubicacion) { setUbicacion(datos.ubicacion); resumen.push(`Ubicación: ${datos.ubicacion}`) }
      if (datos.hectareas != null && !hectareas) { setHectareas(String(datos.hectareas)); resumen.push(`Hectáreas: ${datos.hectareas}`) }
      if (datos.coordenadas_lat != null && !coordLat) { setCoordLat(String(datos.coordenadas_lat)); resumen.push(`Lat: ${datos.coordenadas_lat}`) }
      if (datos.coordenadas_lng != null && !coordLng) { setCoordLng(String(datos.coordenadas_lng)); resumen.push(`Lng: ${datos.coordenadas_lng}`) }
      if (datos.numero_ica && !numeroICA) { setNumeroICA(datos.numero_ica); resumen.push(`ICA: ${datos.numero_ica}`) }
      if (datos.clima && !clima) { setClima(datos.clima); resumen.push(`Clima: ${datos.clima}`) }

      setDocResultado(resumen.length > 0
        ? `✅ Campos detectados: ${resumen.join(' | ')}`
        : '⚠️ No se encontraron datos reconocibles en el documento')
    } catch (e) {
      console.error(e)
      setDocResultado('❌ No se pudo extraer información. Asegúrate de que el texto sea legible.')
    }

    setAnalizandoDoc(false)
  }

  async function guardarCambios() {
    if (!nombre.trim()) {
      setError('El nombre de la finca es obligatorio')
      return
    }

    setGuardando(true)
    setError('')

    try {
      if (creando) {
        // ═══ CREAR FINCA ═══
        if (!usuario?.id) {
          setError('No hay usuario logueado')
          setGuardando(false)
          return
        }

        const { data, error: err } = await supabase
          .from('fincas')
          .insert({
            nombre: nombre.trim(),
            ubicacion: ubicacion.trim() || null,
            hectareas: hectareas ? Number(hectareas) : null,
            numero_ica: numeroICA.trim() || null,
            clima: clima || null,
            coordenadas_lat: coordLat ? Number(coordLat) : null,
            coordenadas_lng: coordLng ? Number(coordLng) : null,
            propietario_id: usuario.id,
          })
          .select()
          .single()

        console.log('🔍 Respuesta INSERT finca:', { data, err })

        if (err) {
          console.error('❌ Error creando finca:', err)
          setError(err.message)
        } else {
          console.log('✅ Finca creada:', data)
          setFinca(data)

          // 🔗 IMPORTANTE: Actualizar el usuario para vincular esta finca
          if (usuario?.id && data.id) {
            console.log('🔗 Vinculando finca al usuario...')
            const { error: errUsuario } = await supabase
              .from('usuarios')
              .update({ finca_id: data.id })
              .eq('id', usuario.id)

            if (errUsuario) {
              console.error('❌ Error vinculando finca:', errUsuario)
            } else {
              console.log('✅ Finca vinculada al usuario')
            }
          }

          // Resetear estados locales con los datos creados
          setNombre(data.nombre)
          setUbicacion(data.ubicacion ?? '')
          setHectareas(data.hectareas?.toString() ?? '')
          setNumeroICA(data.numero_ica ?? '')
          setClima(data.clima ?? '')
          setCoordLat(data.coordenadas_lat?.toString() ?? '')
          setCoordLng(data.coordenadas_lng?.toString() ?? '')
          setCreando(false)
          setEditando(false)
          setModalConfirm(false)
        }
      } else {
        // ═══ ACTUALIZAR FINCA ═══
        if (!finca?.id) {
          setError('No hay finca asociada')
          setGuardando(false)
          return
        }

        console.log('🔄 Actualizando finca con ID:', finca.id)
        console.log('👤 Usuario ID:', usuario?.id)
        console.log('📋 Payload:', {
          nombre: nombre.trim(),
          ubicacion: ubicacion.trim() || null,
          hectareas: hectareas ? Number(hectareas) : null,
          numero_ica: numeroICA.trim() || null,
          clima: clima || null,
          coordenadas_lat: coordLat ? Number(coordLat) : null,
          coordenadas_lng: coordLng ? Number(coordLng) : null,
        })

        console.log('🚀 Enviando UPDATE a Supabase...')
        const { data, error: err, status } = await supabase
          .from('fincas')
          .update({
            nombre: nombre.trim(),
            ubicacion: ubicacion.trim() || null,
            hectareas: hectareas ? Number(hectareas) : null,
            numero_ica: numeroICA.trim() || null,
            clima: clima || null,
            coordenadas_lat: coordLat ? Number(coordLat) : null,
            coordenadas_lng: coordLng ? Number(coordLng) : null,
          })
          .eq('id', finca.id)
          .select()
          .single()

        console.log('🔍 Respuesta UPDATE finca:')
        console.log('  - Data:', data)
        console.log('  - Error:', err)
        console.log('  - Status:', status)
        console.log('  - Data vacía?:', !data)
        console.log('  - Hay error?:', !!err)

        if (err) {
          console.error('❌ ERROR COMPLETO:', err)
          console.error('Status:', err.statusCode)
          console.error('Mensaje:', err.message)
          console.error('Detalles:', JSON.stringify(err, null, 2))
          setError(`⚠️ Error al actualizar: ${err.message}. Verifica que tengas permisos.`)
        } else if (!data) {
          console.error('❌ Error: Supabase retornó data vacía')
          setError('Error: La finca no se pudo actualizar correctamente. Intenta de nuevo.')
        } else {
          console.log('✅ Finca actualizada correctamente:', data)
          console.log('📌 Datos retornados:', {
            id: data.id,
            nombre: data.nombre,
            numero_ica: data.numero_ica,
            ubicacion: data.ubicacion,
          })
          console.log('💾 Actualizando store con:', data)
          // IMPORTANTE: actualizar el store ANTES de resetear estados
          setFinca(data)
          // Resetear estados locales con los datos actualizados
          setNombre(data.nombre)
          setUbicacion(data.ubicacion ?? '')
          setHectareas(data.hectareas?.toString() ?? '')
          setNumeroICA(data.numero_ica ?? '')
          setClima(data.clima ?? '')
          setCoordLat(data.coordenadas_lat?.toString() ?? '')
          setCoordLng(data.coordenadas_lng?.toString() ?? '')
          setError('')
          // Delay antes de cerrar para asegurar que el state se actualice
          setTimeout(() => {
            console.log('🔐 Cerrando modal de edición')
            setEditando(false)
            setModalConfirm(false)
          }, 50)
        }
      }
    } catch (err) {
      console.error('❌ Error:', err)
      setError('Error al guardar los cambios')
    }

    setGuardando(false)
  }


  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Información de la Finca</h2>
          <p className="text-sm text-gray-500">{creando ? 'Crea tu finca para comenzar' : 'Gestiona los datos principales de tu operación ganadera'}</p>
        </div>
        {!editando && !creando && finca && (
          <Button onClick={() => setEditando(true)}>
            <Pencil size={16} />
            Editar Información
          </Button>
        )}
      </div>

      {editando || creando ? (
        // ═══ MODO EDICIÓN ═══
        <Card>
          <div className="flex flex-col gap-5">
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

            {/* Nombre y Ubicación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nombre de la Finca" placeholder="Ej: La Esperanza" value={nombre} onChange={(e) => setNombre(e.target.value)} />

              <Input
                label="Ubicación / Municipio"
                placeholder="Ej: Valledupar, Cesar"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                icono={<MapPin size={14} />}
              />
            </div>

            {/* Hectáreas e ICA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Hectáreas"
                type="number"
                placeholder="Ej: 50"
                value={hectareas}
                onChange={(e) => setHectareas(e.target.value)}
              />

              <Input
                label="Número ICA"
                placeholder="Ej: 08-00-123456"
                value={numeroICA}
                onChange={(e) => setNumeroICA(e.target.value)}
                icono={<FileText size={14} />}
              />
            </div>

            {/* Clima */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Tipo de Clima</label>
              <select
                value={clima}
                onChange={(e) => setClima(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Seleccionar clima...</option>
                <option value="tropical_bajo">Tropical Bajo (0-1000m)</option>
                <option value="tropical_medio">Tropical Medio (1000-2000m)</option>
                <option value="subtropical">Subtropical (2000-2800m)</option>
                <option value="templado">Templado (&gt;2800m)</option>
              </select>
            </div>

            {/* IA — Subir documento con especificaciones */}
            <div className="border border-dashed border-purple-300 bg-purple-50/50 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-600" />
                <h4 className="text-sm font-semibold text-purple-800">Extraer datos con IA</h4>
                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">Opcional</span>
              </div>
              <p className="text-xs text-purple-700">
                Sube un documento (.txt) o pega el texto con las especificaciones de tu finca (escritura, medidas, coordenadas, ICA, etc.) y la IA llenará los campos automáticamente.
              </p>

              <div className="flex gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-purple-300 text-purple-700 text-xs font-medium rounded-lg cursor-pointer hover:bg-purple-50 transition-colors">
                  <Upload size={13} />
                  Subir .txt
                  <input
                    type="file"
                    accept=".txt,.csv"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) leerArchivo(f) }}
                  />
                </label>
                <span className="text-xs text-purple-400 self-center">o pega el texto abajo</span>
              </div>

              <textarea
                value={docTexto}
                onChange={e => setDocTexto(e.target.value)}
                placeholder="Pega aquí el texto del documento con las especificaciones de la finca..."
                className="w-full text-xs border border-purple-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                rows={4}
              />

              {docResultado && (
                <div className={`text-xs px-3 py-2 rounded-lg ${docResultado.startsWith('✅') ? 'bg-green-50 text-green-700' : docResultado.startsWith('⚠️') ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                  {docResultado}
                </div>
              )}

              <Button
                variante="secundario"
                tamano="sm"
                onClick={analizarDocumento}
                cargando={analizandoDoc}
                disabled={!docTexto.trim()}
              >
                <Sparkles size={14} />
                {analizandoDoc ? 'Analizando...' : 'Analizar con IA'}
              </Button>
            </div>

            {/* Coordenadas */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Coordenadas GPS (Opcional)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Latitud"
                  type="number"
                  step="0.000001"
                  placeholder="Ej: 10.16"
                  value={coordLat}
                  onChange={(e) => setCoordLat(e.target.value)}
                />

                <Input
                  label="Longitud"
                  type="number"
                  step="0.000001"
                  placeholder="Ej: -75.52"
                  value={coordLng}
                  onChange={(e) => setCoordLng(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                💡 Usa Google Maps: haz clic derecho en tu finca y copia las coordenadas
              </p>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              {!creando && (
                <Button variante="secundario" onClick={() => setEditando(false)}>
                  <X size={16} />
                  Cancelar
                </Button>
              )}
              <Button onClick={() => setModalConfirm(true)} cargando={guardando}>
                <Save size={16} />
                {creando ? 'Crear Finca' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        // ═══ MODO VISUALIZACIÓN ═══
        <>
          {/* Grid de información principal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Nombre */}
            <Card className="lg:col-span-2">
              <div>
                <p className="text-xs text-gray-500 font-medium">Nombre de la Finca</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{finca.nombre}</p>
              </div>
            </Card>

            {/* Estado */}
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Estado</p>
                  <Badge variante="verde" className="mt-2">
                    Activa
                  </Badge>
                </div>
                <Zap size={32} className="text-yellow-400 opacity-50" />
              </div>
            </Card>
          </div>

          {/* Grid de detalles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Ubicación */}
            <Card>
              <div className="flex gap-3">
                <MapPin size={20} className="text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Ubicación</p>
                  <p className="font-semibold text-gray-900 mt-1">{finca.ubicacion ?? '—'}</p>
                </div>
              </div>
            </Card>

            {/* Hectáreas */}
            <Card>
              <div>
                <p className="text-xs text-gray-500">Hectáreas</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{finca.hectareas ?? '—'} ha</p>
              </div>
            </Card>

            {/* Número ICA */}
            <Card>
              <div className="flex gap-3">
                <FileText size={20} className="text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Número ICA</p>
                  <p className="font-semibold text-gray-900 mt-1">{finca.numero_ica ?? '—'}</p>
                </div>
              </div>
            </Card>

            {/* Clima */}
            <Card>
              <div>
                <p className="text-xs text-gray-500">Clima</p>
                <p className="font-semibold text-gray-900 mt-2">
                  {finca.clima
                    ? finca.clima === 'tropical_bajo'
                      ? 'Tropical Bajo'
                      : finca.clima === 'tropical_medio'
                        ? 'Tropical Medio'
                        : finca.clima === 'subtropical'
                          ? 'Subtropical'
                          : 'Templado'
                    : '—'}
                </p>
              </div>
            </Card>
          </div>

          {/* Coordenadas */}
          {(finca.coordenadas_lat || finca.coordenadas_lng) && (
            <Card>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Ubicación GPS</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Latitud</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 mt-1">{finca.coordenadas_lat?.toFixed(6) ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Longitud</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 mt-1">{finca.coordenadas_lng?.toFixed(6) ?? '—'}</p>
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/?q=${finca.coordenadas_lat},${finca.coordenadas_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 mt-3 inline-block"
                >
                  📍 Ver en Google Maps
                </a>
              </div>
            </Card>
          )}

          {/* Información de creación */}
          <Card className="bg-gray-50">
            <div className="text-xs text-gray-500">
              <p>
                Finca creada: <span className="font-semibold">{new Date(finca.fecha_creacion).toLocaleDateString('es-CO')}</span>
              </p>
              {finca.fecha_actualizacion && (
                <p className="mt-1">
                  Última actualización: <span className="font-semibold">{new Date(finca.fecha_actualizacion).toLocaleDateString('es-CO')}</span>
                </p>
              )}
            </div>
          </Card>
        </>
      )}

      {/* ═════════════════════════════
           MODAL: CONFIRMAR CAMBIOS
         ═════════════════════════════ */}
      <Modal abierto={modalConfirm} onCerrar={() => setModalConfirm(false)} titulo="Confirmar cambios" tamano="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            ¿Estás seguro de guardar los cambios en la información de la finca? Los datos se actualizarán inmediatamente.
          </p>
          <div className="flex justify-end gap-3">
            <Button variante="secundario" onClick={() => setModalConfirm(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarCambios} cargando={guardando}>
              Sí, guardar cambios
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
