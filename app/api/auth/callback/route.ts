// app/api/auth/callback/route.ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { handleOAuthCallback } from '@/lib/auth'
import { adminSupabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (!code) {
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent('No code provided')}`
    )
  }
  
  try {
    // Exchange the code for a session
    const { data: { session }, error: sessionError } = await adminSupabase.auth.exchangeCodeForSession(code)
    
    if (sessionError || !session) {
      console.error('Error exchanging code for session:', sessionError)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent('Failed to authenticate with Google')}`
      )
    }
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await adminSupabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Error getting authenticated user:', userError)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent('Failed to get user information')}`
      )
    }
    
    // Ensure we have the latest user data
    const { data: { user: updatedUser }, error: updateError } = await adminSupabase.auth.admin.getUserById(user.id)
    
    if (updateError || !updatedUser) {
      console.error('Error getting updated user:', updateError)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent('Failed to get updated user information')}`
      )
    }
    
    // Handle the OAuth callback (create profile if needed)
    const { success, error } = await handleOAuthCallback()
    if (error || !success) {
      console.error('Error in OAuth callback:', error)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(error || 'Failed to create user profile')}`
      )
    }
    
    // Force a refresh of the auth state
    await adminSupabase.auth.refreshSession()
    
    // If everything is successful, redirect to dashboard
    return NextResponse.redirect(requestUrl.origin + '/dashboard')
  } catch (error) {
    console.error('Error during OAuth callback:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent('Authentication failed')}`
    )
  }
}
