import { type HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

export function Card({ padding = 'md', className, children, ...props }: CardProps) {
  const paddings = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-7' }
  return (
    <div
      className={clsx('bg-white rounded-xl border border-gray-200 shadow-sm', paddings[padding], className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={clsx('text-base font-semibold text-gray-900', className)} {...props}>
      {children}
    </h3>
  )
}
