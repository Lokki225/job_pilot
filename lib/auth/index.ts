// lib/auth/index.ts
'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Helper to create server-side Supabase client
async function createAuthClient() {
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
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete(name)
        },
      },
    }
  )
}

export const signUp = async (email: string, password: string) => {
  try {
    const supabase = await createAuthClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });

    if (signUpError) {
      console.error('SignUp error:', signUpError);
      return { user: null, session: null, error: signUpError.message };
    }

    if (!data.user) {
      return { user: null, session: null, error: 'Signup failed - no user returned' };
    }

    // Create user in your database
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: data.user.email!,
        role: 'USER',
      });

    if (userError && userError.code !== '23505') { // 23505 is unique violation
      console.error('User creation error:', userError);
      return { user: null, session: null, error: 'Failed to create user' };
    }

    // Return both user and session
    return { 
      user: data.user, 
      session: data.session, 
      error: null 
    };

  } catch (error: any) {
    console.error('Unexpected error in signUp:', error);
    return { 
      user: null, 
      session: null, 
      error: error.message || 'An unexpected error occurred' 
    };
  }
};

// Update login to return session
export const login = async (email: string, password: string) => {
  try {
    const supabase = await createAuthClient()
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    return { data, error };
  } catch (error: any) {
    console.error('Login error:', error);
    return { data: null, error: error.message || 'Login failed' };
  }
};

export const logout = async () => {
  try {
    const supabase = await createAuthClient()
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error during logout:', error);
    return { success: false, error: error.message || 'Logout failed' };
  }
};

// Get current authenticated user
export const getCurrentUser = async () => {
  try {
    const supabase = await createAuthClient()
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { user: null, error: error?.message || 'No user found' };
    }
    
    return { user, error: null };
  } catch (error: any) {
    console.error('Error getting current user:', error);
    return { user: null, error: error.message || 'Failed to get user' };
  }
};

export const signInWithGoogle = async () => {
  try {
    const supabase = await createAuthClient()
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      console.error('Error signing in with Google:', error)
      return { success: false, error: error.message }
    }

    // This will redirect the user to the Google consent page
    // The callback URL will be handled by our route handler
    return { 
      success: true, 
      url: data.url 
    }

  } catch (error: any) {
    console.error('Unexpected error during Google sign in:', error)
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    }
  }
}

// Add this function to handle the OAuth callback
export const handleOAuthCallback = async () => {
  try {
    const supabase = await createAuthClient()
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('No authenticated user found:', userError)
      return { 
        success: false, 
        error: userError?.message || 'No authenticated user found' 
      }
    }
    console.log("Processing OAuth callback for user:", user.id);
    
    try {
      // Check if user exists in your profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // If profile doesn't exist or there was an error (other than not found)
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking for existing profile:', profileError)
        throw new Error('Failed to check user profile')
      }

      // If no profile exists, create one
      if (!profile) {
        // Get the latest user data with metadata
        const { data: { user: userWithMetadata }, error: userMetadataError } = await supabase.auth.admin.getUserById(user.id)
        
        if (userMetadataError) {
          console.error('Error getting user metadata:', userMetadataError)
          throw new Error('Failed to get user metadata')
        }
        
        const userData = userWithMetadata || user
        const userMetadata = userData.user_metadata || {}
        
        const fullName = userMetadata.full_name || 
                        userMetadata.name || 
                        (userData.email?.split('@')[0] || 'User')
        
        // Split full name into first and last name
        const nameParts = fullName.trim().split(/\s+/)
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: userData.email || '',
            firstName: firstName,
            lastName: lastName,
            avatarUrl: userMetadata.avatar_url || userMetadata.picture || '',
            updatedAt: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error creating profile:', insertError)
          throw new Error('Failed to create user profile')
        }
        
        console.log('Successfully created profile for user:', user.id)
        return { success: true }
      }
      
      // If we get here, profile already exists
      console.log('Profile already exists for user:', user.id)
      return { success: true }
      
    } catch (error) {
      console.error('Error in profile handling:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during profile handling'
      }
    } 
  } catch (error: any) {
    console.error('Error in OAuth callback:', error)
    return { 
      success: false, 
      error: error.message || 'An error occurred during OAuth callback' 
    }
  }
}
