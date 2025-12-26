'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/browser'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.replace('/login')
        return
      }

      setEmail(data.user.email ?? null)
      setLoading(false)
    }

    run()
  }, [router, supabase])

  if (loading) {
    return (
      <main className="p-8">
        <p className="text-slate-500">Lade…</p>
      </main>
    )
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Kids Money Lab</h1>
      <p className="mt-2 text-slate-600">Eingeloggt als: {email}</p>
    </main>
  )
}
