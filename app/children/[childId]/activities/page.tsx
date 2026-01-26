'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/supabase/client'
import { ActivityHistory } from '@/app/components/activity-history'

type Child = {
  id: string
  name: string | null
  user_id: string
  avatar_emoji: string | null
}

type Tx = {
  type: string
  pot: string | null
  amount_cents: number
  occurred_on: string
  note: string | null
}

type Activity = {
  id: string
  date: string
  pot: 'spend' | 'save' | 'invest' | 'donate'
  action: string
  amount: number
}

const potKeys = new Set(['spend', 'save', 'invest', 'donate'])

const actionMap: Record<string, string> = {
  allocation: 'Geld hinzugefügt',
  payout: 'Geld hinzugefügt',
  spend: 'Ausgabe',
  expense: 'Ausgabe',
  invest_transfer: 'Geld investiert',
  interest: 'Zins erhalten',
  donation: 'Spende',
}

function toPot(pot: string | null, type: string): Activity['pot'] {
  if (pot && potKeys.has(pot)) return pot as Activity['pot']
  if (type === 'interest' || type === 'invest_transfer') return 'invest'
  return 'save'
}

function toAmount(type: string, amountCents: number): number {
  const base = (amountCents ?? 0) / 100
  if (base < 0) return base
  const negativeTypes = new Set(['expense', 'spend', 'withdrawal'])
  return negativeTypes.has(type) ? -base : base
}

export default function ActivitiesPage() {
  const params = useParams<{ childId: string }>()
  const childId = params?.childId
  const router = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])

  const [child, setChild] = useState<Child | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!childId) return
    setLoading(true)
    setError(null)

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
      .select('id, name, user_id, avatar_emoji')
      .eq('id', childId)
      .single()

    if (childError || !childData || childData.user_id !== user.id) {
      setError(childError?.message ?? 'Kind nicht gefunden.')
      setLoading(false)
      return
    }
    setChild(childData as Child)

  const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('type, pot, amount_cents, occurred_on, note')
      .eq('child_id', childId)
      .order('occurred_on', { ascending: false })

    if (txError) {
      setError(txError.message)
      setLoading(false)
      return
    }

    const mapped = (txData ?? []).map((tx, index) => ({
      id: `${childId}-${index}-${tx.occurred_on}`,
      date: new Date(tx.occurred_on).toLocaleDateString('de-CH'),
      pot: toPot(tx.pot, tx.type),
      action: tx.note || actionMap[tx.type] || 'Aktivität',
      amount: toAmount(tx.type, tx.amount_cents),
    }))

    setActivities(mapped as Activity[])
    setLoading(false)
  }, [childId, router, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#FFF9F0] via-[#F5F0FF] to-[#F0F9FF]">
        <div className="mx-auto max-w-2xl p-6 space-y-4">
          <div className="h-[72px] rounded-[24px] bg-white/80 shadow-sm backdrop-blur" />
          <div className="h-12 rounded-[16px] bg-white/80 shadow-sm" />
          <div className="space-y-3">
            <div className="h-20 rounded-[16px] bg-white/80 shadow-sm animate-pulse" />
            <div className="h-20 rounded-[16px] bg-white/80 shadow-sm animate-pulse" />
            <div className="h-20 rounded-[16px] bg-white/80 shadow-sm animate-pulse" />
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#FFF9F0] via-[#F5F0FF] to-[#F0F9FF]">
        <div className="mx-auto max-w-2xl p-6">
          <div className="rounded-2xl border border-red-200 bg-white/90 p-4 text-sm text-red-700 shadow-sm">
            ❌ {error}
          </div>
        </div>
      </main>
    )
  }

  if (!child) return null

  return (
    <ActivityHistory
      childName={child.name?.trim() || 'Kind'}
      childEmoji={child.avatar_emoji ?? '🧒'}
      activities={activities}
      onBack={() => router.push(`/children/${childId}`)}
    />
  )
}
