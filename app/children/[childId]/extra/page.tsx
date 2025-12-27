// INDEX: app/children/[childId]/extra/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/supabase/browser'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

function toCents(value: number) {
  return Math.round(value * 100)
}

export default function ExtraPaymentPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const params = useParams<{ childId: string }>()
  const router = useRouter()
  const childId = params?.childId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [childName, setChildName] = useState<string | null>(null)

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState<number | ''>('')
  const [reason, setReason] = useState('')
  const [spend, setSpend] = useState<number | ''>('')
  const [save, setSave] = useState<number | ''>('')
  const [invest, setInvest] = useState<number | ''>('')
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

    const totalCents = toCents(typeof amount === 'number' ? amount : Number(amount))
    const spendCents = toCents(typeof spend === 'number' ? spend : Number(spend || 0))
    const saveCents = toCents(typeof save === 'number' ? save : Number(save || 0))
    const investCents = toCents(typeof invest === 'number' ? invest : Number(invest || 0))

    if (Number.isNaN(totalCents) || totalCents <= 0) {
      setError('Betrag muss > 0 sein.')
      return
    }

    if (saveCents + investCents <= 0) {
      setError('Sparen + Investieren muss > 0 sein.')
      return
    }

    if (spendCents + saveCents + investCents !== totalCents) {
      setError('Summe der Aufteilung muss dem Gesamtbetrag entsprechen.')
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

    // Basis-Transaktion für Nachvollziehbarkeit
    const { error: baseError } = await supabase.from('transactions').insert({
      child_id: childId,
      user_id: user.id,
      type: 'extra_payment',
      pot: 'spend',
      amount_cents: totalCents,
      occurred_on: date,
      meta: { reason: reason || 'Extra Zahlung' },
    })

    if (baseError) {
      setError(baseError.message)
      setSaving(false)
      return
    }

    const allocations = [
      spendCents > 0
        ? {
            child_id: childId,
            user_id: user.id,
            type: 'allocation',
            pot: 'spend',
            amount_cents: spendCents,
            occurred_on: date,
            meta: { source: 'extra_payment', reason },
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
            meta: { source: 'extra_payment', reason },
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
            meta: { source: 'extra_payment', reason },
          }
        : null,
    ].filter(Boolean) as any[]

    if (allocations.length > 0) {
      const { error: allocError } = await supabase.from('transactions').insert(allocations)
      if (allocError) {
        setError(allocError.message)
        setSaving(false)
        return
      }
    }

    const { data: currentBalance } = await supabase
      .from('balances')
      .select('spend_cents, save_cents, invest_cents')
      .eq('child_id', childId)
      .single()

    const nextBalance = currentBalance ?? {
      spend_cents: 0,
      save_cents: 0,
      invest_cents: 0,
    }

    const { error: balanceUpdateError } = await supabase
      .from('balances')
      .upsert(
        {
          child_id: childId,
          user_id: user.id,
          spend_cents: (nextBalance.spend_cents ?? 0) + spendCents,
          save_cents: (nextBalance.save_cents ?? 0) + saveCents,
          invest_cents: (nextBalance.invest_cents ?? 0) + investCents,
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
      <main className="p-8">
        <p className="text-slate-500">Lade…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto p-6 md:p-10 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Extra Zahlung</h1>
          <Link href={`/children/${childId}`} className="text-sm text-slate-600 underline">
            Zurück
          </Link>
        </div>
        <p className="text-slate-600 text-sm">Kind: {childName}</p>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-3">
            ❌ {error}
          </div>
        )}

        <Card className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold">Datum</label>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 p-3"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold">Betrag (CHF)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                className="w-full rounded-xl border border-slate-200 p-3"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold">Grund / Notiz</label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 p-3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Geburtstag, Good Job, ..."
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold">Ausgeben (CHF)</label>
                <input
                  type="number"
                  min="0"
                  step="0.05"
                  className="w-full rounded-xl border border-slate-200 p-3"
                  value={spend}
                  onChange={(e) => setSpend(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold">Sparen (CHF)</label>
                <input
                  type="number"
                  min="0"
                  step="0.05"
                  className="w-full rounded-xl border border-slate-200 p-3"
                  value={save}
                  onChange={(e) => setSave(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold">Investieren (CHF)</label>
                <input
                  type="number"
                  min="0"
                  step="0.05"
                  className="w-full rounded-xl border border-slate-200 p-3"
                  value={invest}
                  onChange={(e) => setInvest(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Speichere…' : 'Extra Zahlung speichern'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}
