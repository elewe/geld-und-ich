// INDEX: components/dashboard/DashboardScreen.tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/supabase/browser'
import { ChildDrawer } from '@/components/nav/ChildDrawer'
import { PotCard } from '@/components/dashboard/PotCard'
import { MonthlyDonut } from '@/components/dashboard/MonthlyDonut'
import { MonthlyBars } from '@/components/dashboard/MonthlyBars'
import { ChildRow, MonthlyBarRow, MonthlyPotSummary, PotTotals } from '@/lib/dashboard-data'
import { formatCHF } from '@/lib/ui'
import { uiTokens } from '@/lib/ui-tokens'

type Props = {
  childrenList: ChildRow[]
  activeChild: ChildRow
  potBalances: PotTotals
  currentMonth: MonthlyPotSummary | null
  monthlyBars: MonthlyBarRow[]
  monthLabel: string
}

export function DashboardScreen({
  childrenList,
  activeChild,
  potBalances,
  currentMonth,
  monthlyBars,
  monthLabel,
}: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const weekAmount = formatCHF(Math.round((activeChild.weekly_amount ?? 0) * 100))
  const totalPots = potBalances.spend + potBalances.save + potBalances.invest

  const potCopy: Record<'spend' | 'save' | 'invest', string> = {
    spend: 'Freizeit, Snacks & Erlebnisse',
    save: 'Langfristige Wünsche mit Ruhe',
    invest: 'Rakete aufbauen für die Zukunft',
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const monthSlices =
    currentMonth?.total && currentMonth.total > 0
      ? (['spend', 'save', 'invest'] as const).map((pot) => ({
          pot,
          amount: currentMonth[pot],
        }))
      : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6 md:max-w-3xl lg:max-w-4xl">
        <header className="sticky top-0 z-10 flex items-center justify-between rounded-full border border-slate-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            aria-label="Kind wechseln"
          >
            ☰
          </button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Aktives Kind</p>
            <p className="text-base font-semibold text-slate-900">{activeChild.name ?? 'Kind'}</p>
            <p className="text-xs text-slate-500">Wöchentlich {weekAmount}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Logout
          </button>
        </header>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Deine Töpfe</p>
              <p className="text-sm text-slate-600">{formatCHF(totalPots)}</p>
            </div>
            <Link href="/children/create" className="text-sm font-semibold text-slate-700 underline">
              + Kind
            </Link>
          </div>

          <div className="space-y-3">
            <PotCard
              title="Ausgeben"
              variant="spend"
              amountCHF={formatCHF(potBalances.spend)}
              subtitle={potCopy.spend}
            />
            <PotCard
              title="Sparen"
              variant="save"
              amountCHF={formatCHF(potBalances.save)}
              subtitle={potCopy.save}
            />
            <PotCard
              title="Investieren"
              variant="invest"
              amountCHF={formatCHF(potBalances.invest)}
              subtitle={potCopy.invest}
            />
          </div>
        </section>

        <section className="space-y-4">
          <MonthlyDonut data={monthSlices} monthLabel={monthLabel} />
          <MonthlyBars data={monthlyBars} />
        </section>

        <section className={`${uiTokens.card} ${uiTokens.radius} ${uiTokens.padding}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Nächste Schritte</p>
              <p className="text-lg font-semibold text-slate-900">Mehr Aktionen</p>
            </div>
            <span className="text-xl">✨</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Link
              href={`/children/${activeChild.id}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Kind-Details ansehen
            </Link>
            <Link
              href={`/children/${activeChild.id}/payout`}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Auszahlung hinzufügen
            </Link>
          </div>
        </section>
      </div>

      <ChildDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        childrenList={childrenList}
        activeChildId={activeChild.id}
      />
    </div>
  )
}
