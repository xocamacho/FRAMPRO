import { clsx } from 'clsx'

type BadgeVariante = 'verde' | 'rojo' | 'amarillo' | 'azul' | 'gris' | 'naranja'

interface BadgeProps {
  variante?: BadgeVariante
  children: React.ReactNode
  className?: string
}

const variantes: Record<BadgeVariante, string> = {
  verde: 'bg-green-100 text-green-700',
  rojo: 'bg-red-100 text-red-700',
  amarillo: 'bg-yellow-100 text-yellow-700',
  azul: 'bg-blue-100 text-blue-700',
  gris: 'bg-gray-100 text-gray-600',
  naranja: 'bg-orange-100 text-orange-700',
}

export function Badge({ variante = 'gris', children, className }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variantes[variante], className)}>
      {children}
    </span>
  )
}
