// INDEX: components/dashboard/PotCard.tsx
'use client'

import { ReactNode } from 'react'
import { potTokens, PotVariant, uiTokens } from '@/lib/ui-tokens'

type Props = {
  title: string
  emoji?: string
  amountCHF: string
  subtitle?: string
  variant: PotVariant
  rightSlot?: ReactNode
}

export function PotCard({ title, emoji, amountCHF, subtitle, variant, rightSlot }: Props) {
  const token = potTokens[variant]

  return (
    <div
      className={`relative overflow-hidden ${uiTokens.radius} border ${token.border} ${token.surface} ${token.halo} px-4 py-4 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
            <span className="text-lg">{emoji ?? token.emoji}</span>
            <span>{title}</span>
          </div>
          <div className={`text-3xl font-bold leading-tight ${token.text}`}>{amountCHF}</div>
          {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
    </div>
  )
}
