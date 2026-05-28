// Usuario
export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: string
  finca_id: string | null
  permisos?: Record<string, any>
  activo?: boolean
  fecha_creacion?: string
}

// Finca
export interface Finca {
  id: string
  nombre: string
  ubicacion?: string | null
  numero_ica?: string | null
  hectareas?: number | null
  coordenadas_lat?: number | null
  coordenadas_lng?: number | null
  logo_url?: string | null
  clima?: string | null
  propietario_id: string
  fecha_creacion: string
  fecha_actualizacion?: string
}

// Animal
export interface Animal {
  id: string
  finca_id: string
  nombre: string
  numero_arete?: string | null
  chip_ica?: string | null
  especie: string
  categoria_id?: string | null
  raza?: string | null
  sexo: string
  color_marcas?: string | null
  fecha_nacimiento?: string | null
  peso_actual?: number | null
  potrero_id?: string | null
  estado: string
  genealogia_madre_id?: string | null
  genealogia_padre_id?: string | null
  precio_compra?: number | null
  fecha_entrada?: string | null
  es_compania?: boolean
  propietario_compania?: string | null
  foto_url?: string | null
  datos_reproductivos?: Record<string, any>
  bcs_actual?: number | null
  fecha_creacion: string
  fecha_actualizacion?: string
}

// Potrero
export interface Potrero {
  id: string
  finca_id: string
  nombre: string
  hectareas?: number | null
  color_hex?: string | null
  estado: string
  coordenadas_poligono?: Record<string, any> | null
  dias_desde_rotacion?: number | null
  pastos_sembrados?: Record<string, any> | null
  capacidad_carga?: number | null
  fecha_creacion: string
  fecha_actualizacion?: string
}

// Vacuna
export interface Vacuna {
  id: string
  animal_id: string
  nombre: string
  fecha_aplicacion: string
  proxima_dosis?: string | null
  lote?: string | null
  veterinario?: string | null
  notas?: string | null
  temperatura_clima?: string | null
  fecha_creacion: string
}

// Pesaje
export interface Pesaje {
  id: string
  animal_id: string
  peso_kg: number
  fecha: string
  bcs?: number | null
  temperatura_ambiente?: number | null
  registrado_por?: string | null
  fecha_creacion: string
}

// Parto
export interface Parto {
  id: string
  madre_id: string
  fecha_parto: string
  tipo_parto?: string
  sexo_cria?: string | null
  peso_cria?: number | null
  cria_id?: string | null
  complicaciones?: string | null
  veterinario?: string | null
  temperatura_clima?: string | null
  fecha_creacion: string
}

// Inseminación
export interface Inseminacion {
  id: string
  vaca_id: string
  fecha_inseminacion: string
  tipo?: string
  semen_toro_raza?: string | null
  resultado?: string
  fecha_deteccion_prenez?: string | null
  semanas_gestacion?: number | null
  temperatura_clima?: string | null
  registrado_por?: string | null
  fecha_creacion: string
}

// Sanidad
export interface Sanidad {
  id: string
  animal_id: string
  fecha: string
  tipo_evento?: string
  descripcion: string
  diagnostico?: string | null
  tratamiento?: string | null
  medicamentos?: Record<string, any>
  resultado?: string | null
  veterinario?: string | null
  temperatura_ambiente?: number | null
  humedad?: number | null
  foto_url?: string | null
  registrado_por?: string | null
  fecha_creacion: string
}

// Desparasitación
export interface Desparasitacion {
  id: string
  animal_id: string
  fecha: string
  producto: string
  principio_activo?: string | null
  dosis?: number | null
  via_administracion?: string | null
  veterinario?: string | null
  proxima_desparasitacion?: string | null
  temperatura_clima?: string | null
  registrado_por?: string | null
  fecha_creacion: string
}

// Producción de Leche (por vaca individual)
export interface LecheProduccion {
  id: string
  vaca_id: string
  fecha: string
  litros?: number | null
  proteina_pct?: number | null
  grasa_pct?: number | null
  solidos_totales_pct?: number | null
  calidad?: string | null
  temperatura_ambiente?: number | null
  registrado_por?: string | null
  fecha_creacion: string
}

// Producción diaria total de leche (por finca)
export interface LecheDiaria {
  id: string
  finca_id: string
  fecha: string
  vacas_ordenadas: number
  litros_total: number
  destino?: string | null        // 'queso' | 'venta' | 'mixto' | 'autoconsumo'
  litros_queso?: number | null
  litros_venta?: number | null
  precio_litro?: number | null
  kilos_queso?: number | null
  precio_queso_kg?: number | null
  notas?: string | null
  fecha_creacion: string
}

// Inventario
export interface Inventario {
  id: string
  finca_id: string
  categoria?: string
  nombre: string
  cantidad: number
  unidad?: string
  costo_unitario?: number | null
  fecha_vencimiento?: string | null
  proveedor?: string | null
  alerta_bajo?: boolean
  cantidad_minima?: number
  registrado_por?: string | null
  fecha_creacion: string
  fecha_actualizacion?: string
}

// Tarea
export interface Tarea {
  id: string
  finca_id: string
  titulo: string
  descripcion?: string | null
  asignado_a?: string | null
  creado_por: string
  estado: string
  fecha_creacion: string
  fecha_vencimiento?: string | null
  prioridad?: string
  foto_evidencia_url?: string | null
  notas_completacion?: string | null
  fecha_completacion?: string | null
}

// Novedad
export interface Novedad {
  id: string
  finca_id: string
  animal_id?: string | null
  descripcion: string
  tipo?: string
  foto_url?: string | null
  registrado_por: string
  temperatura_ambiente?: number | null
  humedad?: number | null
  fecha_creacion: string
}

// Finanzas - Ingreso
export interface FinanzasIngreso {
  id: string
  finca_id: string
  fecha: string
  concepto?: string | null
  cantidad?: number | null
  valor_total: number
  descripcion?: string | null
  comprobante?: string | null
  registrado_por?: string | null
  fecha_creacion: string
}

// Finanzas - Egreso
export interface FinanzasEgreso {
  id: string
  finca_id: string
  fecha: string
  concepto?: string | null
  cantidad?: number | null
  valor_total: number
  descripcion?: string | null
  comprobante?: string | null
  registrado_por?: string | null
  fecha_creacion: string
}

// Meta
export interface Meta {
  id: string
  finca_id: string
  nombre: string
  tipo?: string | null
  valor_meta?: number | null
  valor_actual?: number | null
  fecha_inicio?: string | null
  fecha_fin?: string | null
  fecha_creacion: string
}

// Categoría de Animal
export interface CategoriaAnimal {
  id: string
  finca_id: string
  nombre: string
  color_hex?: string | null
  icono?: string | null
  ciclo_reproduccion_meses?: number | null
  fecha_creacion: string
}
