// INDEX: app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/supabase/server'
import { getBaseUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const baseUrl = new URL(getBaseUrl())

  if (url.origin !== baseUrl.origin) {
    return NextResponse.redirect(new URL('/login?error=invalid_redirect', baseUrl))
  }

  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', baseUrl))
  }

  const response = NextResponse.redirect(new URL('/', baseUrl))
  const { supabase } = await createRouteHandlerSupabaseClient(request, response)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, baseUrl)
    )
  }

  return response
}
