// INDEX: lib/ui-tokens.ts

export type PotVariant = 'spend' | 'save' | 'invest'

export const potTokens: Record<
  PotVariant,
  {
    emoji: string
    label: string
    surface: string
    border: string
    text: string
    halo: string
  }
> = {
  spend: {
    emoji: '🧸',
    label: 'Ausgeben',
    surface: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    halo: 'shadow-[0_18px_40px_-28px_rgba(217,119,6,0.65)]',
  },
  save: {
    emoji: '🐷',
    label: 'Sparen',
    surface: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    halo: 'shadow-[0_18px_40px_-28px_rgba(16,185,129,0.65)]',
  },
  invest: {
    emoji: '🚀',
    label: 'Investieren',
    surface: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-900',
    halo: 'shadow-[0_18px_40px_-28px_rgba(14,165,233,0.65)]',
  },
}

export const uiTokens = {
  radius: 'rounded-2xl',
  gap: 'space-y-4',
  card: 'bg-white border border-slate-100 shadow-[0_16px_60px_-38px_rgba(15,23,42,0.35)]',
  subtleText: 'text-slate-600',
  strongText: 'text-slate-900',
  padding: 'p-5 md:p-6',
}
