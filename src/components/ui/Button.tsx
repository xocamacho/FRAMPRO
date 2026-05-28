import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'peligro' | 'fantasma'
  tamano?: 'sm' | 'md' | 'lg'
  cargando?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variante = 'primario', tamano = 'md', cargando, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variantes = {
      primario: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
      secundario: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-300',
      peligro: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      fantasma: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-300',
    }

    const tamanos = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || cargando}
        className={clsx(base, variantes[variante], tamanos[tamano], className)}
        {...props}
      >
        {cargando && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
