// INDEX: app/children/[childId]/edit/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/supabase/browser'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChildAvatar } from '@/components/kids/ChildAvatar'
import { getAccentClasses } from '@/components/kids/avatar'

type Child = {
  id: string
  name: string | null
  age: number | null
  weekly_amount: number | null
  user_id: string
  avatar_mode: 'emoji' | 'image'
  avatar_emoji: string | null
  avatar_image_url: string | null
  accent_color: string | null
}

export default function EditChildPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const router = useRouter()
  const params = useParams<{ childId: string }>()
  const childId = params?.childId

  const [name, setName] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [weeklyAmount, setWeeklyAmount] = useState<number | ''>('')
  const [avatarMode, setAvatarMode] = useState<'emoji' | 'image'>('emoji')
  const [avatarEmoji, setAvatarEmoji] = useState('🧒')
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null)
  const [accentColor, setAccentColor] = useState('slate')
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
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
        .select('id, name, age, weekly_amount, user_id, avatar_mode, avatar_emoji, avatar_image_url, accent_color')
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
      setAvatarMode(child.avatar_mode ?? 'emoji')
      setAvatarEmoji(child.avatar_emoji ?? '🧒')
      setAvatarImageUrl(child.avatar_image_url ?? null)
      setAccentColor(child.accent_color ?? 'slate')
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

    if (avatarMode === 'image' && !avatarImageUrl && !newImageFile) {
      setError('Bitte ein Bild wählen oder Emoji nutzen.')
      setSaving(false)
      return
    }

    let nextImageUrl = avatarImageUrl
    if (avatarMode === 'image' && newImageFile) {
      const fileExt = newImageFile.name.split('.').pop() || 'jpg'
      const filePath = `${user.id}/${childId}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, newImageFile, { upsert: true })

      if (uploadError) {
        setError(`Upload fehlgeschlagen: ${uploadError.message}`)
        setSaving(false)
        return
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      nextImageUrl = publicUrlData.publicUrl
    }

    const { error: updateError } = await supabase
      .from('children')
      .update({
        name: name.trim(),
        age: parsedAge,
        weekly_amount: parsedWeekly,
        avatar_mode: avatarMode,
        avatar_emoji: avatarEmoji || '🧒',
        accent_color: accentColor,
        avatar_image_url: avatarMode === 'image' ? nextImageUrl : null,
      })
      .eq('id', childId)
      .eq('user_id', user.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    router.replace('/dashboard')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-xl mx-auto p-6 md:p-10">
          <p className="text-slate-500">Lade Kind…</p>
        </div>
      </main>
    )
  }

  async function handleDelete() {
    if (!childId) return
    const confirmed = window.confirm('Kind wirklich entfernen? Alle Daten werden gelöscht.')
    if (!confirmed) return

    setError(null)
    setDeleting(true)

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) {
      setError(userError.message)
      setDeleting(false)
      return
    }

    const user = userData.user
    if (!user) {
      router.replace('/login')
      setDeleting(false)
      return
    }

    const { error: deleteError } = await supabase
      .from('children')
      .delete()
      .eq('id', childId)
      .eq('user_id', user.id)

    if (deleteError) {
      setError(deleteError.message)
      setDeleting(false)
      return
    }

    setDeleting(false)
    router.replace('/dashboard')
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto p-6 md:p-10 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Kind bearbeiten</h1>
          <Link href="/dashboard" className="text-sm text-slate-600 underline">
            Zurück
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-3">
            ❌ {error}
          </div>
        )}

        <Card>
          <form onSubmit={handleSave} className="space-y-4">
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
                  avatar_image_url={
                    newImageFile ? URL.createObjectURL(newImageFile) : avatarImageUrl ?? undefined
                  }
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
                    onChange={(e) => setNewImageFile(e.target.files?.[0] ?? null)}
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

            <div className="space-y-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Speichere…' : 'Speichern'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="text-red-600 border-red-200"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Lösche…' : 'Kind entfernen'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  )
}
