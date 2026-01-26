// INDEX: app/children/[childId]/wishes/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/supabase/client'
import { WishFlow } from '@/app/components/wish-flow'

type Child = {
  id: string
  name: string | null
  user_id: string
  avatar_emoji: string | null
}

type Balance = {
  child_id: string
  user_id: string
  save_cents: number
}

type WishRow = {
  id: string
  title: string
  target_cents: number
  image_url: string | null
  redeemed_at: string | null
  created_at: string | null
}

export default function WishesPage() {
  const params = useParams<{ childId: string }>()
  const childId = params?.childId
  const router = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])

  const [child, setChild] = useState<Child | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [wishes, setWishes] = useState<WishRow[]>([])
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

    const { data: balanceData } = await supabase
      .from('balances')
      .select('child_id, user_id, save_cents')
      .eq('child_id', childId)
      .single()

    setBalance(
      (balanceData as Balance) ?? {
        child_id: childId,
        user_id: user.id,
        save_cents: 0,
      }
    )

    const { data, error: wishesError } = await supabase
      .from('wishes')
      .select('id, title, target_cents, image_url, redeemed_at, created_at')
      .eq('child_id', childId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (wishesError) {
      setError(wishesError.message)
      setLoading(false)
      return
    }

    setWishes((data ?? []) as WishRow[])
    setLoading(false)
  }, [childId, router, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const mapWishRow = useCallback(
    (wish: WishRow) => ({
      id: wish.id,
      name: wish.title,
      price: (wish.target_cents ?? 0) / 100,
      imageUrl: wish.image_url ?? undefined,
      redeemed: Boolean(wish.redeemed_at),
      redeemedDate: wish.redeemed_at
        ? new Date(wish.redeemed_at).toLocaleDateString('de-CH')
        : undefined,
    }),
    []
  )

  const handleCreateWish = useCallback(
    async (wish: {
      name: string
      price: number
      imageUrl?: string
      redeemed?: boolean
      redeemedDate?: string
    }) => {
      if (!childId) return null
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) return null
      const user = userData.user
      if (!user) {
        router.replace('/login')
        return null
      }

      const tempId = `temp-${Date.now()}`
      const optimisticRow: WishRow = {
        id: tempId,
        title: wish.name,
        target_cents: Math.round(wish.price * 100),
        image_url: wish.imageUrl ?? null,
        redeemed_at: null,
        created_at: new Date().toISOString(),
      }

      setWishes((prev) => [optimisticRow, ...prev])

      const { data, error: insertError } = await supabase
        .from('wishes')
        .insert({
          child_id: childId,
          user_id: user.id,
          title: wish.name,
          target_cents: Math.round(wish.price * 100),
          image_url: wish.imageUrl ?? null,
        })
        .select('id, title, target_cents, image_url, redeemed_at, created_at')
        .single()

      if (insertError || !data) {
        setWishes((prev) => prev.filter((item) => item.id !== tempId))
        return null
      }

      const row = data as WishRow
      setWishes((prev) =>
        prev.map((item) => (item.id === tempId ? row : item))
      )
      return mapWishRow(row)
    },
    [childId, mapWishRow, router, supabase]
  )

  const handleRedeemWish = useCallback(
    async (wish: { id: string; name: string; price: number }) => {
      if (!childId) return null
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) return null
      const user = userData.user
      if (!user) {
        router.replace('/login')
        return null
      }

      const previous = wishes.find((item) => item.id === wish.id)
      const redeemedAt = new Date().toISOString().split('T')[0]
      if (previous) {
        setWishes((prev) =>
          prev.map((item) =>
            item.id === wish.id ? { ...item, redeemed_at: redeemedAt } : item
          )
        )
      }

      const { data, error: updateError } = await supabase
        .from('wishes')
        .update({ redeemed_at: redeemedAt })
        .eq('id', wish.id)
        .eq('user_id', user.id)
        .select('id, title, target_cents, image_url, redeemed_at, created_at')
        .single()

      if (updateError || !data) {
        if (previous) {
          setWishes((prev) =>
            prev.map((item) => (item.id === wish.id ? previous : item))
          )
        }
        return null
      }

      const row = data as WishRow
      setWishes((prev) => prev.map((item) => (item.id === row.id ? row : item)))
      return mapWishRow(row)
    },
    [childId, mapWishRow, router, supabase, wishes]
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#FFF9F0] via-[#F5F0FF] to-[#F0F9FF]">
        <div className="mx-auto w-full max-w-5xl p-6 space-y-4">
          <div className="h-[72px] rounded-[24px] bg-white/80 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] backdrop-blur" />
          <div className="h-[240px] rounded-[24px] bg-white/80 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.08)] animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-[180px] rounded-[24px] bg-white/80 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.08)] animate-pulse" />
            <div className="h-[180px] rounded-[24px] bg-white/80 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.08)] animate-pulse" />
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#FFF9F0] via-[#F5F0FF] to-[#F0F9FF]">
        <div className="mx-auto w-full max-w-5xl p-6">
          <div className="rounded-2xl border border-red-200 bg-white/90 p-4 text-sm text-red-700 shadow-sm">
            ❌ {error}
          </div>
        </div>
      </main>
    )
  }

  if (!child || !balance) return null

  return (
    <WishFlow
      childName={child.name?.trim() || 'Kind'}
      childEmoji={child.avatar_emoji ?? '🧒'}
      saveBalance={(balance.save_cents ?? 0) / 100}
      onBack={() => router.push(`/children/${childId}`)}
      wishes={wishes.map(mapWishRow)}
      onCreateWish={handleCreateWish}
      onRedeemWish={handleRedeemWish}
    />
  )
}
