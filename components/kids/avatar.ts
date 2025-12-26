// INDEX: components/kids/avatar.ts
'use client'

type AccentToken = 'slate' | 'amber' | 'emerald' | 'sky' | 'violet' | 'rose' | 'orange' | 'teal'

const accentMap: Record<
  AccentToken,
  { bg: string; ring: string; dot: string; text: string }
> = {
  slate: { bg: 'bg-slate-100', ring: 'ring-slate-300', dot: 'bg-slate-500', text: 'text-slate-900' },
  amber: { bg: 'bg-amber-100', ring: 'ring-amber-300', dot: 'bg-amber-500', text: 'text-amber-900' },
  emerald: { bg: 'bg-emerald-100', ring: 'ring-emerald-300', dot: 'bg-emerald-500', text: 'text-emerald-900' },
  sky: { bg: 'bg-sky-100', ring: 'ring-sky-300', dot: 'bg-sky-500', text: 'text-sky-900' },
  violet: { bg: 'bg-violet-100', ring: 'ring-violet-300', dot: 'bg-violet-500', text: 'text-violet-900' },
  rose: { bg: 'bg-rose-100', ring: 'ring-rose-300', dot: 'bg-rose-500', text: 'text-rose-900' },
  orange: { bg: 'bg-orange-100', ring: 'ring-orange-300', dot: 'bg-orange-500', text: 'text-orange-900' },
  teal: { bg: 'bg-teal-100', ring: 'ring-teal-300', dot: 'bg-teal-500', text: 'text-teal-900' },
}

export function getAccentClasses(token?: string) {
  const safeToken = (token as AccentToken) ?? 'slate'
  return accentMap[safeToken] ?? accentMap.slate
}
