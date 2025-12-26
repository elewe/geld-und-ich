// INDEX: app/dashboard/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/browser'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Drawer } from '@/components/ui/Drawer'
import { Accordion } from '@/components/ui/Accordion'
import { Progress } from '@/components/ui/Progress'
import { PotCard } from '@/components/money/PotCard'
import { ChildAvatar } from '@/components/kids/ChildAvatar'
import { ChildSwitcher } from '@/components/kids/ChildSwitcher'
import { formatCHF } from '@/components/money/format'
import { computeMonthStats, computeSixMonthTrend, endOfPreviousMonth, startOfMonth, startOfPreviousMonth } from '@/lib/stats'

type Child = {
  id: string
  name: string | null
  age: number | null
  weekly_amount: number | null
  created_at: string | null
  avatar_mode?: 'emoji' | 'image' | null
  avatar_emoji?: string | null
  avatar_image_url?: string | null
  accent_color?: string | null
}

type Balance = {
  child_id: string
  spend_cents: number
  save_cents: number
  invest_cents: number
  last_interest_on?: string | null
}

type Settings = {
  child_id: string
  user_id: string
  payout_weekday: number
  interest_apr_bp: number
  invest_threshold_cents: number
}

type Tx = {
  id: string
  type: string
  pot: string
  amount_cents: number
  occurred_on: string
  meta: Record<string, any> | null
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [activeChildId, setActiveChildId] = useState<string | null>(null)
  const [activeChild, setActiveChild] = useState<Child | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [transactions, setTransactions] = useState<Tx[]>([])
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loadingChildData, setLoadingChildData] = useState(false)
  const [interestLoading, setInterestLoading] = useState(false)
  const [interestMessage, setInterestMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const run = async () => {
      setError(null)
      setLoading(true)

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (!active) return

      if (userError) {
        setError(userError.message)
        setLoading(false)
        return
      }

      const user = userData.user
      if (!user) {
        router.replace('/login')
        return
      }

      setEmail(user.email ?? null)

      const { data, error: childrenError } = await supabase
        .from('children')
        .select('id, name, age, weekly_amount, created_at, avatar_mode, avatar_emoji, avatar_image_url, accent_color')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (!active) return

      if (childrenError) {
        setError(childrenError.message)
        setChildren([])
        setLoading(false)
        return
      }

      const list = (data ?? []) as Child[]
      setChildren(list)

      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('kidsmoney:selectedChildId') : null
      const validStored = stored && list.find((c) => c.id === stored)
      const nextActive = validStored ? stored : list[0]?.id ?? null
      setActiveChildId(nextActive)

      setLoading(false)
    }

    run()

    return () => {
      active = false
    }
  }, [router, supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function handleInterest() {
    if (!activeChildId || !activeChild) return
    setInterestMessage(null)
    setError(null)
    setInterestLoading(true)

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) {
      setError(userError.message)
      setInterestLoading(false)
      return
    }

    const user = userData.user
    if (!user) {
      router.replace('/login')
      setInterestLoading(false)
      return
    }

    if (!balance || !settings) {
      setError('Daten fehlen für Zinsen.')
      setInterestLoading(false)
      return
    }

    const baseDate = balance.last_interest_on ?? activeChild.created_at
    if (!baseDate) {
      setError('Kein Basisdatum für Zinsen.')
      setInterestLoading(false)
      return
    }

    const diffDays = Math.floor(
      (Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) -
        Date.UTC(new Date(baseDate).getFullYear(), new Date(baseDate).getMonth(), new Date(baseDate).getDate())) /
        (1000 * 60 * 60 * 24)
    )

    if (diffDays <= 0) {
      setInterestMessage('Keine Zinsen fällig.')
      setInterestLoading(false)
      return
    }

    const aprBp = settings.interest_apr_bp ?? 200
    const ratePerDay = aprBp / 10000 / 365
    const interestCents = Math.floor((balance.save_cents || 0) * ratePerDay * diffDays)

    if (interestCents <= 0) {
      setInterestMessage('Kein Zuwachs berechnet.')
      setInterestLoading(false)
      return
    }

    const todayIso = new Date().toISOString().slice(0, 10)

    const { error: txError } = await supabase.from('transactions').insert({
      child_id: activeChildId,
      user_id: user.id,
      type: 'interest',
      pot: 'save',
      amount_cents: interestCents,
      occurred_on: todayIso,
      meta: { days: diffDays, apr_bp: aprBp },
    })

    if (txError) {
      setError(txError.message)
      setInterestLoading(false)
      return
    }

    const { error: balanceError } = await supabase
      .from('balances')
      .update({
        save_cents: (balance.save_cents || 0) + interestCents,
        last_interest_on: todayIso,
      })
      .eq('child_id', activeChildId)
      .eq('user_id', user.id)

    if (balanceError) {
      setError(balanceError.message)
      setInterestLoading(false)
      return
    }

    setBalance((prev) =>
      prev
        ? { ...prev, save_cents: (prev.save_cents || 0) + interestCents, last_interest_on: todayIso }
        : prev
    )
    setInterestMessage(`Zinsen gutgeschrieben: ${formatCHF(interestCents)}`)
    setInterestLoading(false)
  }

  useEffect(() => {
    let active = true
    const fetchChildData = async () => {
      if (!activeChildId) {
        setActiveChild(null)
        setBalance(null)
        setSettings(null)
        setTransactions([])
        return
      }

      setLoadingChildData(true)
      setError(null)
      setInterestMessage(null)

      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!active || !user) return

      const { data: childData, error: childError } = await supabase
        .from('children')
        .select('id, name, age, weekly_amount, created_at, avatar_mode, avatar_emoji, avatar_image_url, accent_color')
        .eq('id', activeChildId)
        .eq('user_id', user.id)
        .single()

      if (childError) {
        if (active) {
          setError(childError.message)
          setLoadingChildData(false)
        }
        return
      }

      if (!active) return
      setActiveChild(childData as Child)

      const { data: balanceData } = await supabase
        .from('balances')
        .select('child_id, spend_cents, save_cents, invest_cents, last_interest_on')
        .eq('child_id', activeChildId)
        .single()

      if (!active) return
      setBalance((balanceData as Balance) ?? null)

      const { data: settingsData } = await supabase
        .from('settings')
        .select('child_id, user_id, payout_weekday, interest_apr_bp, invest_threshold_cents')
        .eq('child_id', activeChildId)
        .single()

      if (!active) return
      setSettings((settingsData as Settings) ?? null)

      const { data: txData } = await supabase
        .from('transactions')
        .select('id, type, pot, amount_cents, occurred_on, meta')
        .eq('child_id', activeChildId)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200)

      if (active) {
        setTransactions((txData ?? []) as Tx[])
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('kidsmoney:selectedChildId', activeChildId)
        }
        setLoadingChildData(false)
      }
    }

    fetchChildData()

    return () => {
      active = false
    }
  }, [activeChildId, supabase])

  const today = new Date()
  const currentStart = startOfMonth(today)
  const prevStart = startOfPreviousMonth(today)
  const prevEnd = endOfPreviousMonth(today)
  const currentStats = computeMonthStats(transactions, currentStart, today)
  const prevStats = computeMonthStats(transactions, prevStart, prevEnd)
  const trend = computeSixMonthTrend(transactions, 6)
  const maxTrendValue = trend.length ? Math.max(...trend.map((t) => t.save_alloc_cents)) : 1

  const saveDelta = currentStats.save_alloc_cents - prevStats.save_alloc_cents
  const investThreshold = settings?.invest_threshold_cents ?? 5000
  const investReady = (balance?.invest_cents ?? 0) >= investThreshold
  const investProgress = investThreshold > 0 ? Math.min((balance?.invest_cents ?? 0) / investThreshold, 1) : 0

  const formatDelta = (cents: number) => {
    const sign = cents > 0 ? '+' : cents < 0 ? '−' : ''
    const abs = Math.abs(cents)
    return `${sign}${formatCHF(abs)}`
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-xl mx-auto p-6 md:p-10">
          <p className="text-slate-500">Lade…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto p-6 md:p-10 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconButton aria-label="Kind wählen" onClick={() => setDrawerOpen(true)}>
              ☰
            </IconButton>
            {activeChild ? (
              <div className="flex items-center gap-2">
                <ChildAvatar
                  name={activeChild.name ?? 'Kind'}
                  avatar_mode={activeChild.avatar_mode ?? 'emoji'}
                  avatar_emoji={activeChild.avatar_emoji ?? '🧒'}
                  avatar_image_url={activeChild.avatar_image_url ?? undefined}
                  accent_color={activeChild.accent_color ?? 'slate'}
                  size="md"
                />
                <div>
                  <p className="text-lg font-semibold">{activeChild.name ?? 'Kind'}</p>
                  <p className="text-xs text-slate-600">
                    Alter {activeChild.age ?? '—'} • Wöchentlich {formatCHF((activeChild.weekly_amount ?? 0) * 100)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-lg font-semibold text-slate-900">Kein Kind gewählt</p>
            )}
          </div>
          <Button variant="secondary" fullWidth={false} onClick={handleLogout}>
            Logout
          </Button>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-3">
            ❌ {error}
          </div>
        )}

        {children.length === 0 ? (
          <Card className="space-y-2">
            <p className="text-slate-700">Du hast noch kein Kind angelegt.</p>
            <p className="text-slate-500 text-sm">
              Leg jetzt eins an, dann bauen wir die drei Töpfe und die Wochen-Auszahlungen.
            </p>
            <Link href="/children/create">
              <Button>Kind anlegen</Button>
            </Link>
          </Card>
        ) : (
          <>
            {loadingChildData || !activeChild ? (
              <Card>
                <p className="text-slate-500 text-sm">Lade Kinderdaten…</p>
              </Card>
            ) : (
              <>
                <div className="space-y-3">
                  <PotCard pot="spend" cents={balance?.spend_cents ?? 0} subtitle="Heute & Spass" />
                  <PotCard pot="save" cents={balance?.save_cents ?? 0} subtitle="Dein Sparschatz wächst" />
                  <PotCard
                    pot="invest"
                    cents={balance?.invest_cents ?? 0}
                    subtitle="Raketenstart bei CHF 50"
                    rightSlot={
                      <div className="flex w-28 flex-col items-end gap-1 text-right">
                        <Progress value={investProgress} className="bg-white/60" />
                        <span className="text-[11px] text-slate-600">{Math.round(investProgress * 100)}%</span>
                      </div>
                    }
                  />
                </div>

                <Card className="space-y-2">
                  <Link href={`/children/${activeChildId}/payout`}>
                    <Button>Auszahlung hinzufügen</Button>
                  </Link>
                  <Link href={`/children/${activeChildId}/extra`}>
                    <Button variant="secondary">Extra Zahlung</Button>
                  </Link>
                  <Button variant="secondary" onClick={handleInterest} disabled={interestLoading}>
                    {interestLoading ? 'Berechne Zinsen…' : 'Zinsen gutschreiben'}
                  </Button>
                  <Link href={`/children/${activeChildId}/transfer`}>
                    <Button variant="secondary" disabled={!investReady} className={!investReady ? 'opacity-60' : ''}>
                      Invest transferieren
                    </Button>
                  </Link>
                  <Link href={`/children/${activeChildId}`}>
                    <Button variant="ghost">Mehr Details</Button>
                  </Link>
                </Card>

                {interestMessage ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    {interestMessage}
                  </div>
                ) : null}

                <Accordion
                  title="Monatsvergleich"
                  rightSummary={saveDelta !== 0 ? `🐷 ${formatDelta(saveDelta)}` : '—'}
                >
                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="flex justify-between">
                      <span>🧸 Ausgeben</span>
                      <span>
                        {formatCHF(currentStats.spend_alloc_cents)} vs {formatCHF(prevStats.spend_alloc_cents)} (
                        {formatDelta(currentStats.spend_alloc_cents - prevStats.spend_alloc_cents)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>🐷 Sparen</span>
                      <span>
                        {formatCHF(currentStats.save_alloc_cents)} vs {formatCHF(prevStats.save_alloc_cents)} (
                        {formatDelta(saveDelta)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>🚀 Investieren</span>
                      <span>
                        {formatCHF(currentStats.invest_alloc_cents)} vs {formatCHF(prevStats.invest_alloc_cents)} (
                        {formatDelta(currentStats.invest_alloc_cents - prevStats.invest_alloc_cents)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>💸 Einnahmen</span>
                      <span>
                        {formatCHF(currentStats.income_cents)} vs {formatCHF(prevStats.income_cents)} (
                        {formatDelta(currentStats.income_cents - prevStats.income_cents)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>💚 Zinsen</span>
                      <span>
                        {formatCHF(currentStats.interest_cents)} vs {formatCHF(prevStats.interest_cents)} (
                        {formatDelta(currentStats.interest_cents - prevStats.interest_cents)})
                      </span>
                    </div>
                  </div>

                  {trend.length > 0 ? (
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-slate-500 mb-1">6 Monate Trend (Sparen)</p>
                      <div className="space-y-1">
                        {trend.map((row) => (
                          <div key={row.key} className="flex items-center gap-2 text-sm text-slate-700">
                            <span className="w-16 font-mono text-xs text-slate-500">{row.key}</span>
                            <div className="h-2 flex-1 rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{
                                  width: `${Math.min(100, (row.save_alloc_cents / Math.max(1, maxTrendValue)) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-slate-600">{formatCHF(row.save_alloc_cents)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Accordion>
              </>
            )}
          </>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Kind wechseln">
        <div className="space-y-3">
          <ChildSwitcher
            childrenList={children}
            activeChildId={activeChildId}
            onSelect={(id) => {
              setActiveChildId(id)
              setDrawerOpen(false)
            }}
          />
          <Link href="/children/create">
            <Button className="w-full">+ Kind anlegen</Button>
          </Link>
        </div>
      </Drawer>
    </main>
  )
}
