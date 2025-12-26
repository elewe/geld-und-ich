// INDEX: components/ui/Badge.tsx
'use client'

import { HTMLAttributes, ReactNode } from 'react'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

type Props = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode
  tone?: 'info' | 'success' | 'warning'
}

export function Badge({ children, tone = 'info', className, ...props }: Props) {
  const tones: Record<string, string> = {
    info: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
  }

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        tones[tone],
        className ?? ''
      )}
      {...props}
    >
      {children}
    </span>
  )
}
