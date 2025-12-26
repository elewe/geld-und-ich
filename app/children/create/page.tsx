// INDEX: app/children/create/page.tsx
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/browser'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChildAvatar } from '@/components/kids/ChildAvatar'
import { getAccentClasses } from '@/components/kids/avatar'

export default function CreateChild() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [name, setName] = useState('')
  const [age, setAge] = useState<number | ''>(4)
  const [weeklyAmount, setWeeklyAmount] = useState<number | ''>(4)
  const [avatarMode, setAvatarMode] = useState<'emoji' | 'image'>('emoji')
  const [avatarEmoji, setAvatarEmoji] = useState('🧒')
  const [accentColor, setAccentColor] = useState('slate')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCreateChild(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const parsedAge = typeof age === 'number' ? age : Number(age)
    const parsedWeekly = typeof weeklyAmount === 'number' ? weeklyAmount : Number(weeklyAmount)

    if (!name.trim()) {
      setError('Name ist Pflicht.')
      return
    }

    if (Number.isNaN(parsedAge) || parsedAge < 1 || parsedAge > 18) {
      setError('Alter muss zwischen 1 und 18 liegen.')
      return
    }

    if (Number.isNaN(parsedWeekly) || parsedWeekly < 0) {
      setError('Wöchentliches Taschengeld muss >= 0 sein.')
      return
    }

    setLoading(true)

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError) {
      setError(userError.message)
      setLoading(false)
      return
    }

    const user = userData.user
    if (!user) {
      setError('Du musst eingeloggt sein, um ein Kind hinzuzufügen.')
      setLoading(false)
      router.replace('/login')
      return
    }

    if (avatarMode === 'image' && !imageFile) {
      setError('Bitte ein Bild auswählen oder Emoji verwenden.')
      setLoading(false)
      return
    }

    const { data: childData, error: insertError } = await supabase
      .from('children')
      .insert({
        name: name.trim(),
        age: parsedAge,
        weekly_amount: parsedWeekly,
        user_id: user.id,
        avatar_mode: avatarMode,
        avatar_emoji: avatarEmoji || '🧒',
        accent_color: accentColor,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    const childId = childData?.id
    if (!childId) {
      setError('Kind wurde erstellt, aber es fehlt die ID.')
      setLoading(false)
      return
    }

    if (avatarMode === 'image' && imageFile) {
      const fileExt = imageFile.name.split('.').pop() || 'jpg'
      const filePath = `${user.id}/${childId}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, imageFile, { upsert: true })

      if (uploadError) {
        setError(`Upload fehlgeschlagen: ${uploadError.message}`)
        setLoading(false)
        return
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = publicUrlData.publicUrl

      const { error: updateError } = await supabase
        .from('children')
        .update({ avatar_image_url: publicUrl, avatar_mode: 'image' })
        .eq('id', childId)
        .eq('user_id', user.id)

      if (updateError) {
        setError(`Avatar konnte nicht gespeichert werden: ${updateError.message}`)
        setLoading(false)
        return
      }
    }

    const { error: balanceError } = await supabase.from('balances').insert({
      child_id: childId,
      user_id: user.id,
      spend_cents: 0,
      save_cents: 0,
      invest_cents: 0,
    })

    if (balanceError) {
      setError(`Balance konnte nicht angelegt werden: ${balanceError.message}`)
      setLoading(false)
      return
    }

    const { error: settingsError } = await supabase.from('settings').insert({
      child_id: childId,
      user_id: user.id,
      payout_weekday: 1,
      interest_apr_bp: 200,
      invest_threshold_cents: 5000,
    })

    if (settingsError) {
      setError(`Settings konnten nicht angelegt werden: ${settingsError.message}`)
      setLoading(false)
      return
    }

    setLoading(false)
    router.replace('/dashboard')
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto p-6 md:p-10 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Kind hinzufügen</h1>
          <a href="/dashboard" className="text-sm text-slate-600 underline">
            Zurück
          </a>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-3">
            ❌ {error}
          </div>
        )}

        <Card>
          <form onSubmit={handleCreateChild} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold">
                Name
              </label>
              <input
                id="name"
                className="w-full rounded-xl border border-slate-200 p-3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="age" className="block text-sm font-semibold">
                Alter
              </label>
              <input
                id="age"
                type="number"
                className="w-full rounded-xl border border-slate-200 p-3"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                min={1}
                max={18}
                required
              />
            </div>

            <div>
              <label htmlFor="weekly" className="block text-sm font-semibold">
                Wöchentliches Taschengeld (CHF)
              </label>
              <input
                id="weekly"
                type="number"
                className="w-full rounded-xl border border-slate-200 p-3"
                value={weeklyAmount}
                onChange={(e) =>
                  setWeeklyAmount(e.target.value === '' ? '' : Number(e.target.value))
                }
                min={0}
                step={1}
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Avatar Vorschau</p>
                  <p className="text-xs text-slate-500">Emoji oder Bild + Akzentfarbe</p>
                </div>
                <ChildAvatar
                  name={name}
                  avatar_mode={avatarMode}
                  avatar_emoji={avatarEmoji}
                  avatar_image_url={imageFile ? URL.createObjectURL(imageFile) : undefined}
                  accent_color={accentColor}
                  size="md"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={avatarMode === 'emoji' ? 'primary' : 'secondary'}
                  fullWidth={false}
                  onClick={() => setAvatarMode('emoji')}
                >
                  Emoji nutzen
                </Button>
                <Button
                  type="button"
                  variant={avatarMode === 'image' ? 'primary' : 'secondary'}
                  fullWidth={false}
                  onClick={() => setAvatarMode('image')}
                >
                  Bild hochladen
                </Button>
              </div>

              {avatarMode === 'emoji' && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Emoji</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3"
                    value={avatarEmoji}
                    onChange={(e) => setAvatarEmoji(e.target.value)}
                    maxLength={4}
                  />
                  <div className="flex flex-wrap gap-2">
                    {['🦊', '🐻', '🐼', '🦁', '🐸', '🐰', '🐯', '🦄', '⭐️', '🧒', '👧', '👦'].map((emo) => (
                      <button
                        key={emo}
                        type="button"
                        className={`rounded-xl border px-3 py-2 text-lg ${
                          avatarEmoji === emo ? 'border-slate-900 bg-slate-100' : 'border-slate-200'
                        }`}
                        onClick={() => setAvatarEmoji(emo)}
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {avatarMode === 'image' && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Bild auswählen</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    className="w-full rounded-xl border border-slate-200 p-3"
                  />
                  <p className="text-xs text-slate-500">PNG/JPG, wird in den öffentlichen Bucket „avatars“ geladen.</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-semibold">Akzentfarbe</label>
                <div className="grid grid-cols-4 gap-2">
                  {['slate', 'amber', 'emerald', 'sky', 'violet', 'rose', 'orange', 'teal'].map((token) => {
                    const accent = getAccentClasses(token)
                    const active = accentColor === token
                    return (
                      <button
                        key={token}
                        type="button"
                        onClick={() => setAccentColor(token)}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm capitalize ${
                          active ? 'border-slate-900 bg-slate-100' : 'border-slate-200'
                        }`}
                      >
                        <span className={`h-4 w-4 rounded-full ${accent.dot}`} />
                        {token}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Erstelle…' : 'Kind hinzufügen'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}
