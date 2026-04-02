import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/colors';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Tabs: undefined;
  AddPhotos: undefined;
  AddDetails: { photos: string[] };
};

type Props = NativeStackScreenProps<RootStackParamList, 'AddPhotos'>;

export default function AddPhotosScreen({ navigation }: Props) {
  const [photos, setPhotos] = useState<string[]>([]);
  const longPressIndex = useRef<number | null>(null);
  const allowNavigation = useUnsavedChanges(photos.length > 0);

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Access', 'Please allow camera access in your device settings to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setPhotos((prev) => [...prev, ...uris]);
    }
  }

  function showAddPhotoOptions() {
    const options = ['Take Photo', 'Choose from Library', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 2 },
        (index) => {
          if (index === 0) takePhoto();
          else if (index === 1) pickFromLibrary();
        },
      );
    } else {
      Alert.alert('Add Photo', undefined, [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleLongPress(index: number) {
    longPressIndex.current = index;
  }

  function handleTapAfterLongPress(index: number) {
    const from = longPressIndex.current;
    if (from === null || from === index) {
      longPressIndex.current = null;
      return;
    }
    setPhotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    longPressIndex.current = null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerCancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Photos</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => { allowNavigation(); navigation.navigate('AddDetails', { photos }); }}
        >
          <Text style={styles.headerNextText}>Next</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Add at least one photo, or skip for now.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.photoRow}
        contentContainerStyle={styles.photoRowContent}
      >
        {photos.map((uri, index) => (
          <Pressable
            key={`${uri}-${index}`}
            onLongPress={() => handleLongPress(index)}
            onPress={() => handleTapAfterLongPress(index)}
            style={[
              styles.photoWrapper,
              longPressIndex.current === index && styles.photoSelected,
            ]}
          >
            <Image source={{ uri }} style={styles.photo} />
            {index === 0 && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>Cover</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removePhoto(index)}
              hitSlop={8}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </Pressable>
        ))}

        <TouchableOpacity style={styles.addPhotoButton} onPress={showAddPhotoOptions}>
          <Text style={styles.addPhotoIcon}>+</Text>
          <Text style={styles.addPhotoLabel}>Add</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 56,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerButton: {
    padding: 4,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.text,
  },
  headerCancelText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: '500',
  },
  headerNextText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  photoRow: {
    flexGrow: 0,
    marginBottom: 24,
  },
  photoRowContent: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  photoWrapper: {
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  photoSelected: {
    borderColor: Colors.primary,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  coverBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '500',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 18,
  },
  addPhotoButton: {
    width: 140,
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIcon: {
    fontSize: 32,
    color: Colors.textSecondary,
    lineHeight: 36,
  },
  addPhotoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
