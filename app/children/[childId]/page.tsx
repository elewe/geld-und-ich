// INDEX: app/children/[childId]/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/supabase/browser'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { PotCard } from '@/components/money/PotCard'
import { formatCHF } from '@/components/money/format'
import { Pot, getPotMeta } from '@/components/money/pots'
import { ChildAvatar } from '@/components/kids/ChildAvatar'

type Child = {
  id: string
  name: string | null
  age: number | null
  weekly_amount: number | null
  user_id: string
  created_at: string | null
  avatar_mode: 'emoji' | 'image'
  avatar_emoji: string | null
  avatar_image_url: string | null
  accent_color: string | null
}

type Balance = {
  child_id: string
  user_id: string
  spend_cents: number
  save_cents: number
  invest_cents: number
  last_interest_on: string | null
  updated_at: string | null
}

type Settings = {
  child_id: string
  user_id: string
  payout_weekday: number
  interest_apr_bp: number
  invest_threshold_cents: number
  updated_at: string | null
}

type Transaction = {
  id: string
  type: string
  pot: string
  amount_cents: number
  occurred_on: string
  meta: Record<string, any> | null
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('de-CH')
}

function daysSince(dateString: string | null | undefined) {
  if (!dateString) return 0
  const today = new Date()
  const base = new Date(dateString)
  if (Number.isNaN(base.getTime())) return 0
  return Math.floor(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
      Date.UTC(base.getFullYear(), base.getMonth(), base.getDate())) /
      (1000 * 60 * 60 * 24)
  )
}

function formatTxType(type: string) {
  const map: Record<string, string> = {
    allocation: 'Zuweisung',
    weekly_allowance: 'Wöchentliche Auszahlung',
    interest: 'Zinsen',
    transfer: 'Transfer',
    payout: 'Auszahlung',
  }
  return map[type] ?? type
}

