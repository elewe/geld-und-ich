// INDEX: components/dashboard/MonthlyDonut.tsx
'use client'

import { Cell, Label, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { potTokens, PotVariant, uiTokens } from '@/lib/ui-tokens'
import { formatCHF } from '@/lib/ui'

type Slice = { pot: PotVariant; amount: number }

type Props = {
  data: Slice[]
  monthLabel: string
  isLoading?: boolean
}

export function MonthlyDonut({ data, monthLabel, isLoading }: Props) {
  const total = data.reduce((acc, item) => acc + item.amount, 0)
  const safeData = data.filter((item) => item.amount > 0)

  return (
    <div className={`${uiTokens.card} ${uiTokens.radius} ${uiTokens.padding} ${uiTokens.gap}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Dieser Monat</p>
          <p className="text-lg font-semibold text-slate-900">{monthLabel}</p>
        </div>
        <span className="text-sm text-slate-500">Topf-Verteilung</span>
      </div>

      {isLoading ? (
        <div className="animate-pulse rounded-2xl bg-slate-100/80 px-4 py-12 text-center text-slate-500">
          Lädt Diagramm…
        </div>
      ) : total <= 0 || safeData.length === 0 ? (
        <EmptyMessage />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<TooltipContent />} />
                <Pie
                  data={safeData}
                  dataKey="amount"
                  nameKey="pot"
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={3}
                  stroke="none"
                >
                  <Label content={<CenterLabel total={total} />} position="center" />
                  {safeData.map((entry) => (
                    <Cell key={entry.pot} fill={resolveColor(entry.pot)} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {safeData.map((item) => {
              const token = potTokens[item.pot]
              const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0
              return (
                <div
                  key={item.pot}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{token.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{token.label}</p>
                      <p className="text-xs text-slate-500">{pct}%</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${token.text}`}>{formatCHF(item.amount)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function CenterLabel({ total }: { total: number }) {
  return (
    <g>
      <text x="50%" y="46%" textAnchor="middle" className="fill-slate-500 text-xs font-semibold">
        Gesamt
      </text>
      <text x="50%" y="58%" textAnchor="middle" className="fill-slate-900 text-lg font-bold">
        {formatCHF(total)}
      </text>
    </g>
  )
}

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const entry = payload[0]?.payload as Slice | undefined
  if (!entry) return null
  const token = potTokens[entry.pot]
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">
        {token.emoji} {token.label}
      </p>
      <p className="text-xs text-slate-600">{formatCHF(entry.amount)}</p>
    </div>
  )
}

function EmptyMessage() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-slate-500">
      <p className="text-2xl">🪙</p>
      <p className="font-semibold text-slate-800">Keine Bewegungen für diesen Monat</p>
      <p className="text-sm text-slate-600">Sobald du eine Auszahlung oder Zuweisung erfasst, siehst du hier die Töpfe.</p>
    </div>
  )
}

function resolveColor(pot: PotVariant) {
  switch (pot) {
    case 'spend':
      return '#f59e0b'
    case 'save':
      return '#10b981'
    case 'invest':
      return '#0ea5e9'
    default:
      return '#475569'
  }
}
