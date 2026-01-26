import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseEnv } from './env'

export function createMiddlewareSupabaseClient(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv()
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options?: CookieOptions) {
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options?: CookieOptions) {
        response.cookies.set({ name, value: '', ...options, expires: new Date(0) })
      },
    },
  })

  return { supabase, response }
}
