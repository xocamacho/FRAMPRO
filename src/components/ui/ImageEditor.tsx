import { useState, useRef, useEffect } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'
import { RotateCw, ZoomIn, ZoomOut } from 'lucide-react'

interface ImageEditorProps {
  abierto: boolean
  onCerrar: () => void
  onSave: (blob: Blob) => void
  imagenInicialUrl?: string
}

export function ImageEditor({ abierto, onCerrar, onSave, imagenInicialUrl }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(100)
  const [rotacion, setRotacion] = useState(0)
  const [imagenCargada, setImagenCargada] = useState(imagenInicialUrl ?? '')
  const [guardando, setGuardando] = useState(false)

  // Cargar imagen desde file input
  async function manejarCarga(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      setImagenCargada(evt.target?.result as string)
      setZoom(100)
      setRotacion(0)
    }
    reader.readAsDataURL(file)
  }

  // Dibujar imagen en canvas con transformaciones
  function dibujarImagen() {
    const canvas = canvasRef.current
    if (!canvas || !imagenCargada) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Calcular tamaño para mantener aspecto
      const maxWidth = canvas.width * 0.8
      const maxHeight = canvas.height * 0.8
      let width = img.width
      let height = img.height

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height)
          height = maxHeight
        }
      }

      // Aplicar transformaciones
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotacion * Math.PI) / 180)
      ctx.scale(zoom / 100, zoom / 100)
      ctx.drawImage(img, -width / 2, -height / 2, width, height)
      ctx.restore()
    }
    img.src = imagenCargada
  }

  // Ejecutar dibujo cuando cambien transformaciones
  useEffect(() => {
    if (abierto) {
      const timer = setTimeout(() => dibujarImagen(), 100)
      return () => clearTimeout(timer)
    }
  }, [abierto, imagenCargada, zoom, rotacion])

  // Guardar imagen editada
  async function guardarImagen() {
    setGuardando(true)
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob)
        onCerrar()
      }
      setGuardando(false)
    }, 'image/jpeg', 0.95)
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Editar Foto del Animal" tamano="lg">
      <div className="flex flex-col gap-4">
        {!imagenCargada ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Seleccionar foto
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={manejarCarga}
              />
            </label>
          </div>
        ) : (
          <>
            {/* Canvas para preview */}
            <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center" style={{ height: '300px' }}>
              <canvas
                ref={canvasRef}
                width={500}
                height={400}
                className="max-w-full max-h-full"
              />
            </div>

            {/* Controles */}
            <div className="space-y-4">
              {/* Zoom */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Zoom</label>
                  <span className="text-sm text-gray-500">{zoom}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <ZoomOut size={18} className="text-gray-600" />
                  </button>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1"
                  />
                  <button
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <ZoomIn size={18} className="text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Rotación */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Rotación</label>
                  <span className="text-sm text-gray-500">{rotacion}°</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRotacion((rotacion - 90) % 360)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCw size={16} />
                    Girar 90°
                  </button>
                  <button
                    onClick={() => setRotacion(0)}
                    className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium transition-colors"
                  >
                    Reestablecer
                  </button>
                </div>
              </div>

              {/* Cambiar imagen */}
              <label className="cursor-pointer inline-block text-sm text-blue-600 hover:text-blue-700">
                Cambiar foto
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={manejarCarga}
                />
              </label>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variante="secundario" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button onClick={guardarImagen} cargando={guardando}>
                Guardar y Continuar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
