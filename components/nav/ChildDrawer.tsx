// INDEX: components/nav/ChildDrawer.tsx
'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChildAvatar } from '@/components/kids/ChildAvatar'
import { uiTokens } from '@/lib/ui-tokens'

type Child = {
  id: string
  name: string | null
  age: number | null
  weekly_amount?: number | null
  avatar_mode?: 'emoji' | 'image' | null
  avatar_emoji?: string | null
  avatar_image_url?: string | null
  accent_color?: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  childrenList: Child[]
  activeChildId?: string | null
}

export function ChildDrawer({ open, onClose, childrenList, activeChildId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleSelect = (id: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('child', id)
    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="h-full w-[76%] max-w-sm bg-white shadow-xl ring-1 ring-slate-200">
        <div className={`flex items-center justify-between px-4 py-4 border-b border-slate-100 ${uiTokens.radius}`}>
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Kinder</p>
            <p className="text-lg font-semibold text-slate-900">Auswahl</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Schließen
          </button>
        </div>
        <div className="max-h-[calc(100vh-140px)] overflow-y-auto p-3 space-y-2">
          {childrenList.map((child) => {
            const isActive = child.id === activeChildId
            return (
              <button
                key={child.id}
                onClick={() => handleSelect(child.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                  isActive ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                }`}
              >
                <ChildAvatar
                  name={child.name ?? 'Kind'}
                  avatar_mode={child.avatar_mode}
                  avatar_emoji={child.avatar_emoji}
                  avatar_image_url={child.avatar_image_url ?? undefined}
                  accent_color={child.accent_color}
                  size="md"
                />
                <div className="flex-1">
                  <p className="font-semibold">{child.name ?? 'Kind'}</p>
                  <p className={`text-xs ${isActive ? 'text-slate-200' : 'text-slate-600'}`}>
                    {child.age ? `${child.age} Jahre` : 'Alter unbekannt'}
                  </p>
                </div>
                {isActive ? <span className="text-sm">Aktiv</span> : null}
              </button>
            )
          })}
        </div>
        <div className="border-t border-slate-100 p-4">
          <Link
            href="/children/create"
            className="block w-full rounded-xl border border-dashed border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            + Kind anlegen
          </Link>
        </div>
      </div>
      <button className="h-full flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-label="Schließen" />
    </div>
  )
}
