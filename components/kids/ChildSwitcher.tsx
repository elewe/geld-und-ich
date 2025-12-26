// INDEX: components/kids/ChildSwitcher.tsx
'use client'

import { ChildAvatar } from './ChildAvatar'

type Child = {
  id: string
  name: string | null
  age?: number | null
  avatar_mode?: 'emoji' | 'image' | null
  avatar_emoji?: string | null
  avatar_image_url?: string | null
  accent_color?: string | null
}

type Props = {
  childrenList: Child[]
  activeChildId: string | null
  onSelect: (id: string) => void
}

export function ChildSwitcher({ childrenList, activeChildId, onSelect }: Props) {
  return (
    <div className="space-y-2">
      {childrenList.map((child) => {
        const active = child.id === activeChildId
        return (
          <button
            key={child.id}
            type="button"
            onClick={() => onSelect(child.id)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
              active ? 'border-slate-900 bg-slate-100' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ChildAvatar
              name={child.name ?? 'Kind'}
              avatar_mode={child.avatar_mode ?? 'emoji'}
              avatar_emoji={child.avatar_emoji ?? '🧒'}
              avatar_image_url={child.avatar_image_url ?? undefined}
              accent_color={child.accent_color ?? 'slate'}
              size="sm"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900">{child.name ?? 'Kind'}</span>
              {child.age ? <span className="text-xs text-slate-600">Alter {child.age}</span> : null}
            </div>
            <span className="ml-auto text-sm text-slate-500">{active ? 'Aktiv' : ''}</span>
          </button>
        )
      })}
    </div>
  )
}
