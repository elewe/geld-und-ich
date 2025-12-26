// INDEX: components/money/PotCard.tsx
'use client'

import { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { formatCHF } from './format'
import { getPotMeta, Pot } from './pots'

type Props = {
  pot: Pot
  cents: number
  subtitle?: string
  rightSlot?: ReactNode
}

export function PotCard({ pot, cents, subtitle, rightSlot }: Props) {
  const meta = getPotMeta(pot)

  return (
    <Card tone="plain" className={meta.accentClasses}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/70 text-2xl shadow-inner">
            <span aria-hidden>{meta.emoji}</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide">{meta.label}</p>
            <p className="text-3xl font-bold leading-tight tabular-nums">{formatCHF(cents)}</p>
            {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
          </div>
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
    </Card>
  )
}
