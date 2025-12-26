// INDEX: components/ui/IconButton.tsx
'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}

export function IconButton({ children, className, ...props }: Props) {
  const base =
    'inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400'

  return (
    <button className={cx(base, className ?? '')} {...props}>
      {children}
    </button>
  )
}
