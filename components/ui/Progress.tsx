// INDEX: components/ui/Progress.tsx
'use client'

import { HTMLAttributes } from 'react'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

type Props = HTMLAttributes<HTMLDivElement> & {
  value: number
}

export function Progress({ value, className, ...props }: Props) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const trackClasses = cx('h-2 w-full overflow-hidden rounded-full', className ?? 'bg-slate-200')

  return (
    <div className={trackClasses} {...props}>
      <div
        className="h-full w-full rounded-full bg-slate-900 transition-[width] duration-300 ease-out"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  )
}
