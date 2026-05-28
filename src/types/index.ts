export interface Finca {
  id: string
  nombre: string
  ubicacion?: string
  numero_ica?: string
  hectareas?: number
  coordenadas_lat?: number
  coordenadas_lng?: number
  logo_url?: string
  clima?: 'tropical_bajo' | 'tropical_medio'
  propietario_id: string
  fecha_creacion: string
  fecha_actualizacion: string
}

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: 'admin' | 'vaquero'
  finca_id: string
  permisos: { modulos: string[] }
  activo: boolean
  fecha_creacion: string
}

export interface Animal {
  id: string
  finca_id: string
  nombre: string
  numero_arete?: string
  chip_ica?: string
  especie: 'bovino' | 'equino' | 'porcino'
  categoria_id?: string
  raza?: string
  sexo: 'macho' | 'hembra'
  color_marcas?: string
  fecha_nacimiento?: string
  edad_meses?: number
  peso_actual?: number
  potrero_id?: string
  estado: 'sano' | 'enfermo' | 'prenada' | 'lactando' | 'reproductor'
  genealogia_madre_id?: string
  genealogia_padre_id?: string
  precio_compra?: number
  fecha_entrada?: string
  es_compania: boolean
  propietario_compania?: string
  foto_url?: string
  bcs_actual?: number
  fecha_creacion: string
  fecha_actualizacion: string
}

export interface Potrero {
  id: string
  finca_id: string
  nombre: string
  hectareas?: number
  color_hex?: string
  estado: 'en_uso' | 'descanso' | 'mantenimiento'
  coordenadas_poligono?: [number, number][]
  dias_desde_rotacion?: number
  pastos_sembrados: string[]
  capacidad_carga?: number
  animales_actuales?: number
  alerta_sobrecarga?: boolean
  fecha_creacion: string
  fecha_actualizacion: string
}

export interface Vacuna {
  id: string
  animal_id: string
  nombre: string
  fecha_aplicacion: string
  proxima_dosis?: string
  lote?: string
  veterinario?: string
  notas?: string
  fecha_creacion: string
}

export interface Pesaje {
  id: string
  animal_id: string
  peso_kg: number
  fecha: string
  bcs?: number
  temperatura_ambiente?: number
  registrado_por?: string
  fecha_creacion: string
}

export interface Parto {
  id: string
  madre_id: string
  fecha_parto: string
  tipo_parto: 'natural' | 'cesarea' | 'iatf'
  sexo_cria?: string
  peso_cria?: number
  cria_id?: string
  complicaciones?: string
  veterinario?: string
  fecha_creacion: string
}

export interface Inseminacion {
  id: string
  vaca_id: string
  fecha_inseminacion: string
  tipo: 'ia_natural' | 'ia_sincronizada' | 'monta_natural'
  semen_toro_raza?: string
  resultado: 'exitosa' | 'fallida' | 'pendiente'
  fecha_deteccion_prenez?: string
  semanas_gestacion?: number
  registrado_por?: string
  fecha_creacion: string
}

export interface Sanidad {
  id: string
  animal_id: string
  fecha: string
  tipo_evento: 'enfermedad' | 'tratamiento' | 'laboratorio' | 'observacion'
  descripcion: string
  diagnostico?: string
  tratamiento?: string
  medicamentos: { nombre: string; dosis: string; dias: number }[]
  resultado?: 'mejorado' | 'estable' | 'empeorado'
  veterinario?: string
  foto_url?: string
  registrado_por?: string
  fecha_creacion: string
}

export interface Tarea {
  id: string
  finca_id: string
  titulo: string
  descripcion?: string
  asignado_a?: string
  creado_por: string
  estado: 'pendiente' | 'en_progreso' | 'completada'
  fecha_creacion: string
  fecha_vencimiento?: string
  prioridad: 'baja' | 'media' | 'alta'
  foto_evidencia_url?: string
  notas_completacion?: string
  fecha_completacion?: string
}

export interface InventarioItem {
  id: string
  finca_id: string
  categoria: 'medicamentos' | 'alimentos' | 'herramientas' | 'insumos'
  nombre: string
  cantidad: number
  unidad: string
  costo_unitario?: number
  fecha_vencimiento?: string
  proveedor?: string
  alerta_bajo: boolean
  cantidad_minima?: number
  fecha_creacion: string
  fecha_actualizacion: string
}

export interface Novedad {
  id: string
  finca_id: string
  animal_id?: string
  descripcion: string
  tipo: 'evento' | 'observacion' | 'alerta'
  foto_url?: string
  registrado_por: string
  temperatura_ambiente?: number
  humedad?: number
  fecha_creacion: string
}

export interface Meta {
  id: string
  finca_id: string
  nombre: string
  tipo: string | null
  valor_meta: number | null
  valor_actual: number | null
  fecha_inicio: string | null
  fecha_fin: string | null
  fecha_creacion: string
}

export interface FinanzaIngreso {
  id: string
  finca_id: string
  fecha: string
  concepto: string
  cantidad?: number
  valor_total: number
  descripcion?: string
  comprobante?: string
  registrado_por?: string
  fecha_creacion: string
}

export interface FinanzaEgreso {
  id: string
  finca_id: string
  fecha: string
  concepto: string
  cantidad?: number
  valor_total: number
  descripcion?: string
  comprobante?: string
  registrado_por?: string
  fecha_creacion: string
}
