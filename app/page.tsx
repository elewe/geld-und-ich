import { createClient } from '@/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Kids Money Lab</h1>
      <p className="mt-2 text-slate-600">
        Eingeloggt als {user.email}
      </p>
    </main>
  )
}
