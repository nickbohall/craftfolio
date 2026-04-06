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
    checkPremiumStatus()
      .then(async (status) => {
        setIsPremium(status);
        // Sync is_paid in Supabase to match RevenueCat (handles cross-device purchases)
        if (user) {
          try { await supabase.from('users').update({ is_paid: status }).eq('id', user.id); } catch {}
        }
      })
      .catch(() => setIsPremium(false))
      .finally(() => setLoading(false));
  }, [user]);

  const updateDatabase = useCallback(async () => {
    if (!user) return;
    await supabase.from('users').update({ is_paid: true }).eq('id', user.id);
  }, [user]);

  const purchase = useCallback(async () => {
    try {
      console.log('[Premium] purchase() called');
      setLoading(true);
      const success = await purchasePremium();
      console.log('[Premium] purchasePremium returned:', success);
      if (success) {
        setIsPremium(true);
        await updateDatabase();
      }
    } catch (e: any) {
      console.log('[Premium] purchase error:', e?.code, e?.message, e);
      // Silent return on cancel or failure
    } finally {
      setLoading(false);
    }
  }, [updateDatabase]);

  const restore = useCallback(async () => {
    try {
      setLoading(true);
      const success = await restorePurchases();
      if (success) {
        setIsPremium(true);
        await updateDatabase();
        Alert.alert('Restored', 'Your premium access has been restored.');
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
