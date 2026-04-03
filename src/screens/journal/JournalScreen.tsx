import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const mascotHappy = require('../../../assets/images/mascot-happy.png');
const mascotIcon = require('../../../assets/images/mascot-icon.png');
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { usePremium } from '../../hooks/usePremium';
import { getCraftTypeColor } from '../../lib/craftColors';
import { JournalSkeleton } from '../../components/SkeletonCards';

const FREE_PROJECT_LIMIT = 10;

type RootStackParamList = {
  Tabs: undefined;
  AddPhotos: undefined;
  ProjectDetail: { projectId: string };
  Upgrade: undefined;
};

type Project = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  date_completed: string | null;
  made_for: string | null;
  craft_types: { name: string } | null;
  project_photos: { storage_url: string; is_cover: boolean; sort_order: number }[];
};

type StatusFilter = 'all' | 'not_started' | 'in_progress' | 'completed' | 'abandoned';

type ActiveModal = 'status' | 'craft' | 'madeFor' | null;

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 20 * 2 - CARD_GAP) / 2;

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  in_progress: 'In Progress',
  completed: 'Completed',
  not_started: 'Not Started',
  abandoned: 'Abandoned',
};

function getStatusBadgeStyle(s: string): { bg: string; text: string } {
  switch (s) {
    case 'in_progress': return { bg: '#FEF3E2', text: '#C4795A' };
    case 'not_started': return { bg: Colors.surfaceElevated, text: Colors.textTertiary };
    case 'abandoned': return { bg: Colors.surfaceElevated, text: Colors.textSecondary };
    default: return { bg: 'transparent', text: 'transparent' };
  }
}

export default function JournalScreen() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search + filter + sort state
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterCraft, setFilterCraft] = useState<string | null>(null);
  const [filterMadeFor, setFilterMadeFor] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  function handleAddProject() {
    if (!isPremium && projects.length >= FREE_PROJECT_LIMIT) {
      navigation.navigate('Upgrade');
      return;
    }
    navigation.navigate('AddPhotos');
  }

  const fetchProjects = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('projects')
      .select('id, title, status, created_at, date_completed, made_for, craft_types(name), project_photos(storage_url, is_cover, sort_order)')
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

  // Apply search, filters, and sorting (always newest first)
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        (p.craft_types?.name?.toLowerCase().includes(q)) ||
        (p.made_for?.toLowerCase().includes(q))
      );
    }

    if (filterStatus !== 'all') {
      result = result.filter((p) => p.status === filterStatus);
    }
    if (filterCraft) {
      result = result.filter((p) => p.craft_types?.name === filterCraft);
    }
    if (filterMadeFor) {
      result = result.filter((p) => p.made_for === filterMadeFor);
    }

    result.sort((a, b) => {
      const dateA = a.date_completed ?? a.created_at;
      const dateB = b.date_completed ?? b.created_at;
      return sortNewestFirst ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
    });

    return result;
  }, [projects, searchQuery, sortNewestFirst, filterStatus, filterCraft, filterMadeFor]);

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
      <View style={styles.container}>
        <View style={styles.headerBand}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>My Journal</Text>
          </View>
          <Text style={styles.headerTagline}>Your handmade portfolio.</Text>
        </View>
        <JournalSkeleton />
      </View>
    );
  }

  if (projects.length === 0) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyCard}>
          <Image
            source={mascotHappy}
            style={styles.emptyMascot}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>No projects yet</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleAddProject}
          >
            <Text style={styles.emptyButtonText}>Start your first project</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusLabel = STATUS_LABELS[filterStatus];
  const isStatusActive = filterStatus !== 'all';
  const isCraftActive = !!filterCraft;
  const isMadeForActive = !!filterMadeFor;

  return (
    <View style={styles.container}>
      {/* Lavender header band */}
      <View style={styles.headerBand}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>My Journal</Text>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setSortNewestFirst((prev) => !prev)}
            hitSlop={8}
          >
            <Ionicons
              name={sortNewestFirst ? 'arrow-down' : 'arrow-up'}
              size={16}
              color="#4A3D6B"
            />
            <Text style={styles.sortButtonText}>
              {sortNewestFirst ? 'Newest' : 'Oldest'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTagline}>Your handmade portfolio.</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search projects..."
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3 filter buttons */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, isStatusActive && styles.filterButtonActive]}
          onPress={() => setActiveModal('status')}
        >
          <Text style={[styles.filterButtonText, isStatusActive && styles.filterButtonTextActive]} numberOfLines={1}>
            {statusLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={isStatusActive ? Colors.primary : Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, isCraftActive && styles.filterButtonActive]}
          onPress={() => setActiveModal('craft')}
        >
          <Text style={[styles.filterButtonText, isCraftActive && styles.filterButtonTextActive]} numberOfLines={1}>
            {filterCraft ?? 'Craft Type'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={isCraftActive ? Colors.primary : Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, isMadeForActive && styles.filterButtonActive]}
          onPress={() => setActiveModal('madeFor')}
        >
          <Text style={[styles.filterButtonText, isMadeForActive && styles.filterButtonTextActive]} numberOfLines={1}>
            {filterMadeFor ?? 'Made For'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={isMadeForActive ? Colors.primary : Colors.textSecondary} />
        </TouchableOpacity>
      </View>

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
            <Text style={styles.noResultsText}>No projects match{searchQuery.trim() ? ` "${searchQuery.trim()}"` : ' these filters'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const coverUrl = getCoverUrl(item.project_photos);
          const showBadge = item.status !== 'completed';
          const badgeStyle = getStatusBadgeStyle(item.status);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id })}
            >
              <View style={styles.cardImageWrap}>
                <PhotoThumb uri={coverUrl} />
                {showBadge && (
                  <View style={[styles.statusOverlay, { backgroundColor: badgeStyle.bg }]}>
                    <Text style={[styles.statusOverlayText, { color: badgeStyle.text }]}>
                      {STATUS_LABELS[item.status as StatusFilter] ?? item.status}
                    </Text>
                  </View>
                )}
                {item.project_photos.length > 1 && (
                  <View style={styles.photoBadge}>
                    <Ionicons name="images-outline" size={10} color="#FFF" />
                    <Text style={styles.photoBadgeText}>{item.project_photos.length}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.craft_types?.name && (
                <View style={styles.cardCraftRow}>
                  <View style={[styles.craftDot, { backgroundColor: getCraftTypeColor(item.craft_types.name) }]} />
                  <Text style={styles.cardCraft} numberOfLines={1}>
                    {item.craft_types.name}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Status picker modal */}
      <Modal visible={activeModal === 'status'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Status</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            {(Object.entries(STATUS_LABELS) as [StatusFilter, string][]).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[styles.modalRow, filterStatus === value && styles.modalRowSelected]}
                onPress={() => { setFilterStatus(value); setActiveModal(null); }}
              >
                <Text style={[styles.modalRowText, filterStatus === value && styles.modalRowTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Craft type picker modal */}
      <Modal visible={activeModal === 'craft'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Craft Type</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.modalRow, !filterCraft && styles.modalRowSelected]}
              onPress={() => { setFilterCraft(null); setActiveModal(null); }}
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
                  onPress={() => { setFilterCraft(item); setActiveModal(null); }}
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
      <Modal visible={activeModal === 'madeFor'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Made For</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.modalRow, !filterMadeFor && styles.modalRowSelected]}
              onPress={() => { setFilterMadeFor(null); setActiveModal(null); }}
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
                  onPress={() => { setFilterMadeFor(item); setActiveModal(null); }}
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

      <FAB onPress={handleAddProject} />
    </View>
  );
}

