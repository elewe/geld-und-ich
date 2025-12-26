// INDEX: components/money/AllocationCounter.tsx
'use client'

type Props = {
  label: string
  emoji: string
  cents: number
  onInc: () => void
  onDec: () => void
  accentClasses?: string
}

export function AllocationCounter({ label, emoji, cents, onInc, onDec, accentClasses }: Props) {
  return (
    <div className={`flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 ${accentClasses ?? ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          {emoji}
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="text-sm text-slate-600">CHF {(cents / 100).toFixed(2)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="h-10 w-10 rounded-xl border border-slate-200 text-lg font-bold text-slate-700 hover:bg-slate-100"
          onClick={onDec}
        >
          −
        </button>
        <button
          type="button"
          className="h-10 w-10 rounded-xl border border-slate-200 text-lg font-bold text-slate-700 hover:bg-slate-100"
          onClick={onInc}
        >
          +
        </button>
      </div>
    </div>
  )
}
