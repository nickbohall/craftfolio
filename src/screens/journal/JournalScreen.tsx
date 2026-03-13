import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

type RootStackParamList = {
  Tabs: undefined;
  AddPhotos: undefined;
  ProjectDetail: { projectId: string };
};

type Project = {
  id: string;
  title: string;
  created_at: string;
  craft_types: { name: string } | null;
  project_photos: { storage_url: string; is_cover: boolean; sort_order: number }[];
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 20 * 2 - CARD_GAP) / 2;

export default function JournalScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('projects')
      .select('id, title, created_at, craft_types(name), project_photos(storage_url, is_cover, sort_order)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setProjects((data as Project[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [fetchProjects])
  );

  function getCoverUrl(photos: Project['project_photos']): string | null {
    if (!photos || photos.length === 0) return null;
    const cover = photos.find((p) => p.is_cover);
    return cover?.storage_url ?? photos[0]?.storage_url ?? null;
  }

  function handleRefresh() {
    setRefreshing(true);
    fetchProjects();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (projects.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No projects yet</Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('AddPhotos')}
        >
          <Text style={styles.emptyButtonText}>Add your first project</Text>
        </TouchableOpacity>
        <FAB onPress={() => navigation.navigate('AddPhotos')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Journal</Text>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        renderItem={({ item }) => {
          const coverUrl = getCoverUrl(item.project_photos);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id })}
            >
              <PhotoThumb uri={coverUrl} />
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.craft_types?.name && (
                <Text style={styles.cardCraft} numberOfLines={1}>
                  {item.craft_types.name}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
      <FAB onPress={() => navigation.navigate('AddPhotos')} />
    </View>
  );
}

function PhotoThumb({ uri }: { uri: string | null }) {
  if (!uri) {
    return <View style={[styles.cardImage, styles.cardImagePlaceholder]} />;
  }

  return <Image source={{ uri }} style={styles.cardImage} />;
}

function FAB({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.fabText}>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  emptyTitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  grid: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH,
    borderRadius: 12,
    backgroundColor: Colors.lightGray,
  },
  cardImagePlaceholder: {
    backgroundColor: Colors.lightGray,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 6,
  },
  cardCraft: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: Colors.white,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '600',
  },
});
