import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const features = [
  {
    icon: 'journal-outline' as const,
    title: 'Log your projects',
    description: 'Photo-first journal for everything you make',
  },
  {
    icon: 'heart-outline' as const,
    title: 'Track your materials',
    description: 'Remember every yarn, needle, and supply',
  },
  {
    icon: 'share-social-outline' as const,
    title: 'Share your work',
    description: 'Send a link to anyone, no app required',
  },
];

export default function FeaturesScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>What you can do</Text>
        {features.map((f) => (
          <View key={f.icon} style={styles.featureRow}>
            <View style={styles.iconCircle}>
              <Ionicons name={f.icon} size={24} color={Colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.description}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('OnboardingSetName')}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryUltraLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
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
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#4A3D6B',
  },
});
