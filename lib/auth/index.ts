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
