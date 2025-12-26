// INDEX: components/ui/StepDots.tsx
'use client'

type Props = {
  current: number
  total: number
}

export function StepDots({ current, total }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span className="font-semibold">
        Schritt {current} / {total}
      </span>
      <div className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, idx) => {
          const active = idx + 1 === current
          return (
            <span
              key={idx}
              className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-slate-900' : 'bg-slate-300'}`}
            />
          )
        })}
      </div>
    </div>
  )
}
