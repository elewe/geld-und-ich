// INDEX: lib/ui.ts
export function formatCHF(cents: number | null | undefined) {
  const safe = typeof cents === 'number' && !Number.isNaN(cents) ? cents : 0
  return `CHF ${(safe / 100).toFixed(2)}`
}

export function potMeta(pot: string) {
  switch (pot) {
    case 'spend':
      return { emoji: '🧸', label: 'Ausgeben', classes: 'bg-amber-50 border-amber-200 text-amber-900' }
    case 'save':
      return { emoji: '🐷', label: 'Sparen', classes: 'bg-emerald-50 border-emerald-200 text-emerald-900' }
    case 'invest':
      return { emoji: '🚀', label: 'Investieren', classes: 'bg-sky-50 border-sky-200 text-sky-900' }
    default:
      return { emoji: '💰', label: pot, classes: 'bg-slate-50 border-slate-200 text-slate-900' }
  }
}
