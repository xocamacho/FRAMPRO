import { supabase } from './supabase'

const QUEUE_KEY = 'fincapro_offline_queue'

export interface OperacionPendiente {
  id: string
  timestamp: number
  tabla: string
  operacion: 'insert' | 'update' | 'delete'
  payload?: Record<string, any>
  entidadId?: string
  descripcion: string
}

// ── Leer / escribir cola ─────────────────────────────────────────
export function obtenerCola(): OperacionPendiente[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function guardarCola(ops: OperacionPendiente[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(ops))
}

export function agregarALaCola(op: Omit<OperacionPendiente, 'id' | 'timestamp'>) {
  const cola = obtenerCola()
  cola.push({ ...op, id: crypto.randomUUID(), timestamp: Date.now() })
  guardarCola(cola)
  // Notificar a listeners
  window.dispatchEvent(new Event('offlinequeue'))
}

export function eliminarDeCola(id: string) {
  guardarCola(obtenerCola().filter(op => op.id !== id))
  window.dispatchEvent(new Event('offlinequeue'))
}

export function limpiarCola() {
  localStorage.removeItem(QUEUE_KEY)
  window.dispatchEvent(new Event('offlinequeue'))
}

// ── Procesar la cola contra Supabase ────────────────────────────
export async function procesarCola(): Promise<{ sincronizados: number; errores: number }> {
  const cola = obtenerCola()
  if (cola.length === 0) return { sincronizados: 0, errores: 0 }

  let sincronizados = 0
  let errores = 0

  for (const op of cola) {
    try {
      let result: any

      if (op.operacion === 'insert') {
        result = await supabase.from(op.tabla).insert(op.payload!)
      } else if (op.operacion === 'update' && op.entidadId) {
        result = await supabase.from(op.tabla).update(op.payload!).eq('id', op.entidadId)
      } else if (op.operacion === 'delete' && op.entidadId) {
        result = await supabase.from(op.tabla).delete().eq('id', op.entidadId)
      }

      if (result?.error) {
        console.warn(`⚠️ Error sincronizando ${op.descripcion}:`, result.error)
        errores++
      } else {
        eliminarDeCola(op.id)
        sincronizados++
      }
    } catch (e) {
      console.warn(`⚠️ Error procesando operación:`, e)
      errores++
    }
  }

  return { sincronizados, errores }
}
