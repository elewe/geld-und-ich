// INDEX: app/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/browser'

export default function LandingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [status, setStatus] = useState('checking session...')

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        setStatus('Fehler bei der Session-Prüfung, leite zu /login …')
        router.replace('/login')
        return
      }

      if (data.session) {
        setStatus('Session gefunden, leite zum Dashboard …')
        router.replace('/dashboard')
        return
      }

      setStatus('Keine Session, leite zu /login …')
      router.replace('/login')
    }

    run()
  }, [router, supabase])

  return (
    <main className="p-10">
      <p className="text-slate-600">{status}</p>
    </main>
  )
}
