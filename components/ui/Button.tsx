// INDEX: components/ui/Button.tsx
'use client'

import { ButtonHTMLAttributes } from 'react'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

type Variant = 'primary' | 'secondary' | 'ghost'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  fullWidth?: boolean
}

export function Button({ variant = 'primary', fullWidth = true, className, ...props }: Props) {
  const base =
    'rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 min-h-[44px]'
  const variants: Record<Variant, string> = {
    primary: 'bg-black text-white px-4 py-3 hover:bg-black/90',
    secondary: 'bg-white border border-slate-200 text-slate-900 px-4 py-3 hover:bg-slate-50',
    ghost: 'bg-transparent text-slate-700 px-3 py-2 hover:bg-slate-100',
  }

  return (
    <button
      className={cx(base, variants[variant], fullWidth && 'w-full', className ?? '')}
      {...props}
    />
  )
}
