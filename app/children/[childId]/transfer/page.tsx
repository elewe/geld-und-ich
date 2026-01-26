// INDEX: app/children/[childId]/transfer/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCHF } from '@/lib/ui'

function toCents(value: number) {
  return Math.round(value * 100)
}

export default function TransferPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const params = useParams<{ childId: string }>()
  const router = useRouter()
  const childId = params?.childId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [childName, setChildName] = useState<string | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [threshold, setThreshold] = useState<number>(5000)
  const [amount, setAmount] = useState<number | ''>('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!childId) {
        setError('Keine Kind-ID gefunden.')
        setLoading(false)
        return
      }

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
        .select('id, name, user_id')
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

      const { data: balData } = await supabase
        .from('balances')
        .select('invest_cents')
        .eq('child_id', childId)
        .single()

      const investCents = balData?.invest_cents ?? 0
      setBalance(investCents)

      const { data: settingsData } = await supabase
        .from('settings')
        .select('invest_threshold_cents')
        .eq('child_id', childId)
        .single()

      const thresholdCents = settingsData?.invest_threshold_cents ?? 5000
      setThreshold(thresholdCents)

      const defaultAmount = Math.min(investCents, thresholdCents)
      setAmount(defaultAmount / 100)

      setChildName(childData.name ?? 'Kind')
      setLoading(false)
    }

    load()
  }, [childId, router, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!childId) {
      setError('Keine Kind-ID gefunden.')
      return
    }

    const amountCents = toCents(typeof amount === 'number' ? amount : Number(amount))
    if (Number.isNaN(amountCents) || amountCents <= 0) {
      setError('Betrag muss > 0 sein.')
      return
    }

    if (amountCents > balance) {
      setError('Betrag übersteigt verfügbaren Invest-Topf.')
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

    const { error: txError } = await supabase.from('transactions').insert({
      child_id: childId,
      user_id: user.id,
      type: 'invest_transfer',
      pot: 'invest',
      amount_cents: amountCents,
      occurred_on: new Date().toISOString().slice(0, 10),
      meta: { note },
    })

    if (txError) {
      setError(txError.message)
      setSaving(false)
      return
    }

    const { error: balanceError } = await supabase
      .from('balances')
      .update({
        invest_cents: balance - amountCents,
        updated_at: new Date().toISOString(),
      })
      .eq('child_id', childId)
      .eq('user_id', user.id)

    if (balanceError) {
      setError(balanceError.message)
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
          <div className="h-[420px] rounded-[24px] bg-white/80 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.08)] animate-pulse" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fff5f0] via-[#f0f8ff] to-[#f5fff5]">
      <div className="mx-auto w-full max-w-2xl p-6 md:p-10 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Invest transferieren</h1>
          <Link href={`/children/${childId}`} className="text-sm text-slate-600 underline">
            Zurück
          </Link>
        </div>
        <p className="text-slate-600 text-sm">Kind: {childName}</p>
        <p className="text-slate-600 text-sm">
          Verfügbar: {formatCHF(balance)} • Schwelle: {formatCHF(threshold)}
        </p>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-3">
            ❌ {error}
          </div>
        )}

        <Card className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold">Betrag (CHF)</label>
              <input
                type="number"
                min="0"
                step="0.05"
                className="w-full rounded-xl border border-slate-200 p-3"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold">Notiz / Broker</label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 p-3"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="z.B. UBS Konto"
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Speichere…' : 'Transfer markieren'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}
