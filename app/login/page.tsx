// INDEX: app/login/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/browser'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('ready')

  useEffect(() => {
    const run = async () => {
      setStatus('checking session...')
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        setError(error.message)
        setStatus('session check error')
        return
      }

      if (data.session) {
        router.replace('/dashboard')
        return
      }

      setStatus('no session')
    }

    run()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/dashboard')
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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })

    if (error) {
      setError(error.message)
      setStatus('send failed')
      return
    }

    setSent(true)
    setStatus('sent')
  }

  return (
    <main className="p-8 max-w-md">
      <h1 className="text-3xl font-bold mb-2">Login</h1>
      <p className="text-slate-600 mb-6">Du bekommst einen Magic-Link per E-Mail.</p>

      <form onSubmit={signIn} className="space-y-3">
        <input
          className="w-full border rounded p-3"
          type="email"
          placeholder="deine@email.ch"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="w-full rounded bg-black text-white p-3" type="submit">
          Link senden
        </button>
      </form>

      <div className="mt-6 text-sm text-slate-500">
        Status: <span className="font-mono">{status}</span>
      </div>

      {sent && <p className="mt-3">✅ Link ist unterwegs. Check auch Spam/Promotions.</p>}
      {error && <p className="mt-3 text-red-600">❌ {error}</p>}
    </main>
  )
}
