import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

const API_KEY = Platform.OS === 'ios'
  ? (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? '')
  : (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '');
const ENTITLEMENT_ID = 'premium';

export async function initializePurchases(userId: string): Promise<void> {
  Purchases.configure({ apiKey: API_KEY, appUserID: userId });
}

export async function getOfferings(): Promise<any> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePremium(): Promise<boolean> {
  const offerings = await Purchases.getOfferings();
  const currentOffering = offerings.current;
  if (!currentOffering) return false;

  const pkg = currentOffering.lifetime ?? currentOffering.availablePackages[0];
  if (!pkg) return false;

  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export async function restorePurchases(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export async function checkPremiumStatus(): Promise<boolean> {
  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}
