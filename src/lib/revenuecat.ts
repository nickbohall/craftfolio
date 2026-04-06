import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

const API_KEY = Platform.OS === 'ios'
  ? (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? '')
  : (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '');
const ENTITLEMENT_ID = 'premium';

export async function initializePurchases(userId: string): Promise<void> {
  console.log('[RevenueCat] configure', { platform: Platform.OS, hasKey: !!API_KEY, userId });
  Purchases.configure({ apiKey: API_KEY, appUserID: userId });
}

export async function getOfferings(): Promise<any> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePremium(): Promise<boolean> {
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

  const { customerInfo } = await Purchases.purchasePackage(pkg);
  const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  console.log('[RevenueCat] purchase complete, hasPremium:', hasPremium);
  return hasPremium;
}

export async function restorePurchases(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export async function checkPremiumStatus(): Promise<boolean> {
  console.log('[RevenueCat] checking premium status...');
  const customerInfo = await Purchases.getCustomerInfo();
  const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  console.log('[RevenueCat] premium status:', hasPremium);
  return hasPremium;
}
