import { supabase } from '../lib/supabase'

export const getSession = () =>
  supabase.auth.getSession()

export const onAuthStateChange = (callback) =>
  supabase.auth.onAuthStateChange(callback)

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () =>
  supabase.auth.signOut()
