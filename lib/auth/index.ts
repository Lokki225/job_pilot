// lib/actions/auth.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export const signUp = async (email: string, password: string) => {
  try {
    const supabase = await createClient() // ← IMPORTANT : créer le client ici

    // 1. Créer l'utilisateur dans Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    })

    if (signUpError) {
      console.error('SignUp error:', signUpError)
      return { user: null, error: signUpError.message }
    }

    if (!data.user) {
      return { user: null, error: 'Signup failed - no user returned' }
    }

    // 2. Créer l'enregistrement dans la table users
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: data.user.email!,
        role: 'USER',
      })

    if (userError) {
      console.error('User creation error:', userError)
      // Ne pas bloquer si c'est un duplicate (l'utilisateur existe déjà)
      if (userError.code !== '23505') {
        return { user: null, error: 'Failed to create user profile' }
      }
    }

    // 3. Créer le profil vide
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        userid: data.user.id,
      })

    if (profileError && profileError.code !== '23505') {
      console.error('Profile creation error:', profileError)
    }

    return { user: data.user, error: null }

  } catch (error: any) {
    console.error('Unexpected error in signUp:', error)
    return { user: null, error: error.message || 'An unexpected error occurred' }
  }
}

export const login = async (email: string, password: string) => {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
}

export const logout = async () => {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut();
    return error;
}

// get authenticated user
export const getAuthUser = async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser();
    if (user == null) return;
    return user;
}