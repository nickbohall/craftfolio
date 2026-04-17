import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { usePremium } from '../../hooks/usePremium';

const TERMS_URL = 'https://www.getcraftfolio.com/terms';
const PRIVACY_URL = 'https://www.getcraftfolio.com/privacy';

export default function UpgradeScreen({ navigation }: any) {
  const { isPremium, loading, purchase, restore } = usePremium();

  const handlePurchase = async () => {
    try {
      await purchase();
    } catch (e: any) {
      Alert.alert('Purchase failed', e?.message ?? 'Please try again.');
    }
  };

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  if (isPremium) {
    return (
      <View style={styles.container}>
        <Image
          source={require('../../../assets/images/mascot-happy.png')}
          style={styles.mascot}
          resizeMode="contain"
        />
        <View style={styles.premiumBadgeLarge}>
          <Ionicons name="sparkles" size={16} color="#4A3D6B" />
          <Text style={styles.premiumBadgeLargeText}>Premium</Text>
        </View>
        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subtitle}>
          Thanks for supporting Craftfolio. You have full access to every
          feature — unlimited projects, AI material scanning, and shareable
          links.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unlock Craftfolio</Text>
      <Text style={styles.subtitle}>One-time purchase. No subscription.</Text>

      <View style={styles.features}>
        <Text style={styles.feature}>Unlimited projects</Text>
        <Text style={styles.feature}>AI material scanning</Text>
        <Text style={styles.feature}>Shareable project links</Text>
      </View>

      <Text style={styles.price}>$4.99</Text>

      <TouchableOpacity
        style={[styles.purchaseButton, loading && styles.buttonDisabled]}
        onPress={handlePurchase}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.purchaseButtonText}>Unlock Craftfolio</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.restoreButton}
        onPress={restore}
        disabled={loading}
      >
        <Text style={styles.restoreText}>Restore Purchase</Text>
      </TouchableOpacity>

      <Text style={styles.legalText}>
        By purchasing, you agree to our{' '}
        <Text style={styles.legalLink} onPress={() => openLink(TERMS_URL)}>
          Terms of Use
        </Text>
        {' '}and{' '}
        <Text style={styles.legalLink} onPress={() => openLink(PRIVACY_URL)}>
          Privacy Policy
        </Text>
        . Payment will be charged to your account. This is a one-time
        purchase, not a subscription.
      </Text>

      <TouchableOpacity
        style={styles.backLink}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backLinkText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 32,
  },
  mascot: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  premiumBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },
  premiumBadgeLargeText: {
    color: '#4A3D6B',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  legalText: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 20,
    paddingHorizontal: 8,
  },
  legalLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  features: {
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    marginBottom: 32,
  },
  feature: {
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 8,
  },
  price: {
    fontSize: 36,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 16,
  },
  purchaseButton: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    height: 52,
    justifyContent: 'center',
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  restoreButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  restoreText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  backLink: {
    marginTop: 12,
    paddingVertical: 12,
  },
  backLinkText: {
    color: Colors.primary,
    fontSize: 14,
  },
  backButton: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 24,
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
