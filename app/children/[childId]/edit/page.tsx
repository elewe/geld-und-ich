// INDEX: app/children/[childId]/edit/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/supabase/client'

type Child = {
  id: string
  name: string | null
  age: number | null
  weekly_amount: number | null
  user_id: string
  avatar_mode: 'emoji' | 'image'
  avatar_emoji: string | null
  donate_enabled?: boolean | null
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
  '⚽',
  '🎨',
  '🎵',
  '📚',
]

export default function EditChildPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const router = useRouter()
  const params = useParams<{ childId: string }>()
  const childId = params?.childId

  const [name, setName] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [weeklyAmount, setWeeklyAmount] = useState<number | ''>('')
  const [avatarEmoji, setAvatarEmoji] = useState('🧒')
  const [donateEnabled, setDonateEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadChild = async () => {
      if (!childId) {
        setError('Keine Kind-ID gefunden.')
        router.replace('/dashboard')
        return
      }

      setError(null)
      setLoading(true)

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (!active) return

      if (userError) {
        setError(userError.message)
        setLoading(false)
        return
      }

      const user = userData.user
      if (!user) {
        router.replace('/login')
        setLoading(false)
        return
      }

      const { data, error: childError } = await supabase
        .from('children')
        .select('id, name, age, weekly_amount, user_id, avatar_mode, avatar_emoji, donate_enabled')
        .eq('id', childId)
        .single()

      if (!active) return

      if (childError) {
        setError(childError.message)
        setLoading(false)
        return
      }

      if (!data || (data as Child).user_id !== user.id) {
        setError('Kein Zugriff auf dieses Kind.')
        router.replace('/dashboard')
        setLoading(false)
        return
      }

      const child = data as Child
      setName(child.name ?? '')
      setAge(child.age ?? '')
      setWeeklyAmount(child.weekly_amount ?? '')
      setAvatarEmoji(child.avatar_emoji ?? '🧒')
      setDonateEnabled(Boolean(child.donate_enabled))
      setLoading(false)
    }

    loadChild()

    return () => {
      active = false
    }
  }, [childId, router, supabase])

  async function handleSave(e: React.FormEvent) {
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

    if (!childId) {
      setError('Kind nicht gefunden.')
      setSaving(false)
      return
    }

    const enableDonate = donateEnabled || parsedAge >= 7

    const { error: updateError } = await supabase
      .from('children')
      .update({
        name: name.trim(),
        age: parsedAge,
        weekly_amount: parsedWeekly,
        avatar_mode: 'emoji',
        avatar_emoji: avatarEmoji || '🧒',
        donate_enabled: enableDonate,
      })
      .eq('id', childId)
      .eq('user_id', user.id)

    if (updateError) {
      setError(updateError.message)
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
          <div className="h-[620px] rounded-[24px] bg-white/80 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.08)] animate-pulse" />
        </div>
      </main>
    )
  }

  const recommendedAge = typeof age === 'number' && !Number.isNaN(age) ? age : 0
  const recommendedWeekly = `CHF ${recommendedAge.toFixed(2)}`
  const isAgeEligible = typeof age === 'number' && age >= 7
  const donateActive = donateEnabled || isAgeEligible

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fff5f0] via-[#f0f8ff] to-[#f5fff5] text-[#0a0a0a]">
      <header className="sticky top-0 z-10 bg-white/80 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur">
        <div className="relative mx-auto flex min-h-[72px] w-full max-w-2xl items-center justify-center px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-6 flex size-10 items-center justify-center rounded-full bg-[#f0e8f8] text-[#7b6b8f]"
            aria-label="Zurück"
          >
            <ArrowLeftIcon className="size-5" />
          </button>
          <div className="flex items-center gap-[7.991px] text-[#5a4a6a]">
            <span className="text-[24px] leading-[32px] tracking-[0.0703px]">{avatarEmoji}</span>
            <span className="text-[20px] font-semibold leading-[28px] tracking-[-0.4492px]">
              Einstellungen
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 pb-6 pt-6">
        <form
          onSubmit={handleSave}
          className="rounded-[24px] bg-white/90 px-[31.99px] pb-[31.99px] pt-[31.99px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
        >
          <div className="flex flex-col items-center gap-[15.991px] text-center">
            <div className="text-[60px] leading-[60px] tracking-[0.2637px]">{avatarEmoji}</div>
            <div>
              <p className="text-[24px] font-semibold leading-[32px] tracking-[0.0703px] text-[#5a4a6a]">
                Profil bearbeiten
              </p>
              <p className="text-[16px] leading-[24px] tracking-[-0.3125px] text-[#9b8bab]">
                Passe die Informationen an
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-[15.991px] rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              ❌ {error}
            </div>
          )}

          <div className="mt-[31.99px] space-y-[23.992px]">
            <div className="space-y-[7.991px]">
              <label className="text-[14px] font-semibold leading-[20px] tracking-[-0.1504px] text-[#5a4a6a]">
                Name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-[16px] bg-gradient-to-b from-[#f8f4fc] to-[#f4f8fc] px-[20px] py-[16px] text-[18px] tracking-[-0.4395px] text-[#5a4a6a] placeholder:text-[#d0c0e0]"
                placeholder="Emma"
                required
              />
            </div>

            <div className="space-y-[11.996px]">
              <p className="text-[14px] font-semibold leading-[20px] tracking-[-0.1504px] text-[#5a4a6a]">
                Symbol wählen
              </p>
              <div className="grid grid-cols-8 gap-[7.991px]">
                {emojiOptions.map((emoji) => {
                  const isActive = avatarEmoji === emoji
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatarEmoji(emoji)}
                      className={`flex h-[51.979px] w-[33.999px] items-center justify-center rounded-[14px] text-[30px] leading-[36px] tracking-[0.3955px] transition ${
                        isActive
                          ? 'bg-gradient-to-b from-[#a8d5e2] to-[#b8e6b8] shadow-[0px_4px_10px_-6px_rgba(0,0,0,0.25)]'
                          : 'bg-[#f8f4fc]'
                      }`}
                      aria-pressed={isActive}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-[7.991px]">
              <label className="text-[14px] font-semibold leading-[20px] tracking-[-0.1504px] text-[#5a4a6a]">
                Alter (Jahre)
              </label>
              <input
                type="number"
                min={1}
                max={18}
                value={age}
                onChange={(event) =>
                  setAge(event.target.value === '' ? '' : Number(event.target.value))
                }
                className="w-full rounded-[16px] bg-gradient-to-b from-[#f8f4fc] to-[#f4f8fc] px-[20px] py-[16px] text-[18px] tracking-[-0.4395px] text-[#5a4a6a] placeholder:text-[#d0c0e0]"
                placeholder="7"
                required
              />
            </div>

            <div className="space-y-[7.991px]">
              <label className="text-[14px] font-semibold leading-[20px] tracking-[-0.1504px] text-[#5a4a6a]">
                Wöchentliches Taschengeld
              </label>
              <div className="relative">
                <span className="absolute left-[20px] top-1/2 -translate-y-1/2 text-[20px] font-bold leading-[28px] tracking-[-0.4492px] text-[#7b6b8f]">
                  CHF
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={weeklyAmount}
                  onChange={(event) =>
                    setWeeklyAmount(event.target.value === '' ? '' : Number(event.target.value))
                  }
                  className="w-full rounded-[16px] bg-gradient-to-b from-[#f8f4fc] to-[#f4f8fc] py-[16px] pl-[64px] pr-[20px] text-[18px] tracking-[-0.4395px] text-[#5a4a6a] placeholder:text-[#d0c0e0]"
                  placeholder="7.00"
                  required
                />
              </div>
              <div className="rounded-[16px] bg-gradient-to-b from-[#fff5f0] to-[#f5fff5] px-[11.996px] pb-0 pt-[11.996px] text-[12px] leading-[16px] text-[#7b6b8f]">
                <div className="flex items-start gap-[6px]">
                  <span>💡</span>
                  <div>
                    <span className="font-medium">Empfehlung:</span> Pro Woche so viele Franken wie das Kind alt ist
                    <span className="ml-1 font-bold text-[#5a4a6a]">({recommendedWeekly})</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] bg-gradient-to-b from-[#fff5f0] to-[#f5fff5] px-[19.996px] pb-0 pt-[19.996px]">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-[7.991px]">
                  <div className="flex items-center gap-[7.991px] text-[#5a4a6a]">
                    <span className="text-[20px] leading-[28px] tracking-[-0.4492px]">💝</span>
                    <span className="text-[16px] font-bold leading-[24px] tracking-[-0.3125px]">
                      Spenden-Topf
                    </span>
                  </div>
                  <p className="text-[14px] leading-[20px] tracking-[-0.1504px] text-[#7b6b8f]">
                    Aktiviere einen vierten Topf für Spenden und gute Taten.
                  </p>
                  <div className="inline-flex items-center gap-[6px] rounded-[14px] bg-white/80 px-[7.99px] py-[8.58px] text-[12px] leading-[16px] text-[#9b8bab]">
                    <span>💡</span>
                    <span className="font-semibold">Empfohlen ab 7 Jahren</span>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={donateActive}
                  onClick={() => {
                    if (isAgeEligible) return
                    setDonateEnabled((prev) => !prev)
                  }}
                  className={`flex h-[31.992px] w-[55.993px] items-center rounded-full p-[3.996px] transition ${
                    donateActive
                      ? 'bg-gradient-to-b from-[#a8d5e2] to-[#b8e6b8]'
                      : 'bg-[#e6dff0]'
                  }`}
                >
                  <span
                    className={`h-[23.992px] w-[23.992px] rounded-full bg-white shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] transition ${
                      donateActive ? 'translate-x-[20px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-[31.99px] flex h-[67.989px] w-full items-center justify-center gap-[11.996px] rounded-[16px] bg-gradient-to-b from-[#a8d5e2] to-[#b8e6b8] text-[18px] font-semibold leading-[28px] tracking-[-0.4395px] text-[#2a5a5a] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
          >
            <SaveIcon className="size-[19.996px]" />
            {saving ? 'Speichere…' : 'Änderungen speichern'}
          </button>
        </form>
      </div>
    </main>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 4.5h7l3 3V15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M7 4.5v4h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="7" y="10" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
