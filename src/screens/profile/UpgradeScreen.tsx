import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { usePremium } from '../../hooks/usePremium';

export default function UpgradeScreen({ navigation }: any) {
  const { isPremium, loading, purchase, restore } = usePremium();

  if (isPremium) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>You're Premium!</Text>
        <Text style={styles.subtitle}>
          You have full access to Craftfolio.
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
        onPress={purchase}
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  features: {
    alignSelf: 'stretch',
    backgroundColor: Colors.white,
    borderRadius: 12,
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
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  purchaseButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  restoreButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  restoreText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  backButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 24,
  },
  backButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
