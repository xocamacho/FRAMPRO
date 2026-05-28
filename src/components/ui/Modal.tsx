import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface ModalProps {
  abierto: boolean
  onCerrar: () => void
  titulo?: string
  children: React.ReactNode
  tamano?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export function Modal({ abierto, onCerrar, titulo, children, tamano = 'md' }: ModalProps) {
  useEffect(() => {
    if (abierto) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [abierto])

  if (!abierto) return null

  const anchos = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl', '2xl': 'max-w-4xl' }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCerrar} />
      <div className={clsx('relative bg-white rounded-xl shadow-xl w-full max-h-[90vh] flex flex-col', anchos[tamano])}>
        {titulo && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
            <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  )
}
