// INDEX: app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  const { supabase, response } = await createRouteHandlerSupabaseClient(request)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url))
  }

  return NextResponse.redirect(new URL('/', request.url), {
    headers: response.headers,
  })
}
