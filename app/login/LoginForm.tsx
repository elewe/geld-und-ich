// INDEX: app/login/LoginForm.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/supabase/client'
import { getBaseUrl } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function LoginForm() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('ready')

  useEffect(() => {
    const run = async () => {
      setStatus('checking session...')
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        setError(sessionError.message)
        setStatus('session check error')
        return
      }

      if (data.session) {
        router.replace('/')
        return
      }

      setStatus('no session')
    }

    run()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/')
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [router, supabase])

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSent(false)

    setStatus('sending magic link...')
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getBaseUrl()}/auth/callback`,
      },
    })

    if (signInError) {
      setError(signInError.message)
      setStatus('send failed')
      return
    }

    setSent(true)
    setStatus('sent')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fff5f0] via-[#f0f8ff] to-[#f5fff5] flex items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md space-y-4 bg-white/90 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#5a4a6a]">Anmelden</h1>
          <p className="text-[#7b6b8f]">Du bekommst einen Magic-Link per E-Mail.</p>
        </div>

        <form onSubmit={signIn} className="space-y-3">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[#5a4a6a]">E-Mail</span>
            <input
              className="w-full rounded-xl border border-white/80 bg-gradient-to-r from-[#f8f4fc] to-[#f4f8fc] p-3 text-[#5a4a6a] focus:outline-none focus:ring-4 focus:ring-[#b8d5e8]"
              type="email"
              placeholder="deine@email.ch"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <Button type="submit">{sent ? 'Link erneut senden' : 'Link senden'}</Button>
        </form>

        <div className="text-sm text-[#9b8bab]">
          Status: <span className="font-mono">{status}</span>
        </div>

        {sent && <p className="text-sm text-emerald-700">✅ Link ist unterwegs. Check auch Spam/Promotions.</p>}
        {error && <p className="text-sm text-red-600">❌ {error}</p>}
      </Card>
    </main>
  )
}
