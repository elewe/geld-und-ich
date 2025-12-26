// INDEX: components/ui/Card.tsx
'use client'

import { HTMLAttributes, ReactNode } from 'react'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  tone?: 'default' | 'plain'
}

export function Card({ children, className, tone = 'default', ...props }: Props) {
  const base = 'rounded-2xl border shadow-sm p-5'
  const toneClass = tone === 'plain' ? '' : 'bg-white border-slate-200'

  return (
    <div
      className={cx(base, toneClass, className ?? '')}
      {...props}
    >
      {children}
    </div>
  )
}
