// INDEX: app/children/[childId]/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/supabase/client'
import { formatCHF } from '@/components/money/format'

type Child = {
  id: string
  name: string | null
  age: number | null
  weekly_amount: number | null
  user_id: string
  avatar_mode: 'emoji' | 'image'
  avatar_emoji: string | null
  donate_enabled?: boolean | null
}

type Balance = {
  child_id: string
  user_id: string
  spend_cents: number
  save_cents: number
  invest_cents: number
  donate_cents: number
}

type DonutSegment = {
  key: string
  value: number
  color: string
}

export default function ChildDetailPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const params = useParams<{ childId: string }>()
  const router = useRouter()
  const childId = params?.childId

  const [child, setChild] = useState<Child | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!childId) {
      setError('Keine Kind-ID gefunden.')
      router.replace('/dashboard')
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
      .select('id, name, age, weekly_amount, user_id, avatar_mode, avatar_emoji, donate_enabled')
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
      .select('child_id, user_id, spend_cents, save_cents, invest_cents, donate_cents')
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
        donate_cents: 0,
      }
    )

    setLoading(false)
  }, [childId, router, supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#fff9f0] via-[#f5f0ff] to-[#f0f9ff]">
        <div className="mx-auto w-full max-w-5xl px-6 pb-6 pt-24 space-y-6">
          <div className="h-16 rounded-[24px] bg-white/80 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] backdrop-blur" />
          <div className="h-[280px] rounded-[24px] bg-white/80 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.08)] animate-pulse" />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="h-[72px] rounded-[16px] bg-white/80 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.08)] animate-pulse" />
            <div className="h-[72px] rounded-[16px] bg-white/80 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.08)] animate-pulse" />
            <div className="h-[72px] rounded-[16px] bg-white/80 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.08)] animate-pulse" />
            <div className="h-[72px] rounded-[16px] bg-white/80 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.08)] animate-pulse" />
          </div>
          <div className="h-14 rounded-[16px] bg-white/80 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.08)] animate-pulse" />
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#fff9f0] via-[#f5f0ff] to-[#f0f9ff]">
        <div className="mx-auto w-full max-w-5xl px-6 pb-6 pt-24">
          <div className="rounded-[16px] border border-red-200 bg-white/90 px-4 py-3 text-sm text-red-700 shadow-[0px_4px_10px_-6px_rgba(0,0,0,0.2)]">
            ❌ {error}
          </div>
          <Link href="/dashboard" className="mt-3 inline-block text-sm text-[#7b6b8f] underline">
            Zurück zum Dashboard
          </Link>
        </div>
      </main>
    )
  }

  if (!child || !balance) return null

  const avatarEmoji = child.avatar_emoji ?? '🧒'
  const nameLabel = child.name?.trim()
  const headerTitle = nameLabel ? `${nameLabel}s Geld` : 'Dein Geld'
  const spend = balance.spend_cents ?? 0
  const save = balance.save_cents ?? 0
  const invest = balance.invest_cents ?? 0
  const donate = balance.donate_cents ?? 0
  const donateActive = (child.age ?? 0) >= 7 || Boolean(child.donate_enabled) || donate > 0
  const total = spend + save + invest + (donateActive ? donate : 0)

  const donutSegments: DonutSegment[] = [
    ...(donateActive ? [{ key: 'donate', value: donate, color: '#d8a6d9' }] : []),
    { key: 'spend', value: spend, color: '#ff9a7a' },
    { key: 'save', value: save, color: '#7fc7e6' },
    { key: 'invest', value: invest, color: '#8bd98b' },
  ].filter((segment) => segment.value > 0)

  const potRows = [
    {
      key: 'spend',
      label: 'Ausgeben',
      subtitle: 'Geld für jetzt',
      emoji: '💰',
      value: spend,
      gradient: 'from-[#ffe5dd] to-[#ffd4c8]',
      text: 'text-[#a0472a]',
      subtext: 'text-[#c65d3b]',
    },
    {
      key: 'save',
      label: 'Sparen',
      subtitle: 'Für besondere Wünsche',
      emoji: '🏦',
      value: save,
      gradient: 'from-[#d4e9f7] to-[#c4e0f0]',
      text: 'text-[#2a5580]',
      subtext: 'text-[#3b6d9b]',
    },
    {
      key: 'invest',
      label: 'Investieren',
      subtitle: 'Geld das wächst',
      emoji: '🌱',
      value: invest,
      gradient: 'from-[#d8f3d8] to-[#c8ebc8]',
      text: 'text-[#3a7a3a]',
      subtext: 'text-[#4a8f4a]',
    },
    {
      key: 'donate',
      label: 'Spenden',
      subtitle: 'Für eine gute Sache',
      emoji: '💝',
      value: donate,
      gradient: 'from-[#ffe5f0] to-[#f5e5ff]',
      text: 'text-[#8b5a9b]',
      subtext: 'text-[#9b6bab]',
      show: donateActive,
    },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fff9f0] via-[#f5f0ff] to-[#f0f9ff] text-[#0a0a0a]">
      <header className="sticky top-0 z-10 bg-white/80 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur">
        <div className="relative mx-auto flex min-h-[72px] w-full max-w-5xl items-center justify-center px-6">
          <Link
            href="/dashboard"
            className="absolute left-6 flex size-10 items-center justify-center rounded-full bg-[#f0e8f8] text-[#7b6b8f]"
            aria-label="Zurück"
          >
            <ArrowLeftIcon className="size-5" />
          </Link>
          <div className="flex items-center gap-[7.991px] text-[#5a4a6a]">
            <span className="text-[24px] leading-[32px] tracking-[0.0703px]">{avatarEmoji}</span>
            <span className="text-[20px] font-semibold leading-[28px] tracking-[-0.4492px]">
              {headerTitle}
            </span>
          </div>
          <Link
            href={`/children/${child.id}/edit`}
            className="absolute right-6 flex size-10 items-center justify-center rounded-full bg-[#f0e8f8] text-[#7b6b8f]"
            aria-label="Einstellungen"
          >
            <SettingsIcon className="size-5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-6 pt-6">
        <section className="rounded-[24px] bg-white/90 px-6 pb-6 pt-10 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] md:px-16">
          <div className="relative mx-auto size-[200px]">
            <DonutChart segments={donutSegments} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3.996px] text-center">
              <span className="text-[12px] leading-[16px] text-[#9b8bab]">Total</span>
              <span className="text-[24px] font-bold leading-[32px] tracking-[0.0703px] text-[#5a4a6a]">
                {formatCHF(total)}
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {potRows
            .filter((row) => row.show !== false)
            .map((row) => (
              <Link
                key={row.key}
                href={`/children/${child.id}/pots/${row.key}`}
                className={`flex min-h-[72px] items-center justify-between rounded-[16px] bg-gradient-to-b ${row.gradient} px-4 py-3 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[30px] leading-[36px] tracking-[0.3955px]">{row.emoji}</span>
                  <div>
                    <p className={`text-[16px] font-bold leading-[24px] tracking-[-0.3125px] ${row.text}`}>
                      {row.label}
                    </p>
                    <p className={`text-[12px] font-medium leading-[16px] ${row.subtext}`}>
                      {row.subtitle}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 ${row.text}`}>
                  <span className="text-[20px] font-bold leading-[28px] tracking-[-0.4492px]">
                    {formatPotValue(row.value)}
                  </span>
                  <span className="text-[20px] font-medium leading-[28px] tracking-[-0.4492px]">
                    →
                  </span>
                </div>
              </Link>
            ))}

          <Link
            href={`/children/${child.id}/wishes`}
            className="flex min-h-[72px] items-center justify-between rounded-[16px] bg-white/90 px-4 py-3 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-center gap-3">
              <span className="text-[30px] leading-[36px] tracking-[0.3955px]">⭐</span>
              <div>
                <p className="text-[16px] font-bold leading-[24px] tracking-[-0.3125px] text-[#5a4a6a]">
                  Meine Wünsche
                </p>
                <p className="text-[12px] font-medium leading-[16px] text-[#9b8bab]">
                  Spare für etwas Besonderes
                </p>
              </div>
            </div>
            <span className="text-[20px] font-medium leading-[28px] tracking-[-0.4492px] text-[#7b6b8f]">
              →
            </span>
          </Link>

          <Link
            href={`/children/${child.id}/activities`}
            className="flex min-h-[72px] items-center justify-between rounded-[16px] bg-white/90 px-4 py-3 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-center gap-3">
              <span className="text-[30px] leading-[36px] tracking-[0.3955px]">📋</span>
              <div>
                <p className="text-[16px] font-bold leading-[24px] tracking-[-0.3125px] text-[#5a4a6a]">
                  Aktivitäten
                </p>
                <p className="text-[12px] font-medium leading-[16px] text-[#9b8bab]">
                  Was du mit deinem Geld gemacht hast
                </p>
              </div>
            </div>
            <span className="text-[20px] font-medium leading-[28px] tracking-[-0.4492px] text-[#7b6b8f]">
              →
            </span>
          </Link>

          <Link
            href={`/children/${child.id}/payout`}
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-[16px] bg-gradient-to-b from-[#a8d5e2] to-[#b8e6b8] text-[16px] font-semibold leading-[24px] tracking-[-0.3125px] text-[#2a5a5a] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] md:col-span-2"
          >
            <PlusIcon className="size-5" />
            Geld hinzufügen
          </Link>
        </section>
      </div>
    </main>
  )
}

function formatPotValue(cents: number) {
  const safe = typeof cents === 'number' && !Number.isNaN(cents) ? cents : 0
  return (safe / 100).toFixed(2)
}

function DonutChart({ segments }: { segments: DonutSegment[] }) {
  const size = 200
  const strokeWidth = 20
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const gap = 6
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  let offset = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#f0e8f8"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {(total > 0 ? segments : []).map((segment) => {
          const length = (segment.value / total) * (circumference - gap * segments.length)
          const dashArray = `${length} ${circumference - length}`
          const dashOffset = -offset
          offset += length + gap
          return (
            <circle
              key={segment.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
            />
          )
        })}
      </g>
    </svg>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M8.3 3.2h3.4l.4 1.8 1.6.8 1.7-1 1.7 1.7-1 1.7.8 1.6 1.8.4v3.4l-1.8.4-.8 1.6 1 1.7-1.7 1.7-1.7-1-1.6.8-.4 1.8H8.3l-.4-1.8-1.6-.8-1.7 1-1.7-1.7 1-1.7-.8-1.6-1.8-.4v-3.4l1.8-.4.8-1.6-1-1.7L4.6 4.8l1.7 1 1.6-.8.4-1.8z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
