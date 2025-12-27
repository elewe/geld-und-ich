// INDEX: app/login/page.tsx
import { redirect } from 'next/navigation'
import { createServerSupabaseReadClient } from '@/supabase/server'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const supabase = await createServerSupabaseReadClient()
  const { data } = await supabase.auth.getSession()

  if (data.session) {
    redirect('/')
  }

  return <LoginForm />
}
