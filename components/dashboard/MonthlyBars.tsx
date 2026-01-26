// INDEX: components/dashboard/MonthlyBars.tsx
'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MonthlyBarRow } from '@/lib/dashboard-data'
import { potTokens, uiTokens } from '@/lib/ui-tokens'
import { formatCHF } from '@/lib/ui'

type Props = {
  data: MonthlyBarRow[]
  isLoading?: boolean
}

export function MonthlyBars({ data, isLoading }: Props) {
  const hasData = data.some((row) => row.total > 0)

  return (
    <div className={`${uiTokens.card} ${uiTokens.radius} ${uiTokens.padding} ${uiTokens.gap}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Verlauf</p>
          <p className="text-lg font-semibold text-slate-900">Letzte 6 Monate</p>
        </div>
        <span className="text-sm text-slate-500">CHF pro Topf</span>
      </div>

      {isLoading ? (
        <div className="animate-pulse rounded-2xl bg-slate-100/80 px-4 py-12 text-center text-slate-500">
          Lade Verlauf…
        </div>
      ) : !hasData ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-slate-500">
          <p className="text-2xl">📊</p>
          <p className="font-semibold text-slate-800">Noch keine Daten</p>
          <p className="text-sm text-slate-600">
            Sobald du Zuweisungen erfasst, bauen wir hier einen Monatsvergleich.
          </p>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} stackOffset="none" margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `CHF ${(v / 100).toFixed(0)}`}
                tick={{ fill: '#475569', fontSize: 11 }}
              />
              <Tooltip content={<BarsTooltip />} />
              <Bar dataKey="spend" stackId="pots" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              <Bar dataKey="save" stackId="pots" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="invest" stackId="pots" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

type TooltipPayload = { dataKey: string; value: number }

function BarsTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null
  const spend = payload.find((p) => p.dataKey === 'spend')?.value ?? 0
  const save = payload.find((p) => p.dataKey === 'save')?.value ?? 0
  const invest = payload.find((p) => p.dataKey === 'invest')?.value ?? 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <Row label={potTokens.spend.label} color={potTokens.spend.text} amount={spend} emoji={potTokens.spend.emoji} />
      <Row label={potTokens.save.label} color={potTokens.save.text} amount={save} emoji={potTokens.save.emoji} />
      <Row label={potTokens.invest.label} color={potTokens.invest.text} amount={invest} emoji={potTokens.invest.emoji} />
    </div>
  )
}

function Row({ label, color, amount, emoji }: { label: string; color: string; amount: number; emoji: string }) {
  return (
    <div className="flex items-center justify-between text-xs text-slate-600">
      <span className="flex items-center gap-1">
        <span>{emoji}</span>
        {label}
      </span>
      <span className={`font-semibold ${color}`}>{formatCHF(amount)}</span>
    </div>
  )
}