export default function ChildDetailPage() {
  const supabase = useMemo(() => createClient(), [])
  const params = useParams<{ childId: string }>()
  const router = useRouter()
  const childId = params?.childId

  const [child, setChild] = useState<Child | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wishes, setWishes] = useState<{ id: string; title: string; target_cents: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [interestLoading, setInterestLoading] = useState(false)
  const [interestMessage, setInterestMessage] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!childId) {
      setError('Keine Kind-ID gefunden.')
      router.replace('/dashboard')
      return
    }

    setError(null)
    setInterestMessage(null)
    setLoading(true)

    const { data: userData, error: userError } = await supabase.auth.getUser()
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

    const { data: childData, error: childError } = await supabase
      .from('children')
      .select(
        'id, name, age, weekly_amount, user_id, created_at, avatar_mode, avatar_emoji, avatar_image_url, accent_color'
      )
      .eq('id', childId)
      .single()

    if (childError || !childData) {
      setError(childError?.message ?? 'Kind nicht gefunden.')
      setLoading(false)
      return
    }

    if (childData.user_id !== user.id) {
      setError('Kein Zugriff auf dieses Kind.')
      router.replace('/dashboard')
      return
    }

    setChild(childData as Child)

    const { data: balanceData, error: balanceError } = await supabase
      .from('balances')
      .select('child_id, user_id, spend_cents, save_cents, invest_cents, last_interest_on, updated_at')
      .eq('child_id', childId)
      .single()

    if (balanceError && balanceError.code !== 'PGRST116') {
      setError(balanceError.message)
    }

    setBalance(
      (balanceData as Balance) ?? {
        child_id: childId,
        user_id: user.id,
        spend_cents: 0,
        save_cents: 0,
        invest_cents: 0,
        last_interest_on: null,
        updated_at: null,
      }
    )

    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('child_id, user_id, payout_weekday, interest_apr_bp, invest_threshold_cents, updated_at')
      .eq('child_id', childId)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
      setError(settingsError.message)
    }

    setSettings(
      (settingsData as Settings) ?? {
        child_id: childId,
        user_id: user.id,
        payout_weekday: 1,
        interest_apr_bp: 200,
        invest_threshold_cents: 5000,
        updated_at: null,
      }
    )

    const { data: txData } = await supabase
      .from('transactions')
      .select('id, type, pot, amount_cents, occurred_on, meta')
      .eq('child_id', childId)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5)

    setTransactions((txData ?? []) as Transaction[])

    const { data: wishData } = await supabase
      .from('wishes')
      .select('id, title, target_cents')
      .eq('child_id', childId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setWishes((wishData ?? []) as { id: string; title: string; target_cents: number }[])
    setLoading(false)
  }, [childId, router, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleInterest() {
    if (!childId) return
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

    const currentBalance = balance
    const currentSettings = settings
    const currentChild = child

    if (!currentBalance || !currentSettings || !currentChild) {
      setError('Daten fehlen für die Zinsberechnung.')
      setInterestLoading(false)
      return
    }

    if (currentBalance.user_id !== user.id) {
      setError('Kein Zugriff.')
      setInterestLoading(false)
      return
    }

    const baseDate = currentBalance.last_interest_on ?? currentChild.created_at
    if (!baseDate) {
      setError('Kein Basisdatum für Zinsen gefunden.')
      setInterestLoading(false)
      return
    }

    const diffDays = daysSince(baseDate)
    if (diffDays <= 0) {
      setInterestMessage('Keine Zinsen fällig (Datum unverändert).')
      setInterestLoading(false)
      return
    }

    const aprBp = currentSettings.interest_apr_bp ?? 200
    const ratePerDay = aprBp / 10000 / 365
    const interestCents = Math.floor((currentBalance.save_cents || 0) * ratePerDay * diffDays)

    if (interestCents <= 0) {
      setInterestMessage('Kein Zuwachs berechnet (Betrag zu klein).')
      setInterestLoading(false)
      return
    }

    const todayIso = new Date().toISOString().slice(0, 10)

    const { error: txError } = await supabase.from('transactions').insert({
      child_id: childId,
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
        save_cents: (currentBalance.save_cents || 0) + interestCents,
        last_interest_on: todayIso,
      })
      .eq('child_id', childId)
      .eq('user_id', user.id)

    if (balanceError) {
      setError(balanceError.message)
      setInterestLoading(false)
      return
    }

    setInterestMessage(`Zinsen gutgeschrieben: ${formatCHF(interestCents)}`)
    setInterestLoading(false)
    fetchData()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-xl mx-auto p-6 md:p-10 space-y-4">
          <p className="text-slate-500">Lade Kind…</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-xl mx-auto p-6 md:p-10 space-y-4">
          <Card>
            <p className="text-red-600">❌ {error}</p>
          </Card>
          <Link href="/dashboard" className="text-sm text-slate-600 underline">
            Zurück zum Dashboard
          </Link>
        </div>
      </main>
    )
  }

  if (!child) return null

  const investThreshold = settings?.invest_threshold_cents ?? 5000
  const investReady = (balance?.invest_cents ?? 0) >= investThreshold
  const investProgress = investThreshold > 0 ? Math.min((balance?.invest_cents ?? 0) / investThreshold, 1) : 0
  const interestDays = daysSince(balance?.last_interest_on ?? child.created_at)

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto p-6 md:p-10 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ChildAvatar
                name={child.name ?? 'Kind'}
                avatar_mode={child.avatar_mode}
                avatar_emoji={child.avatar_emoji ?? '🧒'}
                avatar_image_url={child.avatar_image_url ?? undefined}
                accent_color={child.accent_color ?? 'slate'}
                size="lg"
              />
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">{child.name ?? 'Kind'}</h1>
                <p className="text-sm text-slate-600">
                  Alter {child.age ?? '—'} • Wöchentlich {formatCHF((child.weekly_amount ?? 0) * 100)}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm text-slate-600">
              <Link href="/dashboard" className="underline">
                Dashboard
              </Link>
              <Link href={`/children/${child.id}/edit`} className="underline">
                Bearbeiten
              </Link>
            </div>
          </div>
        </header>

        <div className="space-y-3">
          <PotCard pot="spend" cents={balance?.spend_cents ?? 0} subtitle="Heute & Spass" />

          <PotCard
            pot="save"
            cents={balance?.save_cents ?? 0}
            subtitle="Dein Sparschatz wächst"
            rightSlot={interestDays > 0 ? <Badge tone="warning">Zinsen möglich</Badge> : null}
          />

          <PotCard
            pot="invest"
            cents={balance?.invest_cents ?? 0}
            subtitle="Raketenstart bei CHF 50"
            rightSlot={
              <div className="flex w-32 flex-col items-end gap-2 text-right">
                <Progress value={investProgress} className="bg-white/60" />
                <p className="text-xs text-slate-700">
                  {formatCHF(investThreshold)} Ziel • {Math.round(investProgress * 100)}%
                </p>
              </div>
            }
          />
        </div>

        {interestMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            {interestMessage}
          </div>
        )}

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Aktionen</h2>
            <p className="text-xs text-slate-500">Für Eltern & Kids</p>
          </div>
          <div className="space-y-2">
            <Link href={`/children/${child.id}/payout`}>
              <Button>Auszahlung hinzufügen</Button>
            </Link>
            <Link href={`/children/${child.id}/extra`}>
              <Button variant="secondary">Extra Geld</Button>
            </Link>
            <Button onClick={handleInterest} variant="secondary" disabled={interestLoading} className="text-left">
              {interestLoading ? 'Berechne Zinsen…' : 'Zinsen gutschreiben'}
            </Button>
            {investReady ? (
              <Link href={`/children/${child.id}/transfer`}>
                <Button variant="secondary">Invest transferieren</Button>
              </Link>
            ) : (
              <div className="space-y-1">
                <Button variant="secondary" disabled className="cursor-not-allowed opacity-70">
                  Invest transferieren
                </Button>
                <p className="text-xs text-slate-600">
                  Ab {formatCHF(investThreshold)} verfügbar. Aktuell {formatCHF(balance?.invest_cents ?? 0)}.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Letzte Bewegungen</h2>
            <span className="text-xs text-slate-500">Max. 5</span>
          </div>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500">Noch keine Transaktionen.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const meta = getPotMeta(tx.pot as Pot)
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg" aria-hidden>
                        {meta.emoji}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatTxType(tx.type)} • {meta.label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(tx.occurred_on)} {tx.meta?.reason ? `• ${tx.meta.reason}` : ''}
                        </p>
                      </div>
                    </div>
                    <p className="font-mono text-sm text-slate-900">{formatCHF(tx.amount_cents)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Ich spare für…</h2>
            <Link href={`/children/${child.id}/wishes`} className="text-sm text-slate-600 underline">
              Wünsche
            </Link>
          </div>
          {wishes.length === 0 ? (
            <p className="text-sm text-slate-600">Noch keine Wünsche.</p>
          ) : (
            <div className="space-y-2">
              {wishes.map((wish) => (
                <div key={wish.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-sm text-slate-900">{wish.title}</span>
                  <span className="text-xs text-slate-600">{formatCHF(wish.target_cents)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
