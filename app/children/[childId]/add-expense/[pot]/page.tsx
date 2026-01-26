"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/supabase/client'
import { AddExpense } from '@/app/components/add-expense'

type PotKey = 'spend' | 'save' | 'donate'

type Child = {
  id: string
  name: string | null
  user_id: string
  avatar_emoji: string | null
}

type Balance = {
  child_id: string
  user_id: string
  spend_cents: number
  save_cents: number
  donate_cents: number
}

const potKeys: PotKey[] = ['spend', 'save', 'donate']

const balanceKeyMap: Record<PotKey, keyof Balance> = {
  spend: 'spend_cents',
  save: 'save_cents',
  donate: 'donate_cents',
}

export default function AddExpensePage() {
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
      .select('id, name, user_id, avatar_emoji')
      .eq('id', childId)
      .single()

    if (childError || !childData || childData.user_id !== user.id) {
      setError(childError?.message ?? 'Kind nicht gefunden.')
      setLoading(false)
      return
    }

    setChild(childData as Child)

    const { data: balanceData } = await supabase
      .from('balances')
      .select('child_id, user_id, spend_cents, save_cents, donate_cents')
      .eq('child_id', childId)
      .single()

    setBalance(
      (balanceData as Balance) ?? {
        child_id: childId,
        user_id: user.id,
        spend_cents: 0,
        save_cents: 0,
        donate_cents: 0,
      }
    )

    setLoading(false)
  }, [childId, pot, router, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleComplete = useCallback(
    async (amount: number, description: string, date: string) => {
      if (!childId || !pot) return

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) {
        setError(userError.message)
        return
      }
      const user = userData.user
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: currentBalance } = await supabase
        .from('balances')
        .select('spend_cents, save_cents, donate_cents')
        .eq('child_id', childId)
        .single()

      const balanceRow = (currentBalance ?? {
        spend_cents: 0,
        save_cents: 0,
        donate_cents: 0,
      }) as Balance

      const amountCents = Math.round(amount * 100)
      const currentValue = Number(balanceRow[balanceKeyMap[pot]] ?? 0)
      const nextValue = Math.max(currentValue - amountCents, 0)

      const { error: txError } = await supabase.from('transactions').insert({
        child_id: childId,
        user_id: user.id,
        type: 'spend',
        pot,
        amount_cents: amountCents,
        occurred_on: date,
        note: description,
        meta: { description },
      })

      if (txError) {
        setError(txError.message)
        return
      }

      const updatePayload =
        pot === 'spend'
          ? { spend_cents: nextValue }
          : pot === 'save'
            ? { save_cents: nextValue }
            : { donate_cents: nextValue }

      const { error: balanceError } = await supabase
        .from('balances')
        .upsert(
          {
            child_id: childId,
            user_id: user.id,
            spend_cents: balanceRow.spend_cents,
            save_cents: balanceRow.save_cents,
            donate_cents: balanceRow.donate_cents,
            updated_at: new Date().toISOString(),
            ...updatePayload,
          },
          { onConflict: 'child_id' }
        )

      if (balanceError) {
        setError(balanceError.message)
        return
      }

      router.replace(`/children/${childId}/pots/${pot}`)
    },
    [childId, pot, router, supabase]
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#FFF9F0] via-[#F5F0FF] to-[#F0F9FF]">
        <div className="mx-auto w-full max-w-2xl p-6 space-y-4">
          <div className="h-[72px] rounded-[24px] bg-white/80 shadow-sm backdrop-blur" />
          <div className="h-[240px] rounded-[24px] bg-white/80 shadow-sm animate-pulse" />
          <div className="h-[480px] rounded-[24px] bg-white/80 shadow-sm animate-pulse" />
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#FFF9F0] via-[#F5F0FF] to-[#F0F9FF]">
        <div className="mx-auto w-full max-w-2xl p-6">
          <div className="rounded-2xl border border-red-200 bg-white/90 p-4 text-sm text-red-700 shadow-sm">
            ❌ {error}
          </div>
        </div>
      </main>
    )
  }

  if (!child || !balance || !pot) return null

  const potBalance = (balance[balanceKeyMap[pot]] ?? 0) / 100

  return (
    <AddExpense
      pot={pot}
      potBalance={potBalance}
      childName={child.name?.trim() || 'Kind'}
      onBack={() => router.push(`/children/${childId}/pots/${pot}`)}
      onComplete={handleComplete}
    />
  )
}
