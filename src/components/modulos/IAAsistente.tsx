import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { consultarIA } from '@/services/groqAPI'
import { Send, Bot, User, Leaf } from 'lucide-react'
import { clsx } from 'clsx'

interface Mensaje {
  rol: 'usuario' | 'asistente'
  contenido: string
  hora: string
}

const PREGUNTAS_RAPIDAS = [
  '¿Cómo detectar si una vaca está en celo?',
  '¿Qué hacer si una vaca no emprenña?',
  '¿Cuándo desparasitar el ganado?',
  '¿Cuál es el BCS ideal para una vaca de cría?',
]

export function IAAsistente() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      rol: 'asistente',
      contenido: '¡Hola! Soy tu asistente veterinario especializado en ganadería de doble propósito del Cesar. ¿En qué te puedo ayudar hoy?',
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [pregunta, setPregunta] = useState('')
  const [cargando, setCargando] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function enviarPregunta(texto?: string) {
    const contenido = texto ?? pregunta
    if (!contenido.trim() || cargando) return

    const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    setMensajes((prev) => [...prev, { rol: 'usuario', contenido, hora }])
    setPregunta('')
    setCargando(true)

    try {
      const respuesta = await consultarIA(contenido)
      setMensajes((prev) => [...prev, { rol: 'asistente', contenido: respuesta, hora }])
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido'
      setMensajes((prev) => [
        ...prev,
        { rol: 'asistente', contenido: `❌ Error: ${msg}\n\n💡 Verifica:\n1. ¿El backend corre en localhost:3001?\n2. ¿Tu API key es válida?\n3. ¿Hay dos procesos en "npm run dev"?`, hora },
      ])
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="p-6 flex flex-col gap-4 h-[calc(100vh-65px)]">
      <div>
        <h2 className="text-lg font-bold text-gray-900">IA Asistente Veterinario</h2>
        <p className="text-sm text-gray-500">Powered by Groq — respuestas instantáneas sobre tu ganadería</p>
      </div>

      {/* Chat */}
      <Card padding="none" className="flex-1 flex flex-col overflow-hidden">
        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {mensajes.map((msg, i) => (
            <div
              key={i}
              className={clsx('flex gap-3', msg.rol === 'usuario' ? 'flex-row-reverse' : 'flex-row')}
            >
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  msg.rol === 'asistente' ? 'bg-green-100' : 'bg-gray-100'
                )}
              >
                {msg.rol === 'asistente' ? <Leaf size={16} className="text-green-600" /> : <User size={16} className="text-gray-600" />}
              </div>
              <div className={clsx('max-w-[75%] flex flex-col gap-1', msg.rol === 'usuario' ? 'items-end' : 'items-start')}>
                <div
                  className={clsx(
                    'px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                    msg.rol === 'asistente'
                      ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                      : 'bg-green-600 text-white rounded-tr-sm'
                  )}
                >
                  {msg.contenido}
                </div>
                <span className="text-xs text-gray-400">{msg.hora}</span>
              </div>
            </div>
          ))}

          {cargando && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Bot size={16} className="text-green-600" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Preguntas rápidas */}
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {PREGUNTAS_RAPIDAS.map((p) => (
            <button
              key={p}
              onClick={() => enviarPregunta(p)}
              className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 hover:bg-green-100 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Pregunta sobre salud, reproducción, alimentación..."
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && enviarPregunta()}
            />
          </div>
          <Button onClick={() => enviarPregunta()} disabled={!pregunta.trim() || cargando}>
            <Send size={16} />
          </Button>
        </div>
      </Card>
    </div>
  )
}
