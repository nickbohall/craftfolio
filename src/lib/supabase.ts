import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

function generateSlug(displayName: string): string {
  const base = displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${suffix}`;
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Sign up succeeded but no user returned');

  const { error: insertError } = await supabase.from('users').insert({
    id: authData.user.id,
    email,
    display_name: displayName,
    portfolio_slug: generateSlug(displayName),
  });

  if (insertError) throw insertError;

  return authData;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
