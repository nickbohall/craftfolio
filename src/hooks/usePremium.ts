import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  checkPremiumStatus,
  purchasePremium,
  restorePurchases,
} from '../lib/revenuecat';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

type PremiumContextType = {
  isPremium: boolean;
  loading: boolean;
  purchase: () => Promise<void>;
  restore: () => Promise<void>;
  devToggle: () => void;
};

const PremiumContext = createContext<PremiumContextType>({
  isPremium: false,
  loading: true,
  purchase: async () => {},
  restore: async () => {},
  devToggle: () => {},
});

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!user) {
          if (!cancelled) setIsPremium(false);
          return;
        }

        const { data, error } = await supabase
          .from('users')
          .select('is_paid')
          .eq('id', user.id)
          .single();
        console.log('[Premium] Supabase is_paid raw:', data?.is_paid, '| user:', user.id, '| error:', error?.message);

        const dbPaid = data?.is_paid === true;
        if (!cancelled) setIsPremium(dbPaid);

        // RevenueCat can only UPGRADE Supabase (false -> true), never downgrade.
        // Supabase is_paid is the source of truth.
        let rcPaid = false;
        try {
          rcPaid = await checkPremiumStatus();
        } catch (e: any) {
          console.log('[Premium] checkPremiumStatus failed:', e?.message ?? e);
        }
        console.log('[Premium] RC hasPremium:', rcPaid, '| DB is_paid:', dbPaid, '| resolved isPremium:', dbPaid || rcPaid);

        if (rcPaid && !dbPaid) {
          console.log('[Premium] RC says paid but DB says not — upgrading DB');
          await supabase.from('users').update({ is_paid: true }).eq('id', user.id);
          if (!cancelled) setIsPremium(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const updateDatabase = useCallback(async () => {
    if (!user) return;
    await supabase.from('users').update({ is_paid: true }).eq('id', user.id);
  }, [user]);

  const purchase = useCallback(async () => {
    try {
      console.log('[Premium] purchase() called');
      setLoading(true);
      const result = await purchasePremium();
      console.log('[Premium] purchasePremium returned:', result);
      if (result === 'success') {
        setIsPremium(true);
        await updateDatabase();
      } else if (result === 'pending') {
        Alert.alert(
          'Payment processing',
          'Your purchase is being processed. You\'ll get access as soon as it completes.',
        );
      }
      // 'not_entitled' → silent (user canceled or no offering)
    } catch (e: any) {
      console.log('[Premium] purchase error:', e?.code, e?.message, e);
      // TODO(debug): remove re-throw before release — added so UpgradeScreen can Alert errors
      throw e;
    } finally {
      setLoading(false);
    }
  }, [updateDatabase]);

  const restore = useCallback(async () => {
    try {
      setLoading(true);
      const result = await restorePurchases();
      if (result === 'success') {
        setIsPremium(true);
        await updateDatabase();
        Alert.alert('Restored', 'Your premium access has been restored.');
      } else if (result === 'pending') {
        Alert.alert(
          'Payment processing',
          'Your purchase is being processed. You\'ll get access as soon as it completes.',
        );
      } else {
        Alert.alert('No purchase found', 'We couldn\'t find a previous purchase for this account.');
      }
    } catch (e: any) {
      Alert.alert('Restore failed', e.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [updateDatabase]);

  const devToggle = useCallback(() => {
    setIsPremium((prev) => {
      const next = !prev;
      Alert.alert('Dev Mode', `Premium ${next ? 'enabled' : 'disabled'}`);
      return next;
    });
  }, []);

  const value = { isPremium, loading, purchase, restore, devToggle };

  return React.createElement(PremiumContext.Provider, { value }, children);
}

export function usePremium() {
  return useContext(PremiumContext);
}
