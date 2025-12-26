// INDEX: components/money/CentsInput.tsx
'use client'

import { useEffect, useState } from 'react'

type Props = {
  valueCents: number
  onChangeCents: (value: number) => void
  label?: string
}

export function CentsInput({ valueCents, onChangeCents, label }: Props) {
  const [input, setInput] = useState((valueCents / 100).toFixed(2))

  useEffect(() => {
    setInput((valueCents / 100).toFixed(2))
  }, [valueCents])

  function parseAndSet(val: string) {
    setInput(val)
    const normalized = val.replace(',', '.').replace(/[^0-9.]/g, '')
    const num = Number.parseFloat(normalized)
    if (Number.isFinite(num)) {
      onChangeCents(Math.round(num * 100))
    }
  }

  function handleBlur() {
    const normalized = input.replace(',', '.').replace(/[^0-9.]/g, '')
    const num = Number.parseFloat(normalized)
    const safe = Number.isFinite(num) ? num : 0
    const cents = Math.round(safe * 100)
    setInput((cents / 100).toFixed(2))
    onChangeCents(cents)
  }

  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-semibold text-slate-800">{label}</span> : null}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-inner">
        <span className="text-sm font-semibold text-slate-700">CHF</span>
        <input
          value={input}
          onChange={(e) => parseAndSet(e.target.value)}
          onBlur={handleBlur}
          inputMode="decimal"
          className="w-full bg-transparent text-lg font-semibold text-slate-900 focus:outline-none"
        />
      </div>
    </label>
  )
}
