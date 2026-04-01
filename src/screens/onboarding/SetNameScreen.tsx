import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useAuth, generateSlug } from '../../hooks/useAuth';

export default function SetNameScreen() {
  const { user, completeOnboarding } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const name = (data as any)?.display_name ?? '';
        setDisplayName(name);
        setOriginalName(name);
      });
  }, [user]);

  async function handleFinish() {
    if (!user || saving) return;
    setSaving(true);

    try {
      const trimmed = displayName.trim() || originalName;
      if (trimmed !== originalName) {
        await supabase
          .from('users')
          .update({
            display_name: trimmed,
            portfolio_slug: generateSlug(trimmed),
          })
          .eq('id', user.id);
      }
      await completeOnboarding();
    } catch (e) {
      console.warn('Onboarding finish error:', e);
      await completeOnboarding();
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.heading}>What should we call you?</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={Colors.textTertiary}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleFinish}
        />
        <Text style={styles.hint}>This is how you'll appear in your portfolio</Text>
      </View>
      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleFinish}
          disabled={saving}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : 'Start Crafting'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: Colors.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  bottom: {
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  button: {
    backgroundColor: Colors.primaryLight,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#4A3D6B',
  },
});
