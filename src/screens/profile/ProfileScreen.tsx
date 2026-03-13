import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { signOut } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { usePremium } from '../../hooks/usePremium';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>{user?.email}</Text>
      {!isPremium && (
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => navigation.navigate('Upgrade')}
        >
          <Text style={styles.upgradeText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
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
  email: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  upgradeButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  upgradeText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  signOutText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
