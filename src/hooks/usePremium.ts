import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  checkPremiumStatus,
  purchasePremium,
  restorePurchases,
} from '../lib/revenuecat';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function usePremium() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPremiumStatus()
      .then(setIsPremium)
      .catch(() => setIsPremium(false))
      .finally(() => setLoading(false));
  }, []);

  const updateDatabase = useCallback(async () => {
    if (!user) return;
    await supabase.from('users').update({ is_paid: true }).eq('id', user.id);
  }, [user]);

  const purchase = useCallback(async () => {
    try {
      setLoading(true);
      const success = await purchasePremium();
      if (success) {
        setIsPremium(true);
        await updateDatabase();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', e.message ?? 'Please try again.');
      }
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

  return { isPremium, loading, purchase, restore };
}
