// INDEX: app/children/create/page.tsx
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/supabase/client'
import { ArrowLeft } from 'lucide-react'

export default function CreateChild() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const router = useRouter()

  const [name, setName] = useState('')
  const [age, setAge] = useState<number | ''>(4)
  const [weeklyAmount, setWeeklyAmount] = useState<number | ''>(4)
  const avatarMode: 'emoji' | 'image' = 'emoji'
  const [avatarEmoji, setAvatarEmoji] = useState('🌸')
  const accentColor = 'slate'
  const imageFile: File | null = null
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
        donate_enabled: false,
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

  const emojiOptions = [
    '🌸',
    '🚀',
    '🌟',
    '🦄',
    '🐻',
    '🦊',
    '🐼',
    '🦁',
    '🐨',
    '🐸',
    '🦋',
    '🌈',
    '⚽️',
    '🎨',
    '🎵',
    '📚',
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fff5f0] via-[#f0f8ff] to-[#f5fff5]">
      <header className="sticky top-0 z-10 border-b border-white/60 bg-white/80 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur">
        <div className="relative mx-auto flex min-h-[72px] w-full max-w-2xl items-center justify-between px-6">
          <button
            type="button"
            onClick={() => router.replace('/dashboard')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0e8f8] text-[#7b6b8f]"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-2 text-[#5a4a6a]">
            <span className="text-2xl">👶</span>
            <span className="text-xl font-semibold">Kind hinzufügen</span>
          </div>
          <div className="h-10 w-10" aria-hidden="true" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 pb-10 pt-8">
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-white/90 p-3 text-sm text-red-700 shadow-sm">
            ❌ {error}
          </div>
        )}

        <form
          onSubmit={handleCreateChild}
          className="rounded-[28px] bg-white/90 p-8 shadow-[0px_18px_40px_-20px_rgba(15,23,42,0.25)] backdrop-blur"
        >
          <div className="text-center">
            <div className="text-6xl">{avatarEmoji}</div>
            <h1 className="mt-4 text-2xl font-semibold text-[#5A4A6A]">
              Neues Kinderprofil
            </h1>
            <p className="mt-2 text-sm text-[#9B8BAB]">
              Erstelle ein Profil für dein Kind
            </p>
          </div>

          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-semibold text-[#5A4A6A]">
                Name
              </label>
              <input
                id="name"
                className="w-full rounded-2xl bg-gradient-to-r from-[#f8f4fc] to-[#f4f8fc] px-5 py-4 text-base text-[#5A4A6A] placeholder:text-[#D0C0E0] focus:outline-none focus:ring-4 focus:ring-[#B8D5E8]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Emma"
                required
              />
            </div>

            <div className="space-y-3">
              <span className="text-sm font-semibold text-[#5A4A6A]">
                Symbol wählen
              </span>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatarEmoji(emoji)}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition ${
                      avatarEmoji === emoji
                        ? 'bg-gradient-to-br from-[#b8e6b8] to-[#a8d5e2] shadow-md'
                        : 'bg-[#f7f2fb] text-[#7b6b8f]'
                    }`}
                    aria-pressed={avatarEmoji === emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="age" className="text-sm font-semibold text-[#5A4A6A]">
                Alter (Jahre)
              </label>
              <input
                id="age"
                type="number"
                className="w-full rounded-2xl bg-gradient-to-r from-[#f8f4fc] to-[#f4f8fc] px-5 py-4 text-base text-[#5A4A6A] placeholder:text-[#D0C0E0] focus:outline-none focus:ring-4 focus:ring-[#B8D5E8]"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                min={1}
                max={18}
                placeholder="z.B. 7"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="weekly" className="text-sm font-semibold text-[#5A4A6A]">
                Wöchentliches Taschengeld
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-semibold text-[#7B6B8F]">
                  CHF
                </span>
                <input
                  id="weekly"
                  type="number"
                  className="w-full rounded-2xl bg-gradient-to-r from-[#f8f4fc] to-[#f4f8fc] py-4 pl-16 pr-5 text-base text-[#5A4A6A] placeholder:text-[#D0C0E0] focus:outline-none focus:ring-4 focus:ring-[#B8D5E8]"
                  value={weeklyAmount}
                  onChange={(e) =>
                    setWeeklyAmount(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  min={0}
                  placeholder="0.00"
                />
              </div>
              <div className="rounded-2xl bg-gradient-to-r from-[#f5fff5] to-[#f0f8ff] px-4 py-3 text-xs text-[#5A4A6A]">
                💡 Empfehlung: Pro Woche so viele Franken wie das Kind alt ist
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#A8D5E2] to-[#B8E6B8] px-5 py-5 text-lg font-semibold text-[#2A5A5A] shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Wird gespeichert…' : 'Kind hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
