import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { supabase } from './supabase';

const API_KEY = Platform.OS === 'ios'
  ? (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? '')
  : (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '');
const ENTITLEMENT_ID = 'premium';
const ALREADY_PURCHASED_CODE = 6;
let configuredUserId: string | null = null;

export async function initializePurchases(userId: string): Promise<void> {
  console.log('[RevenueCat] configure', { platform: Platform.OS, hasKey: !!API_KEY, userId });
  Purchases.configure({ apiKey: API_KEY, appUserID: userId });

  // Explicitly log in to ensure purchases are linked to this Supabase user
  console.log('[RevenueCat] calling logIn with userId:', userId);
  const { customerInfo } = await Purchases.logIn(userId);
  configuredUserId = userId;
  console.log('[RevenueCat] logIn complete, RC appUserID:', customerInfo.originalAppUserId);
}

export async function getOfferings(): Promise<any> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

async function syncIsPaid(isPaid: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('[RevenueCat] syncIsPaid: no user, skipping');
    return;
  }
  console.log('[RevenueCat] syncIsPaid: updating is_paid =', isPaid, 'for user', user.id);
  const { error } = await supabase.from('users').update({ is_paid: isPaid }).eq('id', user.id);
  if (error) {
    console.log('[RevenueCat] syncIsPaid error:', error.message);
  } else {
    console.log('[RevenueCat] syncIsPaid: success');
  }
}

export async function purchasePremium(): Promise<boolean> {
  // Verify correct user is identified before purchasing
  const customerInfoPre = await Purchases.getCustomerInfo();
  console.log('[RevenueCat] purchasePremium: RC user at time of purchase:', customerInfoPre.originalAppUserId, '| configured:', configuredUserId);

  // If RC has an anonymous user or mismatched user, re-identify
  if (configuredUserId && customerInfoPre.originalAppUserId !== configuredUserId) {
    console.log('[RevenueCat] user mismatch — re-identifying as', configuredUserId);
    await Purchases.logIn(configuredUserId);
  }

  console.log('[RevenueCat] purchasePremium: fetching offerings...');
  const offerings = await Purchases.getOfferings();
  const currentOffering = offerings.current;
  console.log('[RevenueCat] currentOffering:', currentOffering ? `"${currentOffering.identifier}" with ${currentOffering.availablePackages.length} packages` : 'null');

  if (!currentOffering) {
    console.warn('[RevenueCat] No current offering — check RevenueCat dashboard');
    return false;
  }

  const pkg = currentOffering.lifetime ?? currentOffering.availablePackages[0];
  console.log('[RevenueCat] package:', pkg ? `"${pkg.identifier}"` : 'null');

  if (!pkg) {
    console.warn('[RevenueCat] No package available in offering');
    return false;
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    console.log('[RevenueCat] purchase complete, hasPremium:', hasPremium);
    if (hasPremium) {
      await syncIsPaid(true);
    }
    return hasPremium;
  } catch (e: any) {
    // Product already purchased — restore and check entitlement
    if (e?.code === ALREADY_PURCHASED_CODE || e?.userInfo?.code === ALREADY_PURCHASED_CODE) {
      console.log('[RevenueCat] ProductAlreadyPurchased — restoring...');
      const restored = await restorePurchases();
      console.log('[RevenueCat] restore after already-purchased, hasPremium:', restored);
      if (restored) {
        await syncIsPaid(true);
      }
      return restored;
    }
    // Re-throw all other errors (cancel, network, etc.)
    throw e;
  }
}

export async function restorePurchases(): Promise<boolean> {
  console.log('[RevenueCat] restoring purchases...');
  const customerInfo = await Purchases.restorePurchases();
  const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  console.log('[RevenueCat] restore result, hasPremium:', hasPremium);
  if (hasPremium) {
    await syncIsPaid(true);
  }
  return hasPremium;
}

export async function checkPremiumStatus(): Promise<boolean> {
  console.log('[RevenueCat] checking premium status...');
  const customerInfo = await Purchases.getCustomerInfo();
  const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  console.log('[RevenueCat] premium status:', hasPremium);
  return hasPremium;
}
