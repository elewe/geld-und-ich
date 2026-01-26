// INDEX: app/login/page.tsx
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/supabase/server'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return <LoginForm />
}
