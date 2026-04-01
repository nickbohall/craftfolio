import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { File as ExpoFile } from 'expo-file-system';
import type { Database } from '../types/database';

WebBrowser.maybeCompleteAuthSession();

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

import { generateSlug } from './slugUtils';

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

export async function signInWithGoogle(): Promise<void> {
  const redirectUrl = AuthSession.makeRedirectUri({
    scheme: 'craftfolio',
    path: 'auth/callback',
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectUrl
  );

  if (result.type === 'success') {
    const { url } = result;

    // Supabase returns tokens in hash fragment, not query params
    const hashParams = new URLSearchParams(url.split('#')[1]);
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;
    }
  }
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function uploadProjectPhoto(localUri: string, userId: string): Promise<string> {
  const file = new ExpoFile(localUri);
  const arrayBuffer = await file.arrayBuffer();

  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const { error } = await supabase.storage
    .from('project-photos')
    .upload(filename, arrayBuffer, { contentType: 'image/jpeg' });

  if (error) throw error;

  const { data } = supabase.storage
    .from('project-photos')
    .getPublicUrl(filename);

  return data.publicUrl;
}
