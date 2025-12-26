// INDEX: components/ui/Drawer.tsx
'use client'

import { useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Drawer({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-t-2xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-base font-semibold text-slate-900">{title ?? 'Auswahl'}</p>
          <button
            onClick={onClose}
            className="text-slate-500 text-sm rounded-lg px-2 py-1 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Schließen
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
