import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { initializePurchases } from '../lib/revenuecat';
import { generateSlug } from '../lib/slugUtils';

export { generateSlug };

const ONBOARDING_KEY = 'onboarding_complete';

async function ensureUserRow(session: Session): Promise<void> {
  const userId = session.user.id;

  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (data) return;

  const meta = session.user.user_metadata;
  const displayName =
    meta?.full_name ||
    meta?.name ||
    session.user.email?.split('@')[0] ||
    'Crafter';

  await supabase.from('users').insert({
    id: userId,
    email: session.user.email ?? '',
    display_name: displayName,
    portfolio_slug: generateSlug(displayName),
  });
}

async function checkIsNewUser(userId: string): Promise<boolean> {
  const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);
  if (onboardingDone === 'true') return false;

  const { data } = await supabase
    .from('users')
    .select('created_at')
    .eq('id', userId)
    .single();

  if (!data) return false;

  const createdAt = new Date(data.created_at).getTime();
  const now = Date.now();
  return now - createdAt < 60_000;
}

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isNewUser: boolean;
  completeOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isNewUser: false,
  completeOnboarding: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const purchasesInitialized = useRef(false);

  async function completeOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setIsNewUser(false);
  }

  async function handleSession(s: Session | null) {
    setSession(s);
    setUser(s?.user ?? null);
    if (s?.user) {
      await ensureUserRow(s).catch(console.warn);
      const newUser = await checkIsNewUser(s.user.id).catch(() => false);
      setIsNewUser(!!newUser);
      if (!purchasesInitialized.current) {
        purchasesInitialized.current = true;
        initializePurchases(s.user.id).catch(console.warn);
      }
    } else {
      setIsNewUser(false);
    }
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      handleSession(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        handleSession(s);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value = { user, session, loading, isNewUser, completeOnboarding };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  return useContext(AuthContext);
}
