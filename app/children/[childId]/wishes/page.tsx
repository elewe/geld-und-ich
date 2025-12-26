// INDEX: app/children/[childId]/wishes/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/supabase/browser'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCHF } from '@/components/money/format'

type Wish = {
  id: string
  title: string
  target_cents: number
  created_at: string | null
}

export default function WishesPage() {
  const params = useParams<{ childId: string }>()
  const childId = params?.childId
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [wishes, setWishes] = useState<Wish[]>([])
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!childId) return
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

      const { data, error: wishesError } = await supabase
        .from('wishes')
        .select('id, title, target_cents, created_at')
        .eq('child_id', childId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (wishesError) {
        setError(wishesError.message)
        setLoading(false)
        return
      }

      setWishes((data ?? []) as Wish[])
      setLoading(false)
    }

    run()
  }, [childId, supabase, router])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!childId) return
    setError(null)
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

    const parsedTarget = typeof target === 'number' ? target : Number(target)
    if (!title.trim() || Number.isNaN(parsedTarget) || parsedTarget <= 0) {
      setError('Titel und Zielbetrag angeben.')
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from('wishes').insert({
      child_id: childId,
      user_id: user.id,
      title: title.trim(),
      target_cents: Math.round(parsedTarget * 100),
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    setTitle('')
    setTarget('')
    setSaving(false)

    const { data } = await supabase
      .from('wishes')
      .select('id, title, target_cents, created_at')
      .eq('child_id', childId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setWishes((data ?? []) as Wish[])
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto p-6 md:p-10 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Ich spare für…</h1>
          <Link href={`/children/${childId}`} className="text-sm text-slate-600 underline">
            Zurück
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <Card>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold">Wunsch</label>
              <input
                className="w-full rounded-xl border border-slate-200 p-3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Fahrrad"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold">Zielbetrag (CHF)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-xl border border-slate-200 p-3"
                value={target}
                onChange={(e) => setTarget(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichere…' : 'Wunsch hinzufügen'}
            </Button>
          </form>
        </Card>

        {loading ? (
          <Card>
            <p className="text-sm text-slate-600">Lade Wünsche…</p>
          </Card>
        ) : wishes.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600">Noch keine Wünsche.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {wishes.map((wish) => (
              <Card key={wish.id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{wish.title}</p>
                  <p className="text-sm text-slate-600">{formatCHF(wish.target_cents)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
