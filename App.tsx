import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from './src/hooks/useAuth';
import { signOut } from './src/lib/supabase';
import { Colors } from './src/constants/colors';
import SignInScreen from './src/screens/auth/SignInScreen';
import SignUpScreen from './src/screens/auth/SignUpScreen';

const Stack = createNativeStackNavigator();

function AuthenticatedPlaceholder() {
  const { user } = useAuth();

  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>Authenticated</Text>
      <Text style={styles.placeholderEmail}>{user?.email}</Text>
      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Home" component={AuthenticatedPlaceholder} />
        ) : (
          <>
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 32,
  },
  placeholderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  placeholderEmail: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
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
