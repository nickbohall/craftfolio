import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { resetPassword } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { validatePasswordReset } from '../../lib/validation';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    const validationError = validatePasswordReset(email);
    if (validationError) {
      setError(validationError);
      return;
    }
    const trimmed = email.trim();

    setError('');
    setLoading(true);
    try {
      await resetPassword(trimmed);
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.description}>
            We sent a password reset link to {email.trim()}. Check your inbox and follow the link to reset your password.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.description}>
          Enter the email address you signed up with and we'll send you a link to reset your password.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>
            Back to <Text style={styles.linkBold}>Sign In</Text>
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
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  error: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
  },
  linkBold: {
    color: Colors.primary,
    fontWeight: '500',
  },
});
