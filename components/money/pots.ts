// INDEX: components/money/pots.ts
export type Pot = 'spend' | 'save' | 'invest'

export type PotMeta = {
  emoji: string
  label: string
  accentClasses: string
}

const potMetaMap: Record<Pot, PotMeta> = {
  spend: {
    emoji: '🧸',
    label: 'Ausgeben',
    accentClasses: 'bg-amber-50 border-amber-200 text-amber-900',
  },
  save: {
    emoji: '🐷',
    label: 'Sparen',
    accentClasses: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  },
  invest: {
    emoji: '🚀',
    label: 'Investieren',
    accentClasses: 'bg-sky-50 border-sky-200 text-sky-900',
  },
}

const fallback: PotMeta = {
  emoji: '💰',
  label: 'Topf',
  accentClasses: 'bg-slate-50 border-slate-200 text-slate-900',
}

export function getPotMeta(pot: Pot | string): PotMeta {
  return potMetaMap[pot as Pot] ?? fallback
}
