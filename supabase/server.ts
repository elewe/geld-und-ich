// INDEX: supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseEnv } from './env'

/**
 * Server Component/Route Loader client.
 * Cookie writes are swallowed here because Next.js only allows them in Server Actions/Route Handlers.
 * Middleware and route handlers handle actual cookie persistence.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseEnv()

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(_name: string, _value: string, _options?: CookieOptions) {
        // No-op: Server Components cannot set cookies; handled in middleware/route handlers.
      },
      remove(_name: string, _options?: CookieOptions) {
        // No-op: Server Components cannot set cookies; handled in middleware/route handlers.
      },
    },
  })
}

/**
 * Route Handler client that can safely write cookies.
 */
export function createRouteHandlerSupabaseClient(
  request: NextRequest,
  responseOverride?: NextResponse
) {
  const { url, anonKey } = getSupabaseEnv()
  const response =
    responseOverride ??
    new NextResponse(null, {
      headers: request.headers,
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

// Backwards compatibility until all imports are updated
export const createServerSupabaseReadClient = createServerSupabaseClient
