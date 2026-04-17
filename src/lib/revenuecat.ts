import { Platform } from 'react-native';
import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';
import { supabase } from './supabase';

const API_KEY = Platform.OS === 'ios'
  ? (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? '')
  : (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '');
const ENTITLEMENT_ID = 'premium';
let sdkConfigured = false;
let configuredUserId: string | null = null;

export type PurchaseOutcome = 'success' | 'pending' | 'not_entitled';

function isErrorCode(e: any, code: PURCHASES_ERROR_CODE): boolean {
  return e?.code === code || e?.userInfo?.code === code;
}

async function handlePendingAndRecheck(): Promise<PurchaseOutcome> {
  console.log('[RevenueCat] PaymentPending — calling syncPurchasesForResult to reconcile');
  try {
    await Purchases.syncPurchasesForResult();
  } catch (syncErr: any) {
    console.log('[RevenueCat] syncPurchasesForResult failed:', syncErr?.code, syncErr?.message);
  }
  const info = await Purchases.getCustomerInfo();
  const hasPremium = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
  console.log('[RevenueCat] post-sync entitlement active:', hasPremium);
  if (hasPremium) {
    await syncIsPaid(true);
    return 'success';
  }
  return 'pending';
}

export async function initializePurchases(userId: string): Promise<void> {
  if (!sdkConfigured) {
    console.log('[RevenueCat] configure', { platform: Platform.OS, hasKey: !!API_KEY, userId });
    Purchases.configure({ apiKey: API_KEY, appUserID: userId });
    sdkConfigured = true;
  } else {
    console.log('[RevenueCat] SDK already configured — skipping configure, proceeding to logIn');
  }
  await logInPurchases(userId);
}

export async function logInPurchases(userId: string): Promise<void> {
  try {
    const before = await Purchases.getCustomerInfo();
    console.log('[RevenueCat] logIn BEFORE — RC appUserID:', before.originalAppUserId, '| target:', userId);
  } catch (e: any) {
    console.log('[RevenueCat] logIn BEFORE — getCustomerInfo failed:', e?.message ?? e);
  }

  const { customerInfo, created } = await Purchases.logIn(userId);
  configuredUserId = userId;
  console.log('[RevenueCat] logIn AFTER — RC appUserID:', customerInfo.originalAppUserId, '| created:', created);
}

export async function logOutPurchases(): Promise<void> {
  if (!sdkConfigured) {
    console.log('[RevenueCat] logOut skipped — SDK not configured yet');
    return;
  }
  try {
    const before = await Purchases.getCustomerInfo();
    console.log('[RevenueCat] logOut BEFORE — RC appUserID:', before.originalAppUserId);
    await Purchases.logOut();
    const after = await Purchases.getCustomerInfo();
    console.log('[RevenueCat] logOut AFTER — RC appUserID:', after.originalAppUserId);
    configuredUserId = null;
  } catch (e: any) {
    // logOut throws if the user is already anonymous — that's fine, log and continue
    console.log('[RevenueCat] logOut error (likely already anonymous):', e?.code, e?.message);
    configuredUserId = null;
  }
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

export async function purchasePremium(): Promise<PurchaseOutcome> {
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
    return 'not_entitled';
  }

  const pkg = currentOffering.lifetime ?? currentOffering.availablePackages[0];
  console.log('[RevenueCat] package:', pkg ? `"${pkg.identifier}"` : 'null');

  if (!pkg) {
    console.warn('[RevenueCat] No package available in offering');
    return 'not_entitled';
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    console.log('[RevenueCat] purchase complete, hasPremium:', hasPremium);
    if (hasPremium) {
      await syncIsPaid(true);
      return 'success';
    }
    return 'not_entitled';
  } catch (e: any) {
    if (isErrorCode(e, PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR)) {
      console.log('[RevenueCat] purchase returned PaymentPending');
      return await handlePendingAndRecheck();
    }
    if (isErrorCode(e, PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR)) {
      console.log('[RevenueCat] ProductAlreadyPurchased — restoring...');
      return await restorePurchases();
    }
    // Re-throw all other errors (cancel, network, etc.)
    throw e;
  }
}

export async function restorePurchases(): Promise<PurchaseOutcome> {
  console.log('[RevenueCat] restoring purchases...');
  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    console.log('[RevenueCat] restore result, hasPremium:', hasPremium);
    if (hasPremium) {
      await syncIsPaid(true);
      return 'success';
    }
    return 'not_entitled';
  } catch (e: any) {
    if (isErrorCode(e, PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR)) {
      console.log('[RevenueCat] restore returned PaymentPending');
      return await handlePendingAndRecheck();
    }
    throw e;
  }
}

export async function checkPremiumStatus(): Promise<boolean> {
  console.log('[RevenueCat] checking premium status...');
  const customerInfo = await Purchases.getCustomerInfo();
  const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  console.log('[RevenueCat] premium status:', hasPremium);
  return hasPremium;
}
