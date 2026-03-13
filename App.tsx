import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from './src/hooks/useAuth';
import { Colors } from './src/constants/colors';
import SignInScreen from './src/screens/auth/SignInScreen';
import SignUpScreen from './src/screens/auth/SignUpScreen';
import AddPhotosScreen from './src/screens/projects/AddPhotosScreen';
import AddDetailsScreen from './src/screens/projects/AddDetailsScreen';
import AddMaterialScreen from './src/screens/projects/AddMaterialScreen';
import ProjectDetailScreen from './src/screens/projects/ProjectDetailScreen';
import EditProjectScreen from './src/screens/projects/EditProjectScreen';
import JournalScreen from './src/screens/journal/JournalScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import UpgradeScreen from './src/screens/profile/UpgradeScreen';

type RootStackParamList = {
  Tabs: undefined;
  SignIn: undefined;
  SignUp: undefined;
  AddPhotos: undefined;
  AddDetails: { photos: string[] };
  AddMaterial: { projectId: string; materialId?: string };
  ProjectDetail: { projectId: string };
  EditProject: { projectId: string };
  Upgrade: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
        },
      }}
    >
      <Tab.Screen name="Journal" component={JournalScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
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
          <>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen name="AddPhotos" component={AddPhotosScreen} />
            <Stack.Screen name="AddDetails" component={AddDetailsScreen} />
            <Stack.Screen name="AddMaterial" component={AddMaterialScreen} />
            <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
            <Stack.Screen name="EditProject" component={EditProjectScreen} />
            <Stack.Screen name="Upgrade" component={UpgradeScreen} />
          </>
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
});
