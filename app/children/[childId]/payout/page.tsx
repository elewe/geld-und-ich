// INDEX: app/children/[childId]/payout/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/supabase/client'
import { formatCHF } from '@/components/money/format'

type ChildRow = {
  id: string
  name: string | null
  age: number | null
  weekly_amount: number | null
  user_id: string
  donate_enabled?: boolean | null
}

type BalanceRow = {
  spend_cents: number | null
  save_cents: number | null
  invest_cents: number | null
  donate_cents: number | null
}

const STEP = 0.1

function toCents(value: number) {
  return Math.round(value * 100)
}

function formatAmount(value: number) {
  return value.toFixed(2)
}

function clampAmount(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0
  return Math.max(0, Math.round(value * 100) / 100)
}

export default function PayoutPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const params = useParams<{ childId: string }>()
  const router = useRouter()
  const childId = params?.childId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [child, setChild] = useState<ChildRow | null>(null)

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [spend, setSpend] = useState(0)
  const [save, setSave] = useState(0)
  const [invest, setInvest] = useState(0)
  const [donate, setDonate] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!childId) {
        setError('Keine Kind-ID gefunden.')
        setLoading(false)
        return
      }

      setError(null)
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
        .select('id, name, age, weekly_amount, user_id, donate_enabled')
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

      setChild(childData as ChildRow)

      const defaultSpend = clampAmount(childData.weekly_amount ?? 0)
      setSpend(defaultSpend)
      setSave(0)
      setInvest(0)
      setDonate(0)
      setLoading(false)
    }

    load()
  }, [childId, router, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!childId || !child) {
      setError('Keine Kind-ID gefunden.')
      return
    }

    const showDonate = (child.age ?? 0) >= 7 || Boolean(child.donate_enabled)
    const spendCents = toCents(spend)
    const saveCents = toCents(save)
    const investCents = toCents(invest)
    const donateCents = showDonate ? toCents(donate) : 0
    const totalCents = spendCents + saveCents + investCents + donateCents

    if (totalCents <= 0) {
      setError('Gesamtbetrag muss > 0 sein.')
      return
    }

    setSaving(true)

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) {
      setError(userError.message)
      setSaving(false)
      return
    }

    const user = userData.user
    if (!user) {
      router.replace('/login')
      setSaving(false)
      return
    }

    const { error: allowanceError } = await supabase.from('transactions').insert({
      child_id: childId,
      user_id: user.id,
      type: 'weekly_allowance',
      pot: 'spend',
      amount_cents: totalCents,
      occurred_on: date,
      meta: { unallocated: true },
    })

    if (allowanceError) {
      setError(allowanceError.message)
      setSaving(false)
      return
    }

    const allocationRows = [
      spendCents > 0
        ? {
            child_id: childId,
            user_id: user.id,
            type: 'allocation',
            pot: 'spend',
            amount_cents: spendCents,
            occurred_on: date,
            meta: { source: 'weekly_allowance' },
          }
        : null,
      saveCents > 0
        ? {
            child_id: childId,
            user_id: user.id,
            type: 'allocation',
            pot: 'save',
            amount_cents: saveCents,
            occurred_on: date,
            meta: { source: 'weekly_allowance' },
          }
        : null,
      investCents > 0
        ? {
            child_id: childId,
            user_id: user.id,
            type: 'allocation',
            pot: 'invest',
            amount_cents: investCents,
            occurred_on: date,
            meta: { source: 'weekly_allowance' },
          }
        : null,
      donateCents > 0
        ? {
            child_id: childId,
            user_id: user.id,
            type: 'allocation',
            pot: 'donate',
            amount_cents: donateCents,
            occurred_on: date,
            meta: { source: 'weekly_allowance' },
          }
        : null,
    ].filter(Boolean) as {
      child_id: string
      user_id: string
      type: string
      pot: 'spend' | 'save' | 'invest' | 'donate'
      amount_cents: number
      occurred_on: string
      meta: { source: string }
    }[]

    if (allocationRows.length > 0) {
      const { error: allocationError } = await supabase
        .from('transactions')
        .insert(allocationRows)

      if (allocationError) {
        setError(allocationError.message)
        setSaving(false)
        return
      }
    }

    const { data: currentBalance } = await supabase
      .from('balances')
      .select('spend_cents, save_cents, invest_cents, donate_cents')
      .eq('child_id', childId)
      .single()

    const nextBalance = (currentBalance ?? {
      spend_cents: 0,
      save_cents: 0,
      invest_cents: 0,
      donate_cents: 0,
    }) as BalanceRow

    const { error: balanceUpdateError } = await supabase
      .from('balances')
      .upsert(
        {
          child_id: childId,
          user_id: user.id,
          spend_cents: (nextBalance.spend_cents ?? 0) + spendCents,
          save_cents: (nextBalance.save_cents ?? 0) + saveCents,
          invest_cents: (nextBalance.invest_cents ?? 0) + investCents,
          donate_cents: (nextBalance.donate_cents ?? 0) + donateCents,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'child_id' }
      )

    if (balanceUpdateError) {
      setError(balanceUpdateError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    router.replace(`/children/${childId}`)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#fff5f0] via-[#f0f8ff] to-[#f5fff5]">
        <div className="mx-auto w-full max-w-2xl px-6 pb-6 pt-24 space-y-6">
          <div className="h-16 rounded-[24px] bg-white/80 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] backdrop-blur" />
          <div className="h-[760px] rounded-[24px] bg-white/80 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.08)] animate-pulse" />
        </div>
      </main>
    )
  }

  if (!child) return null

  const showDonate = (child.age ?? 0) >= 7 || Boolean(child.donate_enabled)
  const total = spend + save + invest + (showDonate ? donate : 0)

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fff5f0] via-[#f0f8ff] to-[#f5fff5] text-[#0a0a0a]">
      <header className="sticky top-0 z-10 bg-white/80 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur">
        <div className="relative mx-auto flex min-h-[72px] w-full max-w-2xl items-center justify-center px-6">
          <Link
            href={`/children/${child.id}`}
            className="absolute left-6 flex size-10 items-center justify-center rounded-full bg-[#f0e8f8] text-[#7b6b8f]"
            aria-label="Zurück"
          >
            <ArrowLeftIcon className="size-5" />
          </Link>
          <div className="flex items-center gap-[7.991px] text-[#5a4a6a]">
            <span className="text-[24px] leading-[32px] tracking-[0.0703px]">💰</span>
            <span className="text-[20px] font-semibold leading-[28px] tracking-[-0.4492px]">
              Geld hinzufügen
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 pb-6 pt-6">
        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] bg-white/90 px-[31.99px] pb-[31.99px] pt-[31.99px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
        >
          <div className="flex flex-col items-center gap-[15.991px] text-center">
            <div className="text-[60px] leading-[60px] tracking-[0.2637px]">💵</div>
            <div>
              <p className="text-[24px] font-semibold leading-[32px] tracking-[0.0703px] text-[#5a4a6a]">
                Geld auf die Töpfe verteilen
              </p>
              <p className="text-[16px] leading-[24px] tracking-[-0.3125px] text-[#9b8bab]">
                Trage die Beträge für jeden Topf ein
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-[15.991px] rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              ❌ {error}
            </div>
          )}

          <div className="mt-[23.992px] space-y-[23.992px]">
            <div className="space-y-[7.991px]">
              <label className="text-[14px] font-semibold leading-[20px] tracking-[-0.1504px] text-[#5a4a6a]">
                Datum
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-[15.99px] top-1/2 size-[19.996px] -translate-y-1/2 text-[#9b8bab]" />
                <input
                  type="date"
                  className="w-full rounded-[16px] bg-gradient-to-b from-[#f8f4fc] to-[#f4f8fc] py-[16px] pl-[46px] pr-[16px] text-[16px] text-[#5a4a6a]"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <p className="text-[12px] leading-[16px] text-[#9b8bab]">
                Falls du das Taschengeld nachträglich einträgst
              </p>
            </div>

            <div className="rounded-[16px] bg-gradient-to-b from-[#fff5f0] to-[#f5fff5] px-[15.991px] pb-0 pt-[15.991px] text-center text-[12px] leading-[16px] text-[#7b6b8f]">
              💡 Empfehlung: Jedes Mal etwas sparen & investieren!
            </div>

            <PotInputRow
              label="Ausgeben"
              emoji="💰"
              value={spend}
              onChange={setSpend}
              minusColor="bg-[#ffb4a2]"
              plusColor="bg-[#ffb4a2]"
              inputGradient="from-[#ffe5dd] to-[#ffd4c8]"
              labelColor="text-[#c65d3b]"
              valueColor="text-[rgba(198,93,59,0.6)]"
            />

            <PotInputRow
              label="Sparen"
              emoji="🏦"
              value={save}
              onChange={setSave}
              minusColor="bg-[#a8d5e2]"
              plusColor="bg-[#a8d5e2]"
              inputGradient="from-[#d4e9f7] to-[#c4e0f0]"
              labelColor="text-[#3b6d9b]"
              valueColor="text-[rgba(59,109,155,0.6)]"
            />

            <PotInputRow
              label="Investieren"
              emoji="🌱"
              value={invest}
              onChange={setInvest}
              minusColor="bg-[#b8e6b8]"
              plusColor="bg-[#b8e6b8]"
              inputGradient="from-[#d8f3d8] to-[#c8ebc8]"
              labelColor="text-[#4a8f4a]"
              valueColor="text-[rgba(74,143,74,0.6)]"
            />

            {showDonate && (
              <PotInputRow
                label="Spenden"
                emoji="💝"
                value={donate}
                onChange={setDonate}
                minusColor="bg-[#e0b0d5]"
                plusColor="bg-[#e0b0d5]"
                inputGradient="from-[#ffe5f0] to-[#f5e5ff]"
                labelColor="text-[#9b6bab]"
                valueColor="text-[rgba(155,107,171,0.6)]"
              />
            )}

            <div className="rounded-[16px] border-[1.76px] border-[#d0c0e0] bg-gradient-to-b from-[#f8f4fc] to-[#f4f8fc] px-[17.751px] pb-[1.76px] pt-[17.751px]">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold leading-[20px] tracking-[-0.1504px] text-[#7b6b8f]">
                  Gesamtbetrag:
                </span>
                <span className="text-[24px] font-bold leading-[32px] tracking-[0.0703px] text-[#5a4a6a]">
                  {formatCHF(toCents(total))}
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-[23.992px] flex h-[67.989px] w-full items-center justify-center rounded-[16px] bg-gradient-to-b from-[#a8d5e2] to-[#b8e6b8] text-[18px] font-semibold leading-[28px] tracking-[-0.4395px] text-[#2a5a5a] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
          >
            {saving ? 'Speichere…' : 'Bestätigen'}
          </button>
        </form>
      </div>
    </main>
  )
}

type PotInputRowProps = {
  label: string
  emoji: string
  value: number
  onChange: (value: number) => void
  minusColor: string
  plusColor: string
  inputGradient: string
  labelColor: string
  valueColor: string
}

function PotInputRow({
  label,
  emoji,
  value,
  onChange,
  minusColor,
  plusColor,
  inputGradient,
  labelColor,
  valueColor,
}: PotInputRowProps) {
  const decrement = () => onChange(clampAmount(value - STEP))
  const increment = () => onChange(clampAmount(value + STEP))

  return (
    <div className="space-y-[7.991px]">
      <div className="flex items-center gap-[7.991px]">
        <span className={`text-[20px] font-semibold leading-[28px] tracking-[-0.4492px] ${labelColor}`}>
          {emoji}
        </span>
        <span className={`text-[14px] font-semibold leading-[20px] tracking-[-0.1504px] ${labelColor}`}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-[7.991px]">
        <button
          type="button"
          onClick={decrement}
          className={`flex size-[55.993px] items-center justify-center rounded-[16px] ${minusColor} text-white shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]`}
          aria-label={`${label} reduzieren`}
        >
          <span className="text-[24px] font-semibold">−</span>
        </button>

        <div
          className={`relative flex h-[59.97px] flex-1 items-center rounded-[16px] bg-gradient-to-b ${inputGradient} px-[20px] pl-[56px] pr-[20px] text-[20px] font-bold tracking-[-0.4492px]`}
        >
          <span className="absolute left-[15.99px] text-[18px] font-bold leading-[28px] text-[#7b6b8f]">
            CHF
          </span>
          <input
            type="number"
            min={0}
            step={STEP}
            value={Number.isNaN(value) ? '' : formatAmount(value)}
            onChange={(e) => onChange(clampAmount(Number(e.target.value)))}
            className={`w-full bg-transparent text-[20px] font-bold leading-[normal] ${valueColor} outline-none`}
          />
        </div>

        <button
          type="button"
          onClick={increment}
          className={`flex size-[55.993px] items-center justify-center rounded-[16px] ${plusColor} text-white shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]`}
          aria-label={`${label} erhöhen`}
        >
          <span className="text-[24px] font-semibold">+</span>
        </button>
      </div>
    </div>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.2 3v3M13.8 3v3M3 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
