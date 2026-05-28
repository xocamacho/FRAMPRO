/**
 * InstallPWA — Prompt de instalación de la app
 * Aparece automáticamente cuando el navegador dispara el evento
 * beforeinstallprompt (Chrome/Edge en Android y desktop).
 */
import { useState, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWA() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [instalando, setInstalando] = useState(false)
  const [cerrado, setCerrado] = useState(false)

  // ── Captura el evento antes de que Chrome lo oculte ──────────────
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // ── Hook oficial de vite-plugin-pwa para actualizaciones ─────────
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[PWA] Service Worker registrado', r)
    },
    onRegisterError(error) {
      console.error('[PWA] Error al registrar Service Worker', error)
    },
  })

  // ── Instalar app ──────────────────────────────────────────────────
  const instalar = async () => {
    if (!installEvent) return
    setInstalando(true)
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') setInstallEvent(null)
    setInstalando(false)
  }

  // ── Banner de actualización disponible ────────────────────────────
  if (needRefresh) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
        <div className="bg-green-700 text-white rounded-xl shadow-xl p-4 flex items-start gap-3">
          <div className="text-2xl">🔄</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Actualización disponible</p>
            <p className="text-xs text-green-100 mt-0.5">
              Hay una nueva versión de FincaPro lista.
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => updateServiceWorker(true)}
              className="text-xs bg-white text-green-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
            >
              Actualizar
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="text-xs text-green-200 hover:text-white transition-colors text-center"
            >
              Después
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Banner de instalación ─────────────────────────────────────────
  if (!installEvent || cerrado) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 flex items-start gap-3">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-2xl">🐄</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">Instalar FincaPro</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Añade la app a tu pantalla de inicio para usarla sin internet.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={instalar}
              disabled={instalando}
              className="flex-1 text-xs bg-green-600 text-white font-semibold px-3 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {instalando ? 'Instalando…' : '📲 Instalar'}
            </button>
            <button
              onClick={() => setCerrado(true)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 transition-colors"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