function PhotoThumb({ uri }: { uri: string | null }) {
  if (!uri) {
    return (
      <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
        <Image source={mascotIcon} style={styles.placeholderMascot} resizeMode="contain" />
      </View>
    );
  }

  return <Image source={{ uri }} style={styles.cardImage} />;
}

function FAB({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.8}
    >
      <Text style={styles.fabText}>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Header band
  headerBand: {
    backgroundColor: Colors.primaryLight,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.screenTitle,
    color: '#4A3D6B',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4A3D6B',
  },
  headerTagline: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6B5B8A',
    marginTop: 2,
  },
  // Search
  searchRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 0,
  },
  // Filter row
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
  },
  filterButtonActive: {
    backgroundColor: Colors.primaryUltraLight,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  filterButtonTextActive: {
    color: Colors.primary,
  },
  // Empty / loading
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginHorizontal: 32,
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
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
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
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardImageWrap: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH,
    backgroundColor: Colors.surfaceElevated,
  },
  cardImagePlaceholder: {
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderMascot: {
    width: 48,
    height: 48,
    opacity: 0.6,
  },
  // Status badge overlaid on photo
  statusOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  statusOverlayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  photoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
  },
  photoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  cardTitle: {
    ...Typography.cardTitle,
    marginTop: 8,
    marginHorizontal: 10,
  },
  cardCraftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  craftDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  cardCraft: {
    ...Typography.cardSubtitle,
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
    backgroundColor: Colors.surface,
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
    fontWeight: '600',
    color: Colors.text,
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  modalRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  modalRowSelected: {
    backgroundColor: Colors.primaryUltraLight,
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
    color: Colors.white,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '500',
  },
});
