// lib/supabase/server.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createJSClient } from '@supabase/supabase-js'

/**
 * Authenticated Server Client (uses cookies)
 * For user-based authenticated queries in Server Components / API Routes.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (_) {
            // Server Components cannot set cookies
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (_) {
            // Server Components cannot remove cookies
          }
        },
      },
    }
  )
}

/**
 * Admin Supabase Client (Service Role)
 * - Does NOT use cookies (dangerous if it did)
 * - Full access bypassing RLS
 * - Use ONLY in server-side logic
 */
export const adminSupabase = createJSClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * If you prefer a factory function instead of direct export:
 *
 * export async function createAdminClient() {
 *   return adminSupabase
 * }
 */
