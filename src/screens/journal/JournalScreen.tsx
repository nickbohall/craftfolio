import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';

const mascotHappy = require('../../../assets/images/mascot-happy.png');
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
  date_completed: string | null;
  made_for: string | null;
  craft_types: { name: string } | null;
  project_photos: { storage_url: string; is_cover: boolean; sort_order: number }[];
};

type SortOption = 'newest' | 'oldest';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 20 * 2 - CARD_GAP) / 2;

export default function JournalScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter/sort state
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterCraft, setFilterCraft] = useState<string | null>(null);
  const [filterMadeFor, setFilterMadeFor] = useState<string | null>(null);
  const [craftPickerVisible, setCraftPickerVisible] = useState(false);
  const [madeForPickerVisible, setMadeForPickerVisible] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('projects')
      .select('id, title, created_at, date_completed, made_for, craft_types(name), project_photos(storage_url, is_cover, sort_order)')
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

  // Derive unique craft types and "made for" values for filter options
  const craftTypes = useMemo(() => {
    const names = projects
      .map((p) => p.craft_types?.name)
      .filter((n): n is string => !!n);
    return [...new Set(names)].sort();
  }, [projects]);

  const madeForValues = useMemo(() => {
    const values = projects
      .map((p) => p.made_for)
      .filter((v): v is string => !!v && v.trim().length > 0);
    return [...new Set(values)].sort();
  }, [projects]);

  // Apply filters and sorting
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    if (filterCraft) {
      result = result.filter((p) => p.craft_types?.name === filterCraft);
    }
    if (filterMadeFor) {
      result = result.filter((p) => p.made_for === filterMadeFor);
    }

    result.sort((a, b) => {
      const dateA = a.date_completed ?? a.created_at;
      const dateB = b.date_completed ?? b.created_at;
      return sortBy === 'newest'
        ? dateB.localeCompare(dateA)
        : dateA.localeCompare(dateB);
    });

    return result;
  }, [projects, filterCraft, filterMadeFor, sortBy]);

  const hasActiveFilters = !!filterCraft || !!filterMadeFor;

  function getCoverUrl(photos: Project['project_photos']): string | null {
    if (!photos || photos.length === 0) return null;
    const cover = photos.find((p) => p.is_cover);
    return cover?.storage_url ?? photos[0]?.storage_url ?? null;
  }

  function handleRefresh() {
    setRefreshing(true);
    fetchProjects();
  }

  function clearFilters() {
    setFilterCraft(null);
    setFilterMadeFor(null);
    setSortBy('newest');
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
        <Image
          source={mascotHappy}
          style={styles.emptyMascot}
          resizeMode="contain"
        />
        <Text style={styles.emptyTitle}>No projects yet</Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('AddPhotos')}
        >
          <Text style={styles.emptyButtonText}>Start your first project</Text>
        </TouchableOpacity>
        <FAB onPress={() => navigation.navigate('AddPhotos')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Journal</Text>

      {/* Filter/Sort chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {/* Sort chip */}
        <TouchableOpacity
          style={[styles.chip, styles.chipActive]}
          onPress={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
        >
          <Text style={styles.chipActiveText}>
            {sortBy === 'newest' ? 'Newest first' : 'Oldest first'}
          </Text>
        </TouchableOpacity>

        {/* Craft type filter */}
        {craftTypes.length > 0 && (
          <TouchableOpacity
            style={[styles.chip, filterCraft && styles.chipActive]}
            onPress={() => setCraftPickerVisible(true)}
          >
            <Text style={[styles.chipText, filterCraft && styles.chipActiveText]}>
              {filterCraft ?? 'Craft type'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Made for filter */}
        {madeForValues.length > 0 && (
          <TouchableOpacity
            style={[styles.chip, filterMadeFor && styles.chipActive]}
            onPress={() => setMadeForPickerVisible(true)}
          >
            <Text style={[styles.chipText, filterMadeFor && styles.chipActiveText]}>
              {filterMadeFor ? `For ${filterMadeFor}` : 'Made for'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Clear filters */}
        {hasActiveFilters && (
          <TouchableOpacity style={styles.chipClear} onPress={clearFilters}>
            <Text style={styles.chipClearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <FlatList
        data={filteredProjects}
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
        ListEmptyComponent={
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No projects match these filters</Text>
          </View>
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

      {/* Craft type picker modal */}
      <Modal visible={craftPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Craft Type</Text>
              <TouchableOpacity onPress={() => setCraftPickerVisible(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.modalRow, !filterCraft && styles.modalRowSelected]}
              onPress={() => { setFilterCraft(null); setCraftPickerVisible(false); }}
            >
              <Text style={[styles.modalRowText, !filterCraft && styles.modalRowTextSelected]}>
                All craft types
              </Text>
            </TouchableOpacity>
            <FlatList
              data={craftTypes}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalRow, filterCraft === item && styles.modalRowSelected]}
                  onPress={() => { setFilterCraft(item); setCraftPickerVisible(false); }}
                >
                  <Text style={[styles.modalRowText, filterCraft === item && styles.modalRowTextSelected]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Made for picker modal */}
      <Modal visible={madeForPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Made For</Text>
              <TouchableOpacity onPress={() => setMadeForPickerVisible(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.modalRow, !filterMadeFor && styles.modalRowSelected]}
              onPress={() => { setFilterMadeFor(null); setMadeForPickerVisible(false); }}
            >
              <Text style={[styles.modalRowText, !filterMadeFor && styles.modalRowTextSelected]}>
                Everyone
              </Text>
            </TouchableOpacity>
            <FlatList
              data={madeForValues}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalRow, filterMadeFor === item && styles.modalRowSelected]}
                  onPress={() => { setFilterMadeFor(item); setMadeForPickerVisible(false); }}
                >
                  <Text style={[styles.modalRowText, filterMadeFor === item && styles.modalRowTextSelected]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

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
    fontSize: 24,
    fontWeight: '500',
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  emptyMascot: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  // Filter chips
  chipScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  chipRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  chipActiveText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  chipClear: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  chipClearText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  // Grid
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
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH,
    backgroundColor: Colors.lightGray,
  },
  cardImagePlaceholder: {
    backgroundColor: Colors.lightGray,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginTop: 8,
    marginHorizontal: 10,
  },
  cardCraft: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  noResults: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.text,
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
  },
  modalRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  modalRowSelected: {
    backgroundColor: '#F3EEFA',
  },
  modalRowText: {
    fontSize: 16,
    color: Colors.text,
  },
  modalRowTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  // FAB
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
  },
  fabText: {
    color: Colors.text,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '500',
  },
});
