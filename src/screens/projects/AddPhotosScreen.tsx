import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/colors';
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

  async function pickPhotos() {
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
      <Text style={styles.title}>Add Photos</Text>
      <Text style={styles.subtitle}>
        First photo will be your cover.{'\n'}Long-press a photo, then tap another to swap positions.
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

        <TouchableOpacity style={styles.addPhotoButton} onPress={pickPhotos}>
          <Text style={styles.addPhotoIcon}>+</Text>
          <Text style={styles.addPhotoLabel}>Add</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, photos.length === 0 && styles.nextButtonDisabled]}
          disabled={photos.length === 0}
          onPress={() => navigation.navigate('AddDetails', { photos })}
        >
          <Text style={[styles.nextText, photos.length === 0 && styles.nextTextDisabled]}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  photoRow: {
    flexGrow: 0,
    marginBottom: 24,
  },
  photoRowContent: {
    alignItems: 'center',
    gap: 12,
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
    fontWeight: '600',
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
    fontWeight: '700',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingBottom: 40,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  nextButtonDisabled: {
    backgroundColor: Colors.lightGray,
  },
  nextText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  nextTextDisabled: {
    color: Colors.textSecondary,
  },
});
