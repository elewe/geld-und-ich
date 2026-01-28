'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/supabase/client'
import { PotDetail } from '@/app/components/pot-detail'

type PotKey = 'spend' | 'save' | 'invest' | 'donate'

type Child = {
  id: string
  name: string | null
  age: number | null
  user_id: string
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

const potKeys: PotKey[] = ['spend', 'save', 'invest', 'donate']

const balanceKeyMap: Record<PotKey, keyof Balance> = {
  spend: 'spend_cents',
  save: 'save_cents',
  invest: 'invest_cents',
  donate: 'donate_cents',
}

export default function PotDetailPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const router = useRouter()
  const params = useParams<{ childId: string; pot: string }>()
  const childId = params?.childId
  const potParam = params?.pot
  const pot = potKeys.includes(potParam as PotKey) ? (potParam as PotKey) : null

  const [child, setChild] = useState<Child | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!childId || !pot) {
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
      .select('id, name, age, user_id, donate_enabled')
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
  }, [childId, pot, router, supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!child || !balance || !pot || !childId) return
    const donateActive = (child.age ?? 0) >= 7 || Boolean(child.donate_enabled) || balance.donate_cents > 0
    if (pot === 'donate' && !donateActive) {
      router.replace(`/children/${childId}`)
    }
  }, [balance, child, childId, pot, router])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#FFF9F0] via-[#F5F0FF] to-[#F0F9FF]">
        <div className="mx-auto max-w-2xl p-6">
          <div className="h-16 rounded-2xl bg-white/80 shadow-sm backdrop-blur" />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="h-48 rounded-2xl bg-white/80 shadow-sm" />
            <div className="h-48 rounded-2xl bg-white/80 shadow-sm" />
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

  if (!child || !balance || !pot) return null

  const childName = child.name?.trim() || 'Dein'
  const balanceCents = Number(balance[balanceKeyMap[pot]] ?? 0)

  return (
    <PotDetail
      pot={pot}
      balance={balanceCents / 100}
      childName={childName}
      onBack={() => router.push(`/children/${childId}`)}
      onAddExpense={
        pot === 'spend' || pot === 'save' || pot === 'donate'
          ? () => router.push(`/children/${childId}/add-expense/${pot}`)
          : undefined
      }
    />
  )
}
