// INDEX: app/children/[childId]/year-review/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/supabase/browser'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCHF } from '@/components/money/format'

type Child = {
  id: string
  name: string | null
  user_id: string
}

type Tx = {
  type: string
  pot: string | null
  amount_cents: number
  occurred_on: string
}

export default function YearReviewPage() {
  const params = useParams<{ childId: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const childId = params?.childId
  const yearParam = search?.get('year')
  const year = Number(yearParam) || new Date().getFullYear()

  const [child, setChild] = useState<Child | null>(null)
  const [transactions, setTransactions] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
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
        .select('id, name, user_id')
        .eq('id', childId)
        .single()

      if (childError || !childData || childData.user_id !== user.id) {
        setError(childError?.message ?? 'Kind nicht gefunden')
        setLoading(false)
        return
      }
      setChild(childData as Child)

      const start = `${year}-01-01`
      const end = `${year}-12-31`
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('type, pot, amount_cents, occurred_on')
        .eq('child_id', childId)
        .gte('occurred_on', start)
        .lte('occurred_on', end)

      if (txError) {
        setError(txError.message)
        setLoading(false)
        return
      }

      setTransactions((txData ?? []) as Tx[])
      setLoading(false)
    }

    run()
  }, [childId, supabase, router, year])

  const totals = transactions.reduce(
    (acc, tx) => {
      if (tx.type === 'allocation') {
        if (tx.pot === 'spend') acc.total_spend += tx.amount_cents
        if (tx.pot === 'save') acc.total_save += tx.amount_cents
        if (tx.pot === 'invest') acc.total_invest += tx.amount_cents
      }
      if (tx.type === 'interest') acc.interest_sum += tx.amount_cents
      if (tx.type === 'invest_transfer') acc.raketen += 1
      return acc
    },
    { total_spend: 0, total_save: 0, total_invest: 0, interest_sum: 0, raketen: 0 }
  )

  const monthBuckets: Record<string, number> = {}
  transactions.forEach((tx) => {
    if (tx.type === 'allocation' && tx.pot === 'save') {
      const key = tx.occurred_on.slice(0, 7)
      monthBuckets[key] = (monthBuckets[key] ?? 0) + tx.amount_cents
    }
  })
  const largestMonth = Object.entries(monthBuckets).sort((a, b) => b[1] - a[1])[0]

  async function handleDownload() {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    let y = 60
    doc.setFontSize(18)
    doc.text(`Jahresrückblick ${year}`, 40, y)
    y += 24
    doc.setFontSize(14)
    doc.text(child?.name ? child.name : 'Kind', 40, y)
    y += 24
    doc.setFontSize(12)
    doc.text(`Sparen: ${formatCHF(totals.total_save)}`, 40, y)
    y += 18
    doc.text(`Investieren: ${formatCHF(totals.total_invest)}`, 40, y)
    y += 18
    doc.text(`Ausgeben: ${formatCHF(totals.total_spend)}`, 40, y)
    y += 18
    doc.text(`Zinsen: ${formatCHF(totals.interest_sum)}`, 40, y)
    y += 24
    doc.text(
      `Dein Sparschatz ist dieses Jahr um ${formatCHF(totals.total_save + totals.interest_sum)} gewachsen.`,
      40,
      y
    )
    y += 18
    doc.text(`Raketenstarts: ${totals.raketen}`, 40, y)
    y += 18
    if (largestMonth) {
      doc.text(`Stärkster Sparmonat: ${largestMonth[0]} (${formatCHF(largestMonth[1])})`, 40, y)
      y += 18
    }
    y += 12
    doc.text('Weiter sparen mit Geld & ich 💚', 40, y)
    doc.save(`jahresrueckblick-${year}.pdf`)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-xl mx-auto p-6 md:p-10">
          <p className="text-slate-500">Lade Jahresrückblick…</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-xl mx-auto p-6 md:p-10 space-y-3">
          <Card>
            <p className="text-red-600 text-sm">❌ {error}</p>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto p-6 md:p-10 space-y-4">
        <h1 className="text-2xl font-bold">🎁 Jahresrückblick {year}</h1>
        <p className="text-slate-600 text-sm">Eine druckbare A4-Seite als Geschenk.</p>
        <Card className="space-y-2">
          <p className="text-sm text-slate-700">Kind: {child?.name ?? 'Kind'}</p>
          <p className="text-sm text-slate-700">Sparen: {formatCHF(totals.total_save)}</p>
          <p className="text-sm text-slate-700">Investieren: {formatCHF(totals.total_invest)}</p>
          <p className="text-sm text-slate-700">Ausgeben: {formatCHF(totals.total_spend)}</p>
          <p className="text-sm text-slate-700">Zinsen: {formatCHF(totals.interest_sum)}</p>
          <p className="text-sm text-slate-700">Raketenstarts: {totals.raketen}</p>
          {largestMonth ? (
            <p className="text-sm text-slate-700">
              Bester Sparmonat: {largestMonth[0]} ({formatCHF(largestMonth[1])})
            </p>
          ) : null}
        </Card>
        <Button onClick={handleDownload}>PDF herunterladen</Button>
      </div>
    </main>
  )
}
