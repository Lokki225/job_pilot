// app/api/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { handleOAuthCallback } from '@/lib/auth'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (!code) {
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent('No code provided')}`
    )
  }
  
  try {
    const cookieStore = await cookies()
    
    // Create a Supabase client with cookie handling for the callback
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete(name)
          },
        },
      }
    )
    
    // Exchange the code for a session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError || !session) {
      console.error('Error exchanging code for session:', sessionError)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent('Failed to authenticate with Google')}`
      )
    }
    
    // Handle the OAuth callback (create user/profile if needed)
    const { success, error, isNewUser } = await handleOAuthCallback()
    if (error || !success) {
      console.error('Error in OAuth callback:', error)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(error || 'Failed to create user profile')}`
      )
    }
    
    // Always redirect new Google users to onboarding
    const redirectUrl = new URL('/dashboard/onboarding/welcome', requestUrl.origin)
    console.log('Redirecting to:', redirectUrl.toString())
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Error during OAuth callback:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent('Authentication failed')}`
    )
  }
}
