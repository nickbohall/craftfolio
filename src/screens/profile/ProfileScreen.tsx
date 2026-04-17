import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Share, Alert, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { supabase, signOut } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { usePremium } from '../../hooks/usePremium';
import { generateSlug } from '../../lib/slugUtils';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { isPremium, devToggle } = usePremium();
  const navigation = useNavigation<any>();
  const [portfolioSlug, setPortfolioSlug] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      supabase
        .from('users')
        .select('portfolio_slug, display_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setPortfolioSlug((data as any).portfolio_slug ?? null);
            setDisplayName((data as any).display_name ?? '');
          }
        });
    }, [user])
  );

  async function handleSaveName() {
    if (!user) return;
    const trimmed = editNameValue.trim();
    if (!trimmed || trimmed === displayName) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    await supabase
      .from('users')
      .update({ display_name: trimmed, portfolio_slug: generateSlug(trimmed) })
      .eq('id', user.id);
    setDisplayName(trimmed);
    setPortfolioSlug(generateSlug(trimmed));
    setSavingName(false);
    setEditingName(false);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your projects, photos, and materials. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) throw new Error('No session');

              const response = await supabase.functions.invoke('delete-account', {
                headers: { Authorization: `Bearer ${session.access_token}` },
              });

              if (response.error || !response.data?.success) {
                throw new Error('Delete failed');
              }

              await signOut();
            } catch {
              Alert.alert(
                'Error',
                'Something went wrong. Email support@getcraftfolio.com to request deletion.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

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
      <View style={styles.headerBand}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <View style={styles.profileSection}>
        <Image
          source={require('../../../assets/images/mascot-icon.png')}
          style={styles.mascot}
          resizeMode="contain"
        />
        {editingName ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={styles.editNameInput}
              value={editNameValue}
              onChangeText={setEditNameValue}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
              placeholder="Display name"
              placeholderTextColor={Colors.textTertiary}
            />
            {savingName ? (
              <ActivityIndicator size="small" color={Colors.success} />
            ) : (
              <>
                <TouchableOpacity onPress={handleSaveName} hitSlop={8}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingName(false)} hitSlop={8}>
                  <Ionicons name="close-circle" size={24} color={Colors.error} />
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.nameRow}
            onPress={() => { setEditNameValue(displayName); setEditingName(true); }}
          >
            <Text style={styles.displayName}>{displayName || 'Crafter'}</Text>
            <Ionicons name="pencil" size={16} color={Colors.textTertiary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}
        <Text style={styles.email}>{user?.email}</Text>
        {isPremium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="sparkles" size={12} color="#4A3D6B" />
            <Text style={styles.premiumBadgeText}>Premium</Text>
          </View>
        )}
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

        {devUnlocked && (
          <TouchableOpacity style={styles.row} onPress={devToggle}>
            <Text style={styles.rowText}>Toggle Premium (Dev)</Text>
            <Text style={styles.devBadge}>{isPremium ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.deleteRow}
        onPress={handleDeleteAccount}
        disabled={deleting}
      >
        {deleting ? (
          <ActivityIndicator size="small" color="#D32F2F" />
        ) : (
          <Text style={styles.deleteText}>Delete Account</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.versionContainer}
        activeOpacity={1}
        onPress={() => {
          tapCountRef.current += 1;
          if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
          if (tapCountRef.current >= 7) {
            tapCountRef.current = 0;
            setDevUnlocked((prev) => !prev);
          } else {
            tapTimerRef.current = setTimeout(() => {
              tapCountRef.current = 0;
            }, 2000);
          }
        }}
      >
        <Text style={styles.versionText}>Craftfolio v1.0.0</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBand: {
    backgroundColor: Colors.primaryLight,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A3D6B',
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  mascot: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  editNameInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    fontSize: 16,
    color: Colors.text,
    minWidth: 180,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  premiumBadgeText: {
    color: '#4A3D6B',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  cardGroup: {
    gap: 1,
    paddingHorizontal: 20,
  },
  row: {
    backgroundColor: Colors.surface,
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
  deleteRow: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#D32F2F',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 'auto',
    marginBottom: 30,
  },
  versionText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});
