import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useAuth, AuthProvider } from './src/hooks/useAuth';
import { supabase } from './src/lib/supabase';
import { PremiumProvider } from './src/hooks/usePremium';
import { Colors } from './src/constants/colors';
import SignInScreen from './src/screens/auth/SignInScreen';
import SignUpScreen from './src/screens/auth/SignUpScreen';
import AddPhotosScreen from './src/screens/projects/AddPhotosScreen';
import AddDetailsScreen from './src/screens/projects/AddDetailsScreen';
import AddMaterialScreen from './src/screens/projects/AddMaterialScreen';
import ProjectDetailScreen from './src/screens/projects/ProjectDetailScreen';
import EditProjectScreen from './src/screens/projects/EditProjectScreen';
import EditPhotosScreen from './src/screens/projects/EditPhotosScreen';
import JournalScreen from './src/screens/journal/JournalScreen';
import MaterialsScreen from './src/screens/materials/MaterialsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import UpgradeScreen from './src/screens/profile/UpgradeScreen';
import WelcomeScreen from './src/screens/onboarding/WelcomeScreen';
import FeaturesScreen from './src/screens/onboarding/FeaturesScreen';
import SetNameScreen from './src/screens/onboarding/SetNameScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

type RootStackParamList = {
  Tabs: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  AddPhotos: undefined;
  AddDetails: { photos: string[] };
  AddMaterial: { projectId: string; materialId?: string };
  ProjectDetail: { projectId: string };
  EditProject: { projectId: string };
  EditPhotos: { projectId: string };
  Upgrade: undefined;
  OnboardingWelcome: undefined;
  OnboardingFeatures: undefined;
  OnboardingSetName: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tab.Screen
        name="Journal"
        component={JournalScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name={focused ? 'book' : 'book-outline'} size={size} color={color} />
              {focused && <View style={{ width: 6, height: 3, borderRadius: 1.5, backgroundColor: Colors.primary, marginTop: 4 }} />}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Materials"
        component={MaterialsScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size} color={color} />
              {focused && <View style={{ width: 6, height: 3, borderRadius: 1.5, backgroundColor: Colors.primary, marginTop: 4 }} />}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
              {focused && <View style={{ width: 6, height: 3, borderRadius: 1.5, backgroundColor: Colors.primary, marginTop: 4 }} />}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { session, loading, isNewUser } = useAuth();

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      if (event.url.includes('auth/callback')) {
        await supabase.auth.exchangeCodeForSession(event.url);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then(url => {
      if (url && url.includes('auth/callback')) {
        supabase.auth.exchangeCodeForSession(url);
      }
    });

    return () => subscription.remove();
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <Image
          source={require('./assets/images/mascot-neutral.png')}
          style={styles.splashMascot}
          resizeMode="contain"
        />
        <Text style={styles.splashTitle}>Craftfolio</Text>
        <Text style={styles.splashTagline}>Your handmade portfolio.</Text>
        <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <PremiumProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            <>
              <Stack.Screen name="SignIn" component={SignInScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          ) : isNewUser ? (
            <>
              <Stack.Screen name="OnboardingWelcome" component={WelcomeScreen} />
              <Stack.Screen name="OnboardingFeatures" component={FeaturesScreen} />
              <Stack.Screen name="OnboardingSetName" component={SetNameScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Tabs" component={TabNavigator} />
              <Stack.Screen name="AddPhotos" component={AddPhotosScreen} />
              <Stack.Screen name="AddDetails" component={AddDetailsScreen} />
              <Stack.Screen name="AddMaterial" component={AddMaterialScreen} />
              <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
              <Stack.Screen name="EditProject" component={EditProjectScreen} />
              <Stack.Screen name="EditPhotos" component={EditPhotosScreen} />
              <Stack.Screen name="Upgrade" component={UpgradeScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PremiumProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  splashMascot: {
    width: 180,
    height: 180,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '500',
    color: Colors.text,
    marginTop: 16,
  },
  splashTagline: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
