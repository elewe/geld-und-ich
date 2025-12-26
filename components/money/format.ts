// INDEX: components/money/format.ts
'use client'

export function formatCHF(cents: number): string {
  const safe = typeof cents === 'number' && Number.isFinite(cents) ? cents : 0
  return `CHF ${(safe / 100).toFixed(2)}`
}
