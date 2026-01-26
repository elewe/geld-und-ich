// INDEX: app/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardScreen } from '@/components/dashboard/DashboardScreen'
import { ErrorState } from '@/components/dashboard/ErrorState'
import { getChildBalances, getChildrenForUser } from '@/lib/dashboard-data'
import { createServerSupabaseClient } from '@/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined }
}

export default async function HomePage({ searchParams }: PageProps) {
  await searchParams
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return <ErrorState title="Session prüfen fehlgeschlagen" message={userError.message} />
  }

  if (!user) {
    redirect('/login')
  }

  const { data: children, error: childrenError } = await getChildrenForUser(user.id)
  if (childrenError) {
    return <ErrorState title="Kinder konnten nicht geladen werden" message={childrenError} />
  }

  if (!children.length) {
    return <OnboardingEmpty />
  }

  const balancesResults = await Promise.all(children.map((child) => getChildBalances(child.id, user.id)))
  const balancesError = balancesResults.find((result) => result.error)?.error
  if (balancesError) {
    return <ErrorState title="Töpfe konnten nicht geladen werden" message={balancesError} />
  }

  return (
    <DashboardScreen
      childrenList={children.map((child, index) => ({
        child,
        balances: balancesResults[index]?.data ?? { spend: 0, save: 0, invest: 0, donate: 0 },
      }))}
    />
  )
}

function OnboardingEmpty() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fff5f0] via-[#f0f8ff] to-[#f5fff5] px-6 py-10">
      <div className="w-full max-w-2xl space-y-4 rounded-3xl border border-dashed border-white/60 bg-white/90 p-8 text-center shadow-[0_30px_120px_-80px_rgba(15,23,42,0.45)] backdrop-blur">
        <p className="text-4xl">👋</p>
        <p className="text-lg font-semibold text-[#5a4a6a]">Willkommen bei Kids Money Lab</p>
        <p className="text-sm text-[#7b6b8f]">
          Leg dein erstes Kind an, dann bauen wir Spar-, Ausgabe- und Invest-Töpfe automatisch auf.
        </p>
        <Link
          href="/children/create"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#A8D5E2] to-[#B8E6B8] px-4 py-4 text-sm font-semibold text-[#2A5A5A] shadow-sm transition hover:opacity-90"
        >
          Kind anlegen
        </Link>
      </div>
    </main>
  )
}
