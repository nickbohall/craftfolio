import React, { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, Share, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { supabase, signOut } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { usePremium } from '../../hooks/usePremium';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { isPremium, devToggle } = usePremium();
  const navigation = useNavigation<any>();
  const [portfolioSlug, setPortfolioSlug] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      supabase
        .from('users')
        .select('portfolio_slug')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setPortfolioSlug((data as any).portfolio_slug ?? null);
        });
    }, [user])
  );

  function handleSharePortfolio() {
    if (!isPremium) {
      navigation.navigate('Upgrade');
      return;
    }
    const slug = portfolioSlug ?? user?.id;
    const url = `https://getcraftfolio.com/u/${slug}`;
    Share.share({ message: `Check out my craft portfolio: ${url}`, url });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../../../assets/images/mascot-neutral.png')}
          style={styles.mascot}
          resizeMode="contain"
        />
        <Text style={styles.displayName}>{user?.user_metadata?.display_name ?? 'Crafter'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.cardGroup}>
        <TouchableOpacity style={styles.row} onPress={handleSharePortfolio}>
          <Text style={styles.rowText}>Share Portfolio</Text>
          {isPremium ? (
            <Text style={styles.chevron}>›</Text>
          ) : (
            <Text style={styles.lockedText}>Premium</Text>
          )}
        </TouchableOpacity>

        {!isPremium && (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Upgrade')}
          >
            <Text style={styles.rowText}>Upgrade to Premium</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.row} onPress={signOut}>
          <Text style={styles.rowText}>Sign Out</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity style={styles.row} onPress={devToggle}>
            <Text style={styles.rowText}>Toggle Premium (Dev)</Text>
            <Text style={styles.devBadge}>{isPremium ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mascot: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  cardGroup: {
    gap: 1,
  },
  row: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '400',
  },
  chevron: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  lockedText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },
  devBadge: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },
});
