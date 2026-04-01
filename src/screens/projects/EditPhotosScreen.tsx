import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/colors';
import { supabase, uploadProjectPhoto } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

type RootStackParamList = {
  EditPhotos: { projectId: string };
};

type ExistingPhoto = {
  id: string;
  storage_url: string;
  is_cover: boolean;
  sort_order: number;
};

type PhotoItem =
  | { type: 'existing'; data: ExistingPhoto }
  | { type: 'new'; localUri: string };

type Props = NativeStackScreenProps<RootStackParamList, 'EditPhotos'>;

export default function EditPhotosScreen({ route, navigation }: Props) {
  const { projectId } = route.params;
  const { user } = useAuth();

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [removedIds, setRemovedIds] = useState<ExistingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const longPressIndex = useRef<number | null>(null);
  const initialPhotoCount = useRef(0);

  const hasNewPhotos = photos.some((p) => p.type === 'new');
  const hasRemovals = removedIds.length > 0;
  const hasReorder = !hasNewPhotos && !hasRemovals && photos.length === initialPhotoCount.current &&
    photos.some((p, i) => p.type === 'existing' && p.data.sort_order !== i);
  const allowNavigation = useUnsavedChanges(hasNewPhotos || hasRemovals || hasReorder);

  useEffect(() => {
    async function fetchPhotos() {
      const { data } = await supabase
        .from('project_photos')
        .select('id, storage_url, is_cover, sort_order')
        .eq('project_id', projectId)
        .order('sort_order');

      if (data) {
        const sorted = [...data].sort((a, b) => {
          if (a.is_cover && !b.is_cover) return -1;
          if (!a.is_cover && b.is_cover) return 1;
          return a.sort_order - b.sort_order;
        });
        setPhotos(sorted.map((p) => ({ type: 'existing', data: p })));
        initialPhotoCount.current = sorted.length;
      }
      setLoading(false);
    }
    fetchPhotos();
  }, [projectId]);

  function removePhoto(index: number) {
    const item = photos[index];
    if (item.type === 'existing') {
      setRemovedIds((prev) => [...prev, item.data]);
    }
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

  async function pickPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newItems: PhotoItem[] = result.assets.map((a) => ({
        type: 'new',
        localUri: a.uri,
      }));
      setPhotos((prev) => [...prev, ...newItems]);
    }
  }

  function getPhotoUri(item: PhotoItem): string {
    return item.type === 'existing' ? item.data.storage_url : item.localUri;
  }

  function extractStoragePath(publicUrl: string): string | null {
    const marker = '/object/public/project-photos/';
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.slice(idx + marker.length);
  }

  async function handleSave() {
    if (!user) return;
    allowNavigation();
    setSaving(true);

    // 1. Delete removed photos from DB and storage
    for (const removed of removedIds) {
      await supabase.from('project_photos').delete().eq('id', removed.id);
      const path = extractStoragePath(removed.storage_url);
      if (path) {
        await supabase.storage.from('project-photos').remove([path]);
      }
    }

    // 2. Process current photos list
    for (let i = 0; i < photos.length; i++) {
      const item = photos[i];
      const isCover = i === 0;

      if (item.type === 'existing') {
        // Update sort_order and is_cover
        await supabase
          .from('project_photos')
          .update({ sort_order: i, is_cover: isCover })
          .eq('id', item.data.id);
      } else {
        // Upload new photo then insert row
        try {
          const publicUrl = await uploadProjectPhoto(item.localUri, user.id);
          await supabase.from('project_photos').insert({
            project_id: projectId,
            storage_url: publicUrl,
            is_cover: isCover,
            sort_order: i,
          });
        } catch {
          // Skip failed uploads silently
        }
      }
    }

    setSaving(false);
    navigation.goBack();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Photos</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.headerButton}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        First photo will be your cover.{'\n'}Long-press a photo, then tap another to swap positions.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.photoRow}
        contentContainerStyle={styles.photoRowContent}
      >
        {photos.map((item, index) => (
          <Pressable
            key={`${getPhotoUri(item)}-${index}`}
            onLongPress={() => handleLongPress(index)}
            onPress={() => handleTapAfterLongPress(index)}
            style={styles.photoWrapper}
          >
            <Image source={{ uri: getPhotoUri(item) }} style={styles.photo} />
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
              <Text style={styles.removeButtonText}>{'\u00D7'}</Text>
            </TouchableOpacity>
          </Pressable>
        ))}

        <TouchableOpacity style={styles.addPhotoButton} onPress={pickPhotos}>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
  cancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  saveText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
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
