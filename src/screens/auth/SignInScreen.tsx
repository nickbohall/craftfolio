import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signInWithEmail, signInWithGoogle } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { validateSignIn } from '../../lib/validation';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message || 'Failed to sign in with Google.');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSignIn() {
    const validationErrors = validateSignIn(email, password);
    if (validationErrors) {
      setError(validationErrors.form ?? 'Invalid input.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (e: any) {
      setError(e.message || 'Failed to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Image
          source={require('../../../assets/images/mascot-neutral.png')}
          style={styles.mascot}
          resizeMode="contain"
        />
        <Text style={styles.title}>Craftfolio</Text>
        <Text style={styles.subtitle}>Your handmade portfolio.</Text>

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
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
        />

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={googleLoading}
        >
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleButtonText}>
            {googleLoading ? 'Signing In...' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.link}>
            Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
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
  mascot: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    height: 52,
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  googleG: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: 10,
  },
  googleButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
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
  forgotText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
});
