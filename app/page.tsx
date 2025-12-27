// INDEX: app/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardScreen } from '@/components/dashboard/DashboardScreen'
import { ErrorState } from '@/components/dashboard/ErrorState'
import { getChildrenForUser, getLastNMonthsPotSums, getMonthlyPotSums, getPotBalances } from '@/lib/dashboard-data'
import { startOfMonth } from '@/lib/stats'
import { createServerSupabaseReadClient } from '@/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined }
}

export default async function HomePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const supabase = await createServerSupabaseReadClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    return <ErrorState title="Session prüfen fehlgeschlagen" message={sessionError.message} />
  }

  if (!sessionData?.session) {
    redirect('/login')
  }

  const user = sessionData.session.user
  const { data: children, error: childrenError } = await getChildrenForUser(user.id)
  if (childrenError) {
    return <ErrorState title="Kinder konnten nicht geladen werden" message={childrenError} />
  }

  if (!children.length) {
    return <OnboardingEmpty />
  }

  const requestedChild = normalizeChildParam(resolvedSearchParams?.child)
  const activeChild = children.find((child) => child.id === requestedChild) ?? children[0]

  if (!requestedChild || activeChild.id !== requestedChild) {
    const params = new URLSearchParams()
    params.set('child', activeChild.id)
    redirect(params.toString() ? `/?${params.toString()}` : '/')
  }

  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = today
  const monthLabel = new Intl.DateTimeFormat('de-CH', { month: 'long', year: 'numeric' }).format(today)

  const [balancesRes, currentMonthRes, monthlyBarsRes] = await Promise.all([
    getPotBalances(activeChild.id, user.id),
    getMonthlyPotSums(activeChild.id, monthStart, monthEnd),
    getLastNMonthsPotSums(activeChild.id, 6),
  ])

  if (balancesRes.error) {
    return <ErrorState title="Töpfe konnten nicht geladen werden" message={balancesRes.error} />
  }

  if (currentMonthRes.error) {
    return <ErrorState title="Monatsdaten fehlen" message={currentMonthRes.error} />
  }

  if (monthlyBarsRes.error) {
    return <ErrorState title="Verlauf konnte nicht geladen werden" message={monthlyBarsRes.error} />
  }

  return (
    <DashboardScreen
      childrenList={children}
      activeChild={activeChild}
      potBalances={balancesRes.data ?? { spend: 0, save: 0, invest: 0 }}
      currentMonth={currentMonthRes.data}
      monthlyBars={monthlyBarsRes.data}
      monthLabel={monthLabel}
    />
  )
}

function OnboardingEmpty() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50 px-6 py-10">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-[0_30px_120px_-80px_rgba(15,23,42,0.45)]">
        <p className="text-4xl">👋</p>
        <p className="text-lg font-semibold text-slate-900">Willkommen bei Kids Money Lab</p>
        <p className="text-sm text-slate-600">
          Leg dein erstes Kind an, dann bauen wir Spar-, Ausgabe- und Invest-Töpfe automatisch auf.
        </p>
        <Link
          href="/children/create"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90"
        >
          Kind anlegen
        </Link>
      </div>
    </main>
  )
}

function normalizeChildParam(param: string | string[] | undefined) {
  if (!param) return null
  if (Array.isArray(param)) return param[0]
  return param
}
