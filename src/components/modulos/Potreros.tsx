import { useState, useEffect, useRef, memo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Potrero } from '@/types'
import { Plus, MapPin, Trash2, Pencil, X, CheckCircle, Layers, Search } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface PuntoInteres {
  id: string
  lat: number
  lng: number
  emoji: string
  nombre: string
}

const EMOJIS_PUNTOS = [
  { e: '🏠', l: 'Casa' },
  { e: '🚰', l: 'Agua/Bebedero' },
  { e: '⚡', l: 'Electricidad' },
  { e: '🔧', l: 'Maquinaria' },
  { e: '🌿', l: 'Cultivo' },
  { e: '⚠️', l: 'Riesgo' },
  { e: '🅿️', l: 'Parqueadero' },
  { e: '🐄', l: 'Corral' },
  { e: '💊', l: 'Botiquín' },
  { e: '📍', l: 'Punto' },
]

const COLORES_ESTADO: Record<string, string> = {
  en_uso: '#16a34a', descanso: '#3b82f6', preparacion: '#f59e0b', inactivo: '#9ca3af',
}
const COLORES_PICK = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
const ESTADOS = ['en_uso', 'descanso', 'preparacion', 'inactivo']

// ══════════════════════════════════════════════════════════════
//  MAPA — componente aislado con memo para que NUNCA se destruya
// ══════════════════════════════════════════════════════════════
const MapaPotreros = memo(function MapaPotreros({
  potreros,
  seleccionado,
  onSeleccionar,
  onPoligonoListo,
  onClickMarcador,
  onEliminarPunto,
  puntosInteres,
  centrarEn,
  centro,
}: {
  potreros: Potrero[]
  seleccionado: string | null
  onSeleccionar: (id: string | null) => void
  onPoligonoListo: (pts: [number, number][]) => void
  onClickMarcador: (lat: number, lng: number) => void
  onEliminarPunto: (id: string) => void
  puntosInteres: PuntoInteres[]
  centrarEn: { lat: number; lng: number } | null
  centro: [number, number]
}) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const polLayerRef = useRef<L.FeatureGroup>(L.featureGroup())
  const satRef = useRef<L.TileLayer | null>(null)
  const osmRef = useRef<L.TileLayer | null>(null)

  // refs del dibujo — sin estado React para no causar re-renders
  const dibujandoRef = useRef(false)
  const puntosRef = useRef<[number, number][]>([])
  const lineaRef = useRef<L.Polyline | null>(null)
  const markersRef = useRef<L.CircleMarker[]>([])

  // refs de UI flotante del dibujo (manipulamos DOM directo)
  const btnListoRef = useRef<HTMLButtonElement>(null)
  const btnDeshacerRef = useRef<HTMLButtonElement>(null)
  const instruccionRef = useRef<HTMLParagraphElement>(null)
  const panelDibujoRef = useRef<HTMLDivElement>(null)
  const btnDibujarRef = useRef<HTMLButtonElement>(null)
  const btnCancelarRef = useRef<HTMLButtonElement>(null)
  const [satelite, setSatelite] = useState(false) // OSM por defecto, más confiable

  // Modo marcador
  const modoMarcadorRef = useRef(false)
  const btnMarcadorRef = useRef<HTMLButtonElement>(null)
  const btnCancelarMarcadorRef = useRef<HTMLButtonElement>(null)
  const puntosLayerRef = useRef<L.LayerGroup>(L.layerGroup())

  // ── Buscador de ubicación ──────────────────────────────────
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<{ nombre: string; lat: number; lng: number }[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscadorAbierto, setBuscadorAbierto] = useState(false)
  const buscadorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const marcadorBusquedaRef = useRef<L.Marker | null>(null)

  function buscar(texto: string) {
    setBusqueda(texto)
    if (buscadorTimeoutRef.current) clearTimeout(buscadorTimeoutRef.current)
    if (!texto.trim()) { setResultados([]); return }

    // Detectar coordenadas directas: "4.57, -74.29" o "4.57 -74.29"
    const coordMatch = texto.trim().match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/)
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1])
      const lng = parseFloat(coordMatch[2])
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setResultados([{ nombre: `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng }])
        return
      }
    }

    // Búsqueda por nombre con Nominatim (debounce 500ms)
    buscadorTimeoutRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=co&q=${encodeURIComponent(texto)}`
        const res = await fetch(url)
        const data = await res.json()
        setResultados(
          data.map((r: any) => ({ nombre: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }))
        )
      } catch {
        setResultados([])
      }
      setBuscando(false)
    }, 500)
  }

  function irAUbicacion(lat: number, lng: number, nombre: string) {
    const map = mapRef.current; if (!map) return
    map.setView([lat, lng], 16)
    // Marcador temporal
    marcadorBusquedaRef.current?.remove()
    marcadorBusquedaRef.current = L.marker([lat, lng])
      .addTo(map)
      .bindPopup(`<b>${nombre.split(',')[0]}</b><br/>${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      .openPopup()
    setResultados([])
    setBusqueda('')
    setBuscadorAbierto(false)
  }

  // Inicializar mapa UNA sola vez
  useEffect(() => {
    if (mapRef.current || !divRef.current) return

    const map = L.map(divRef.current, {
      center: centro, zoom: 13, // zoom 13 = más vista, tiles disponibles en más áreas
      zoomControl: true, doubleClickZoom: false,
    })

    // OSM como capa por defecto (siempre disponible), satelital como opcional
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    const sat = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Esri', maxZoom: 18 }
    )

    satRef.current = sat
    osmRef.current = osm
    polLayerRef.current.addTo(map)
    puntosLayerRef.current.addTo(map)
    mapRef.current = map

    // Leaflet necesita recalcular tamaño cuando el contenedor se renderiza
    setTimeout(() => map.invalidateSize(), 200)

    // Re-calcular tamaño al girar o redimensionar (ej. pantalla oculta → visible)
    function onResize() {
      if (divRef.current && divRef.current.offsetWidth > 0) {
        map.invalidateSize()
      }
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Actualizar polígonos cuando cambian potreros o selección
  useEffect(() => {
    polLayerRef.current.clearLayers()
    potreros.forEach((p, idx) => {
      if (!p.coordenadas_poligono) return
      let coords: [number, number][] = []
      try {
        const raw = p.coordenadas_poligono as any
        coords = Array.isArray(raw) ? raw : (raw.puntos ?? raw.coordinates ?? [])
        if (coords.length < 3) return
      } catch { return }

      const color = p.color_hex ?? COLORES_ESTADO[p.estado] ?? '#16a34a'
      const sel = seleccionado === p.id

      const pol = L.polygon(coords, {
        color: sel ? '#fff' : color, fillColor: color,
        fillOpacity: sel ? 0.55 : 0.35, weight: sel ? 3 : 2,
      })
      pol.on('click', () => onSeleccionar(p.id === seleccionado ? null : p.id))

      const c = pol.getBounds().getCenter()
      const icon = L.divIcon({
        html: `<div style="width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,0.65);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid ${color}">${idx + 1}</div>`,
        className: '', iconSize: [26, 26], iconAnchor: [13, 13],
      })
      polLayerRef.current.addLayer(pol)
      polLayerRef.current.addLayer(L.marker(c, { icon, interactive: false }))
    })
  }, [potreros, seleccionado])

  // Centrar mapa cuando se guarda un punto nuevo
  useEffect(() => {
    if (!centrarEn || !mapRef.current) return
    mapRef.current.setView([centrarEn.lat, centrarEn.lng], Math.max(mapRef.current.getZoom(), 15))
  }, [centrarEn])

  // Dibujar puntos de interés con emojis + botón eliminar en popup
  useEffect(() => {
    if (!mapRef.current) return
    puntosLayerRef.current.clearLayers()
    ;(puntosInteres ?? []).forEach(p => {
      const icon = L.divIcon({
        html: `<div title="${p.nombre}" style="font-size:24px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));cursor:pointer">${p.emoji}</div>`,
        className: '', iconSize: [30, 30], iconAnchor: [15, 15],
      })
      const marker = L.marker([p.lat, p.lng], { icon })

      // Popup con botón eliminar (DOM element para poder añadir listener)
      const popupEl = document.createElement('div')
      popupEl.style.cssText = 'text-align:center;min-width:140px;font-family:sans-serif'
      popupEl.innerHTML = `
        <div style="font-size:28px;margin-bottom:2px">${p.emoji}</div>
        <strong style="font-size:13px">${p.nombre}</strong><br/>
        <small style="color:#9ca3af">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</small><br/>
        <button data-del style="margin-top:8px;padding:4px 12px;background:#ef4444;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">
          🗑 Eliminar punto
        </button>
      `
      popupEl.querySelector('[data-del]')?.addEventListener('click', () => {
        onEliminarPunto(p.id)
        marker.closePopup()
      })
      marker.bindPopup(popupEl)
      puntosLayerRef.current.addLayer(marker)
    })
  }, [puntosInteres])

  // Centrar en potrero seleccionado
  useEffect(() => {
    if (!seleccionado || !mapRef.current) return
    const idx = potreros.findIndex(p => p.id === seleccionado)
    if (idx < 0) return
    const layers = polLayerRef.current.getLayers()
    const pol = layers[idx * 2] as L.Polygon | undefined
    if (pol && (pol as any).getBounds) {
      mapRef.current.fitBounds((pol as L.Polygon).getBounds(), { padding: [30, 30] })
    }
  }, [seleccionado])

  // ── Actualizar UI de dibujo manipulando DOM directo ──────────
  function actualizarUIDibujo() {
    const n = puntosRef.current.length
    if (instruccionRef.current) {
      if (n === 0) instruccionRef.current.textContent = 'Toca el mapa en cada esquina del potrero'
      else if (n === 1) instruccionRef.current.textContent = 'Marca el segundo punto'
      else if (n === 2) instruccionRef.current.textContent = 'Un punto más para poder guardar'
      else instruccionRef.current.textContent = `${n} puntos marcados — ya puedes guardar`
    }
    if (btnListoRef.current) btnListoRef.current.style.display = n >= 3 ? 'flex' : 'none'
    if (btnDeshacerRef.current) btnDeshacerRef.current.style.display = n > 0 ? 'flex' : 'none'
  }

  // ── Eventos del dibujo ───────────────────────────────────────
  function iniciarDibujo() {
    const map = mapRef.current; if (!map) return
    // Cancelar modo marcador si estaba activo
    if (modoMarcadorRef.current) cancelarModoMarcador()
    dibujandoRef.current = true
    puntosRef.current = []
    map.getContainer().style.cursor = 'crosshair'
    if (panelDibujoRef.current) panelDibujoRef.current.style.display = 'flex'
    if (btnDibujarRef.current) btnDibujarRef.current.style.display = 'none'
    if (btnCancelarRef.current) btnCancelarRef.current.style.display = 'flex'
    actualizarUIDibujo()
    map.on('click', onClickMapa)
  }

  function cancelarDibujo() {
    const map = mapRef.current; if (!map) return
    dibujandoRef.current = false
    limpiarDibujo()
    map.getContainer().style.cursor = ''
    if (panelDibujoRef.current) panelDibujoRef.current.style.display = 'none'
    if (btnDibujarRef.current) btnDibujarRef.current.style.display = 'flex'
    if (btnCancelarRef.current) btnCancelarRef.current.style.display = 'none'
    map.off('click', onClickMapa)
  }

  // ── Modo marcador ────────────────────────────────────────────
  function iniciarModoMarcador() {
    const map = mapRef.current; if (!map) return
    // Cancelar dibujo si está activo
    if (dibujandoRef.current) cancelarDibujo()
    modoMarcadorRef.current = true
    map.getContainer().style.cursor = 'cell'
    if (btnMarcadorRef.current) btnMarcadorRef.current.style.display = 'none'
    if (btnCancelarMarcadorRef.current) btnCancelarMarcadorRef.current.style.display = 'flex'
    if (btnDibujarRef.current) btnDibujarRef.current.style.display = 'none'
    map.on('click', onClickMapa)
  }

  function cancelarModoMarcador() {
    const map = mapRef.current; if (!map) return
    modoMarcadorRef.current = false
    map.getContainer().style.cursor = ''
    if (btnMarcadorRef.current) btnMarcadorRef.current.style.display = 'flex'
    if (btnCancelarMarcadorRef.current) btnCancelarMarcadorRef.current.style.display = 'none'
    if (btnDibujarRef.current) btnDibujarRef.current.style.display = 'flex'
    map.off('click', onClickMapa)
  }

  function onClickMapa(e: L.LeafletMouseEvent) {
    const map = mapRef.current; if (!map) return

    // Modo marcador
    if (modoMarcadorRef.current) {
      onClickMarcador(e.latlng.lat, e.latlng.lng)
      cancelarModoMarcador()
      return
    }

    if (!dibujandoRef.current) return
    const p: [number, number] = [e.latlng.lat, e.latlng.lng]
    puntosRef.current.push(p)

    const m = L.circleMarker(e.latlng, { radius: 6, color: '#fff', fillColor: '#16a34a', fillOpacity: 1, weight: 2 }).addTo(map)
    markersRef.current.push(m)

    lineaRef.current?.remove()
    if (puntosRef.current.length > 1) {
      lineaRef.current = L.polyline(puntosRef.current, { color: '#16a34a', weight: 2, dashArray: '6,4' }).addTo(map)
    }
    actualizarUIDibujo()
  }

  function deshacerPunto() {
    const map = mapRef.current; if (!map) return
    puntosRef.current.pop()
    const m = markersRef.current.pop(); m?.remove()
    lineaRef.current?.remove(); lineaRef.current = null
    if (puntosRef.current.length > 1) {
      lineaRef.current = L.polyline(puntosRef.current, { color: '#16a34a', weight: 2, dashArray: '6,4' }).addTo(map)
    }
    actualizarUIDibujo()
  }

  function terminarDibujo() {
    const pts = [...puntosRef.current]
    cancelarDibujo()
    if (pts.length >= 3) onPoligonoListo(pts)
  }

  function limpiarDibujo() {
    const map = mapRef.current; if (!map) return
    puntosRef.current = []
    lineaRef.current?.remove(); lineaRef.current = null
    markersRef.current.forEach(m => m.remove()); markersRef.current = []
  }

  function toggleCapa() {
    const map = mapRef.current; if (!map) return
    // satelite=false → en OSM → pasar a satélite
    // satelite=true  → en sat → pasar a OSM
    if (!satelite) { osmRef.current?.remove(); satRef.current?.addTo(map) }
    else           { satRef.current?.remove(); osmRef.current?.addTo(map) }
    setSatelite(s => !s)
  }

  return (
    <div className="relative w-full h-full">
      {/* Mapa */}
      <div ref={divRef} className="w-full h-full" />

      {/* ── Todos los controles flotantes en la esquina superior derecha ── */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 items-end">

        {/* Fila superior: acciones principales */}
        <div className="flex gap-1.5 flex-wrap justify-end">
          {/* Buscador */}
          {!buscadorAbierto ? (
            <button onClick={() => setBuscadorAbierto(true)}
              className="bg-white shadow-md rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 border border-gray-200">
              <Search size={13} className="text-green-600" />
              <span className="hidden sm:inline">Buscar</span>
            </button>
          ) : (
            <div className="bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden w-72">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  autoFocus
                  value={busqueda}
                  onChange={e => buscar(e.target.value)}
                  placeholder="Lugar o lat, lng..."
                  className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
                  onKeyDown={e => { if (e.key === 'Escape') { setBuscadorAbierto(false); setBusqueda(''); setResultados([]) } }}
                />
                <button onClick={() => { setBuscadorAbierto(false); setBusqueda(''); setResultados([]) }}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X size={14} />
                </button>
              </div>
              {buscando && (
                <div className="px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Buscando...
                </div>
              )}
              {resultados.length > 0 && (
                <ul className="max-h-48 overflow-y-auto">
                  {resultados.map((r, i) => (
                    <li key={i}>
                      <button onClick={() => irAUbicacion(r.lat, r.lng, r.nombre)}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-green-50 hover:text-green-800 transition-colors border-b border-gray-50 last:border-b-0 flex items-start gap-2">
                        <MapPin size={12} className="text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{r.nombre}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!buscando && busqueda.trim() && resultados.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-400">Sin resultados</div>
              )}
            </div>
          )}

          <button ref={btnDibujarRef} onClick={iniciarDibujo}
            className="bg-white shadow-md rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 border border-gray-200">
            <MapPin size={13} className="text-green-600" />
            <span className="hidden sm:inline">Potrero</span>
          </button>
          <button ref={btnCancelarRef} onClick={cancelarDibujo} style={{ display: 'none' }}
            className="bg-red-600 shadow-md rounded-lg px-2.5 py-2 text-xs font-semibold text-white hover:bg-red-700 flex items-center gap-1.5">
            <X size={13} /> <span className="hidden sm:inline">Cancelar</span>
          </button>
          <button ref={btnMarcadorRef} onClick={iniciarModoMarcador}
            className="bg-white shadow-md rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 border border-gray-200">
            📍<span className="hidden sm:inline ml-1">Punto</span>
          </button>
          <button ref={btnCancelarMarcadorRef} onClick={cancelarModoMarcador} style={{ display: 'none' }}
            className="bg-amber-500 shadow-md rounded-lg px-2.5 py-2 text-xs font-semibold text-white hover:bg-amber-600 flex items-center gap-1.5">
            <X size={13} /> <span className="hidden sm:inline">Cancelar</span>
          </button>
          <button onClick={toggleCapa}
            className="bg-white shadow-md rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 border border-gray-200">
            <Layers size={13} />
            <span className="hidden sm:inline">{satelite ? 'Mapa' : 'Satélite'}</span>
          </button>
        </div>
      </div>

      {/* Panel instrucciones dibujo */}
      <div ref={panelDibujoRef} style={{ display: 'none' }}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2">
        <div className="bg-gray-900/90 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">
          📍 <p ref={instruccionRef} className="inline">Toca el mapa en cada esquina del potrero</p>
        </div>
        <div className="flex gap-2">
          <button ref={btnDeshacerRef} onClick={deshacerPunto} style={{ display: 'none' }}
            className="bg-white text-gray-700 border border-gray-300 text-sm font-semibold px-4 py-2 rounded-xl shadow-md hover:bg-gray-50 transition-colors flex items-center gap-1.5">
            ↩ Deshacer
          </button>
          <button ref={btnListoRef} onClick={terminarDibujo} style={{ display: 'none' }}
            className="bg-green-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-md hover:bg-green-700 transition-colors flex items-center gap-2">
            <CheckCircle size={16} /> Listo — Guardar Potrero
          </button>
        </div>
      </div>
    </div>
  )
})

// ══════════════════════════════════════════════════════════════
//  MÓDULO PRINCIPAL
// ══════════════════════════════════════════════════════════════
export function Potreros() {
  const { finca, setFinca } = useAuthStore()
  const [potreros, setPotreros] = useState<Potrero[]>([])
  const [cargando, setCargando] = useState(true)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)

  const [formAbierto, setFormAbierto] = useState(false)
  const [editando, setEditando] = useState<Potrero | null>(null)
  const [nombre, setNombre] = useState('')
  const [hectareas, setHectareas] = useState('')
  const [estado, setEstado] = useState('en_uso')
  const [colorHex, setColorHex] = useState('#16a34a')
  const [capacidad, setCapacidad] = useState('')
  const [diasRot, setDiasRot] = useState('')
  const [poligonoNuevo, setPoligonoNuevo] = useState<[number, number][] | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [eliminando, setEliminando] = useState<Potrero | null>(null)
  const [conteoAnimales, setConteoAnimales] = useState<Record<string, number>>({})

  // Puntos de interés
  const [puntosInteres, setPuntosInteres] = useState<PuntoInteres[]>([])
  const [pendientePunto, setPendientePunto] = useState<{ lat: number; lng: number } | null>(null)
  const [pNombre, setPNombre] = useState('')
  const [pEmoji, setPEmoji] = useState('📍')
  const [guardandoPunto, setGuardandoPunto] = useState(false)
  const [centrarEn, setCentrarEn] = useState<{ lat: number; lng: number } | null>(null)

  const centro: [number, number] = [finca?.coordenadas_lat ?? 4.5709, finca?.coordenadas_lng ?? -74.2973]

  async function cargarPotreros() {
    if (!finca?.id) { setCargando(false); return }
    setCargando(true)
    const [{ data: potData }, { data: animData }] = await Promise.all([
      supabase.from('potreros').select('*').eq('finca_id', finca.id).order('fecha_creacion', { ascending: true }),
      supabase.from('animales').select('potrero_id').eq('finca_id', finca.id).not('potrero_id', 'is', null),
    ])
    setPotreros(potData ?? [])
    // Contar animales por potrero
    const conteo: Record<string, number> = {}
    animData?.forEach((a: any) => {
      if (a.potrero_id) conteo[a.potrero_id] = (conteo[a.potrero_id] ?? 0) + 1
    })
    setConteoAnimales(conteo)
    setCargando(false)
  }
  useEffect(() => {
    cargarPotreros()
    // Cargar puntos de interés desde finca
    if (finca) {
      const pts = (finca as any).puntos_interes
      if (Array.isArray(pts)) setPuntosInteres(pts)
    }
  }, [finca?.id])

  async function guardarPuntosEnFinca(nuevos: PuntoInteres[]) {
    if (!finca?.id) return
    const { data } = await supabase
      .from('fincas')
      .update({ puntos_interes: nuevos } as any)
      .eq('id', finca.id)
      .select()
      .single()
    if (data) setFinca(data)
  }

  async function agregarPunto() {
    if (!pendientePunto || !pNombre.trim()) return
    setGuardandoPunto(true)
    const nuevo: PuntoInteres = {
      id: crypto.randomUUID(),
      lat: pendientePunto.lat,
      lng: pendientePunto.lng,
      emoji: pEmoji,
      nombre: pNombre.trim(),
    }
    const nuevos = [...puntosInteres, nuevo]
    setPuntosInteres(nuevos)
    await guardarPuntosEnFinca(nuevos)
    setCentrarEn({ lat: nuevo.lat, lng: nuevo.lng }) // centra mapa en el punto guardado
    setPendientePunto(null)
    setPNombre('')
    setPEmoji('📍')
    setGuardandoPunto(false)
  }

  async function eliminarPunto(id: string) {
    const nuevos = puntosInteres.filter(p => p.id !== id)
    setPuntosInteres(nuevos)
    await guardarPuntosEnFinca(nuevos)
  }

  const handlePoligonoListo = useCallback((pts: [number, number][]) => {
    setPoligonoNuevo(pts)
    setEditando(null)
    setNombre(''); setHectareas(''); setEstado('en_uso')
    setColorHex('#16a34a'); setCapacidad(''); setDiasRot('')
    setError(''); setFormAbierto(true)
  }, [])

  function abrirEditar(p: Potrero) {
    setEditando(p); setNombre(p.nombre)
    setHectareas(p.hectareas?.toString() ?? '')
    setEstado(p.estado); setColorHex(p.color_hex ?? '#16a34a')
    setCapacidad(p.capacidad_carga?.toString() ?? '')
    setDiasRot(p.dias_desde_rotacion?.toString() ?? '')
    setPoligonoNuevo(null); setError(''); setFormAbierto(true)
  }

  function abrirNuevo() {
    setEditando(null); setNombre(''); setHectareas(''); setEstado('en_uso')
    setColorHex('#16a34a'); setCapacidad(''); setDiasRot('')
    setPoligonoNuevo(null); setError(''); setFormAbierto(true)
  }

  async function guardar() {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!finca?.id) { setError('No hay finca'); return }
    setGuardando(true); setError('')
    const payload: any = {
      finca_id: finca.id, nombre: nombre.trim(),
      hectareas: hectareas ? Number(hectareas) : null,
      estado, color_hex: colorHex,
      capacidad_carga: capacidad ? Number(capacidad) : null,
      dias_desde_rotacion: diasRot ? Number(diasRot) : 0,
    }
    if (poligonoNuevo) payload.coordenadas_poligono = poligonoNuevo
    try {
      const res = editando
        ? await supabase.from('potreros').update(payload).eq('id', editando.id).select().single()
        : await supabase.from('potreros').insert([payload]).select().single()
      if (res.error) { setError(res.error.message) }
      else {
        const savedId = res.data?.id ?? null
        setFormAbierto(false); setEditando(null); setPoligonoNuevo(null)
        requestAnimationFrame(() => {
          cargarPotreros()
          if (savedId) setSeleccionado(savedId) // centra el mapa en el potrero guardado
        })
      }
    } catch { setError('Error al guardar') }
    setGuardando(false)
  }

  async function confirmarEliminar() {
    if (!eliminando) return
    await supabase.from('potreros').delete().eq('id', eliminando.id)
    setPotreros(prev => prev.filter(p => p.id !== eliminando.id))
    if (seleccionado === eliminando.id) setSeleccionado(null)
    setEliminando(null)
  }

  const stats = {
    total: potreros.length,
    enUso: potreros.filter(p => p.estado === 'en_uso').length,
    descanso: potreros.filter(p => p.estado === 'descanso').length,
    ha: potreros.reduce((s, p) => s + (p.hectareas ?? 0), 0),
    animales: Object.values(conteoAnimales).reduce((s, n) => s + n, 0),
  }

  return (
    <div className="flex flex-col lg:flex-row h-full relative">

      {/* ══ MAPA — oculto en móvil, visible en desktop ══════ */}
      <div className="hidden lg:block lg:flex-1 relative">
        {cargando && (
          <div className="absolute inset-0 bg-white/60 z-[500] flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
        <MapaPotreros
          potreros={potreros}
          seleccionado={seleccionado}
          onSeleccionar={setSeleccionado}
          onPoligonoListo={handlePoligonoListo}
          onClickMarcador={(lat, lng) => { setPendientePunto({ lat, lng }); setPNombre(''); setPEmoji('📍') }}
          onEliminarPunto={eliminarPunto}
          puntosInteres={puntosInteres}
          centrarEn={centrarEn}
          centro={centro}
        />
      </div>

      {/* ══ PANEL — full-width en móvil (flex-1), w-72 en desktop ════ */}
      <div className="flex flex-col flex-1 lg:flex-none lg:w-72 bg-white lg:border-l border-gray-100 overflow-hidden">

        {/* Botón nuevo */}
        <div className="px-3 py-2.5 border-b border-gray-100 flex-shrink-0">
          <button onClick={abrirNuevo}
            className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors">
            <Plus size={15} /> Nuevo Potrero
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 border-b border-gray-100 flex-shrink-0">
          {[
            { l: 'Potreros', v: stats.total, c: 'text-gray-800' },
            { l: 'En uso', v: stats.enUso, c: 'text-green-600' },
            { l: 'Desc.', v: stats.descanso, c: 'text-blue-600' },
            { l: 'Ha', v: stats.ha.toFixed(0), c: 'text-amber-600' },
            { l: '🐄', v: stats.animales, c: 'text-amber-700' },
          ].map(s => (
            <div key={s.l} className="flex flex-col items-center py-2 border-r border-gray-100 last:border-r-0">
              <span className={`text-base font-bold ${s.c}`}>{s.v}</span>
              <span className="text-[10px] text-gray-400">{s.l}</span>
            </div>
          ))}
        </div>

        {/* Leyenda */}
        <div className="flex gap-2 px-3 py-1.5 border-b border-gray-100 flex-shrink-0 flex-wrap">
          {Object.entries(COLORES_ESTADO).map(([e, c]) => (
            <div key={e} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-[10px] text-gray-500 capitalize">{e.replace('_', ' ')}</span>
            </div>
          ))}
        </div>

        {/* Formulario inline */}
        {formAbierto && (
          <div className="border-b border-gray-100 bg-gray-50 flex-shrink-0 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 sticky top-0 bg-gray-50">
              <h3 className="text-xs font-bold text-gray-800">{editando ? '✏️ Editar' : '+ Nuevo Potrero'}</h3>
              <button onClick={() => { setFormAbierto(false); setEditando(null); setPoligonoNuevo(null) }}>
                <X size={14} className="text-gray-400 hover:text-gray-700" />
              </button>
            </div>
            <div className="p-3 flex flex-col gap-2.5">
              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
              {poligonoNuevo && (
                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded p-2">
                  <CheckCircle size={13} className="text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-700">{poligonoNuevo.length} puntos dibujados ✓</p>
                </div>
              )}
              <Input label="Nombre *" placeholder="Ej: Potrero Norte" value={nombre} onChange={e => setNombre(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Hectáreas" type="number" placeholder="5.5" value={hectareas} onChange={e => setHectareas(e.target.value)} />
                <Input label="Días rotación" type="number" placeholder="0" value={diasRot} onChange={e => setDiasRot(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Estado</label>
                <div className="grid grid-cols-2 gap-1">
                  {ESTADOS.map(e => (
                    <button key={e} onClick={() => setEstado(e)}
                      className={`text-xs px-2 py-1.5 rounded border font-medium transition-colors text-left ${estado === e ? 'border-green-400 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 mb-px" style={{ backgroundColor: COLORES_ESTADO[e] }} />
                      {e.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Color</label>
                <div className="flex gap-1.5 flex-wrap">
                  {COLORES_PICK.map(c => (
                    <button key={c} onClick={() => setColorHex(c)}
                      className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${colorHex === c ? 'border-gray-500 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <Input label="Cap. carga (UGG)" type="number" placeholder="20" value={capacidad} onChange={e => setCapacidad(e.target.value)} />
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setFormAbierto(false); setEditando(null); setPoligonoNuevo(null) }}
                  className="flex-1 py-2 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={guardando}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60">
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear potrero'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {potreros.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <MapPin size={24} className="text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">Sin potreros.<br />Dibuja uno en el mapa o crea uno nuevo.</p>
            </div>
          ) : (
            <ul>
              {potreros.map((p, idx) => {
                const esSel = seleccionado === p.id
                const color = p.color_hex ?? COLORES_ESTADO[p.estado] ?? '#16a34a'
                return (
                  <li key={p.id}>
                    {/* div en vez de button para evitar buttons anidados */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSeleccionado(esSel ? null : p.id)}
                      onKeyDown={e => e.key === 'Enter' && setSeleccionado(esSel ? null : p.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-50 text-left hover:bg-gray-50 transition-colors cursor-pointer ${esSel ? 'bg-green-50' : ''}`}
                    >
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: color }}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.nombre}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-400">{p.hectareas ? `${p.hectareas} ha` : '—'}</span>
                          <span className="text-[10px] px-1.5 py-px rounded-full text-white font-medium" style={{ backgroundColor: COLORES_ESTADO[p.estado] ?? '#9ca3af' }}>
                            {p.estado.replace('_', ' ')}
                          </span>
                          {(conteoAnimales[p.id] ?? 0) > 0 && (
                            <span className="text-[10px] px-1.5 py-px rounded-full bg-amber-100 text-amber-700 font-medium">
                              🐄 {conteoAnimales[p.id]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        <button onClick={e => { e.stopPropagation(); abrirEditar(p) }}
                          className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setEliminando(p) }}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {esSel && (
                      <div className="bg-green-50 px-4 py-2 border-b border-green-100 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div><p className="text-gray-500">Hectáreas</p><p className="font-semibold">{p.hectareas ?? '—'} ha</p></div>
                          <div><p className="text-gray-500">Días rotación</p><p className="font-semibold">{p.dias_desde_rotacion ?? 0} días</p></div>
                          {p.capacidad_carga && <div className="col-span-2"><p className="text-gray-500">Cap. carga</p><p className="font-semibold">{p.capacidad_carga} UGG</p></div>}
                          <div className="col-span-2">
                            <p className="text-gray-500">Animales en este potrero</p>
                            <p className="font-semibold text-amber-700">{conteoAnimales[p.id] ?? 0} animales</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Puntos de interés */}
        {puntosInteres.length > 0 && (
          <div className="border-t border-gray-100 flex-shrink-0">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">📍 Puntos de interés ({puntosInteres.length})</p>
            </div>
            <ul className="max-h-32 overflow-y-auto">
              {puntosInteres.map(p => (
                <li key={p.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 border-b border-gray-50 last:border-b-0">
                  <span className="text-base flex-shrink-0">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{p.nombre}</p>
                    <p className="text-[9px] text-gray-400">{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</p>
                  </div>
                  <button
                    onClick={() => eliminarPunto(p.id)}
                    className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    title="Eliminar punto"
                  >
                    <Trash2 size={11} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Modal — Nombrar punto de interés */}
      <Modal abierto={!!pendientePunto} onCerrar={() => setPendientePunto(null)} titulo="Nuevo punto de interés" tamano="sm">
        {pendientePunto && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-500">
              Coordenadas: {pendientePunto.lat.toFixed(5)}, {pendientePunto.lng.toFixed(5)}
            </p>

            {/* Selector de emoji */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Tipo de punto</label>
              <div className="grid grid-cols-5 gap-2">
                {EMOJIS_PUNTOS.map(ep => (
                  <button
                    key={ep.e}
                    onClick={() => setPEmoji(ep.e)}
                    title={ep.l}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                      pEmoji === ep.e
                        ? 'border-green-400 bg-green-50 ring-2 ring-green-300'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{ep.e}</span>
                    <span className="text-[9px] text-gray-500 text-center leading-tight">{ep.l}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nombre */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Nombre del punto *</label>
              <input
                autoFocus
                value={pNombre}
                onChange={e => setPNombre(e.target.value)}
                placeholder={`Ej: ${pEmoji === '🏠' ? 'Casa principal' : pEmoji === '🚰' ? 'Bebedero norte' : 'Punto estratégico'}`}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                onKeyDown={e => { if (e.key === 'Enter' && pNombre.trim()) agregarPunto() }}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variante="secundario" onClick={() => setPendientePunto(null)}>Cancelar</Button>
              <Button onClick={agregarPunto} cargando={guardandoPunto} disabled={!pNombre.trim()}>
                Guardar punto {pEmoji}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal eliminar — z-[9999] para estar encima del mapa */}
      <Modal abierto={!!eliminando} onCerrar={() => setEliminando(null)} titulo="Eliminar Potrero" tamano="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">¿Eliminar <strong>{eliminando?.nombre}</strong>? No se puede deshacer.</p>
          <div className="flex justify-end gap-3">
            <Button variante="secundario" onClick={() => setEliminando(null)}>Cancelar</Button>
            <Button variante="peligro" onClick={confirmarEliminar}>Sí, eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
