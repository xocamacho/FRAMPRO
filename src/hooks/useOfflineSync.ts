import { useState, useEffect, useCallback } from 'react'
import { obtenerCola, procesarCola } from '@/services/offlineSync'

export function useOfflineSync() {
  const [enLinea, setEnLinea] = useState(navigator.onLine)
  const [pendientes, setPendientes] = useState(obtenerCola().length)
  const [sincronizando, setSincronizando] = useState(false)
  const [ultimaSync, setUltimaSync] = useState<Date | null>(null)

  // Actualizar conteo cuando cambia la cola
  useEffect(() => {
    function actualizarConteo() {
      setPendientes(obtenerCola().length)
    }
    window.addEventListener('offlinequeue', actualizarConteo)
    return () => window.removeEventListener('offlinequeue', actualizarConteo)
  }, [])

  // Detectar cambios de conectividad
  useEffect(() => {
    function onOnline() {
      setEnLinea(true)
    }
    function onOffline() {
      setEnLinea(false)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Auto-sincronizar al recuperar conexión
  useEffect(() => {
    if (enLinea && obtenerCola().length > 0) {
      sincronizar()
    }
  }, [enLinea])

  const sincronizar = useCallback(async () => {
    if (sincronizando || !navigator.onLine) return
    setSincronizando(true)
    try {
      const resultado = await procesarCola()
      setPendientes(obtenerCola().length)
      setUltimaSync(new Date())
      return resultado
    } finally {
      setSincronizando(false)
    }
  }, [sincronizando])

  return { enLinea, pendientes, sincronizando, ultimaSync, sincronizar }
}
