// INDEX: components/ui/Accordion.tsx
'use client'

import { ReactNode, useState } from 'react'

type Props = {
  title: string
  defaultOpen?: boolean
  rightSummary?: ReactNode
  children: ReactNode
}

export function Accordion({ title, defaultOpen = false, rightSummary, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">{title}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          {rightSummary ? <span>{rightSummary}</span> : null}
          <span
            className={`inline-block transition-transform ${open ? 'rotate-180' : 'rotate-0'}`}
            aria-hidden
          >
            ▾
          </span>
        </div>
      </button>
      {open ? <div className="border-t border-slate-100 px-4 py-3 space-y-3">{children}</div> : null}
    </div>
  )
}
