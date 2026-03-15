import { useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { initializePurchases } from '../lib/revenuecat';

function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${suffix}`;
}

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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const purchasesInitialized = useRef(false);

  async function handleSession(session: Session | null) {
    setSession(session);
    setUser(session?.user ?? null);
    if (session?.user) {
      await ensureUserRow(session).catch(console.warn);
      if (!purchasesInitialized.current) {
        purchasesInitialized.current = true;
        initializePurchases(session.user.id).catch(console.warn);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
