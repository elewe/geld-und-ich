import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareSupabaseClient } from './supabase/middleware'

const PUBLIC_PATHS = ['/login', '/auth/callback']
const PROTECTED_PATHS = ['/', '/children', '/dashboard']

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static assets and Next internals.
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const { supabase, response } = createMiddlewareSupabaseClient(request)

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    return response
  }

  const user = sessionData.session?.user ?? null

  const isLogin = pathname.startsWith('/login')
  const isProtected = PROTECTED_PATHS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (user && isLogin) {
    return NextResponse.redirect(new URL('/', request.url), {
      headers: response.headers,
    })
  }

  if (!user && isProtected && !PUBLIC_PATHS.includes(pathname)) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl, { headers: response.headers })
  }

  // For non-redirected requests, continue with refreshed cookies.
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
