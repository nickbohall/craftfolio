import React, { useState, useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  SectionList,
  StyleSheet,
  RefreshControl,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { getMaterialDisplayName } from '../../lib/materialUtils';
import { getMaterialBadgeColors } from '../../lib/materialColors';
import { MaterialsSkeleton } from '../../components/SkeletonCards';

const mascotNeutral = require('../../../assets/images/mascot-neutral.png');

type RootStackParamList = {
  AddMaterial: { projectId: string; materialId?: string };
};

type StashMaterial = {
  id: string;
  material_type: string | null;
  brand: string | null;
  name: string | null;
  color_name: string | null;
  fiber_content: string | null;
  yarn_weight: string | null;
  needle_size_mm: number | null;
  needle_type: string | null;
  needle_material: string | null;
  quantity_in_stash: number | null;
  stash_unit: string | null;
  stash_status: string;
  is_favorited: boolean;
};

type FavoriteMaterial = {
  id: string;
  material_type: string | null;
  brand: string | null;
  name: string | null;
  color_name: string | null;
  fiber_content: string | null;
  yarn_weight: string | null;
  needle_size_mm: number | null;
  needle_type: string | null;
  needle_material: string | null;
};

type ActiveTab = 'stash' | 'favorites';

function formatMaterialType(type: string): string {
  if (type === 'thread/floss') return 'Thread / Floss';
  if (type === 'needle') return 'Needle / Hook';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getQuantityDisplay(mat: StashMaterial): string {
  const type = mat.material_type;
  if (type === 'needle' || type === 'hook') return 'In Stash';
  if (mat.quantity_in_stash == null) return 'In Stash';
  const qty = mat.quantity_in_stash;
  const unit = mat.stash_unit ?? 'pieces';
  return `${qty} ${unit}`;
}

function getStashStatusStyle(status: string): { bg: string; text: string } {
  switch (status) {
    case 'in_stash': return { bg: '#E8F5E9', text: Colors.success };
    case 'used_up': return { bg: Colors.surfaceElevated, text: Colors.textTertiary };
    case 'reserved': return { bg: '#F3EDF7', text: '#7C6B9E' };
    default: return { bg: Colors.surfaceElevated, text: Colors.textSecondary };
  }
}

function getStashStatusLabel(status: string): string {
  switch (status) {
    case 'in_stash': return 'In Stash';
    case 'used_up': return 'Used Up';
    case 'reserved': return 'Reserved';
    default: return status;
  }
}

function getSecondaryLine(mat: StashMaterial | FavoriteMaterial): string | null {
  const parts: string[] = [];
  if (mat.color_name) parts.push(mat.color_name);
  if (mat.fiber_content) parts.push(mat.fiber_content);
  if (mat.yarn_weight) parts.push(mat.yarn_weight);
  if (mat.needle_size_mm) {
    const type = mat.needle_type ?? '';
    parts.push(`${mat.needle_size_mm}mm ${type}`.trim());
  }
  return parts.length > 0 ? parts.join(' \u00B7 ') : null;
}

export default function MaterialsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [activeTab, setActiveTab] = useState<ActiveTab>('stash');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Stash state
  const [stashMaterials, setStashMaterials] = useState<StashMaterial[]>([]);
  const [showUsedUp, setShowUsedUp] = useState(false);

  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteMaterial[]>([]);

  // Shared filter
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Multi-select for stash removal
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchStash = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('materials')
      .select('id, material_type, brand, name, color_name, fiber_content, yarn_weight, needle_size_mm, needle_type, needle_material, quantity_in_stash, stash_unit, stash_status, is_favorited')
      .eq('user_id', user.id)
      .not('quantity_in_stash', 'is', null)
      .order('material_type')
      .order('created_at', { ascending: false });
    setStashMaterials((data as StashMaterial[]) ?? []);
  }, [user]);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('materials')
      .select('id, material_type, brand, name, color_name, fiber_content, yarn_weight, needle_size_mm, needle_type, needle_material')
      .eq('user_id', user.id)
      .eq('is_favorited', true)
      .order('created_at', { ascending: false });
    setFavorites((data as FavoriteMaterial[]) ?? []);
  }, [user]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchStash(), fetchFavorites()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchStash, fetchFavorites]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  function handleRefresh() {
    setRefreshing(true);
    fetchAll();
  }

  async function toggleStashFavorite(materialId: string, current: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !current;
    await supabase
      .from('materials')
      .update({ is_favorited: newValue })
      .eq('id', materialId);
    setStashMaterials((prev) =>
      prev.map((m) => m.id === materialId ? { ...m, is_favorited: newValue } : m)
    );
  }

  async function handleUnfavorite(materialId: string) {
    await supabase
      .from('materials')
      .update({ is_favorited: false })
      .eq('id', materialId);
    setFavorites((prev) => prev.filter((m) => m.id !== materialId));
  }

  function toggleSelection(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function removeSelectedFromStash() {
    const ids = Array.from(selectedIds);
    // Remove from stash = set quantity_in_stash to null
    for (const id of ids) {
      await supabase
        .from('materials')
        .update({ quantity_in_stash: null, stash_unit: null, stash_status: 'in_stash' })
        .eq('id', id);
    }
    setStashMaterials((prev) => prev.filter((m) => !selectedIds.has(m.id)));
    clearSelection();
  }

  // Clear filter when switching tabs
  function switchTab(tab: ActiveTab) {
    setActiveTab(tab);
    setFilterType(null);
    clearSelection();
  }

  // Derive available material types for current tab
  const availableTypes = useMemo(() => {
    const source = activeTab === 'stash' ? stashMaterials : favorites;
    const types = source
      .map((m) => m.material_type)
      .filter((t): t is string => !!t);
    return [...new Set(types)].sort();
  }, [activeTab, stashMaterials, favorites]);

  // Stash: filter and group
  const filteredStash = useMemo(() => {
    let items = stashMaterials;
    if (!showUsedUp) {
      items = items.filter((m) => m.stash_status !== 'used_up');
    }
    if (filterType) {
      items = items.filter((m) => m.material_type === filterType);
    }
    return items;
  }, [stashMaterials, showUsedUp, filterType]);

  const stashSections = useMemo(() => {
    const groups: Record<string, StashMaterial[]> = {};
    for (const mat of filteredStash) {
      const key = mat.material_type ?? 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(mat);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, data]) => ({ title: formatMaterialType(type), data }));
  }, [filteredStash]);

  // Favorites: filter
  const filteredFavorites = useMemo(() => {
    if (!filterType) return favorites;
    return favorites.filter((m) => m.material_type === filterType);
  }, [favorites, filterType]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerBand}>
          <Text style={styles.headerTitle}>My Materials</Text>
          <Text style={styles.headerTagline}>Your saved materials.</Text>
        </View>
        <MaterialsSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header band */}
      <View style={styles.headerBand}>
        <Text style={styles.headerTitle}>
          {activeTab === 'stash' ? 'My Stash' : 'My Materials'}
        </Text>
        <Text style={styles.headerTagline}>
          {activeTab === 'stash' ? 'Your material inventory.' : 'Your saved materials.'}
        </Text>
      </View>

      {/* Sub-tab pills + filter on same row */}
      <View style={styles.tabRow}>
        <View style={styles.tabPills}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'stash' && styles.tabPillActive]}
            onPress={() => switchTab('stash')}
          >
            <Text style={[styles.tabPillText, activeTab === 'stash' && styles.tabPillTextActive]}>
              Stash
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'favorites' && styles.tabPillActive]}
            onPress={() => switchTab('favorites')}
          >
            <Text style={[styles.tabPillText, activeTab === 'favorites' && styles.tabPillTextActive]}>
              Favorites
            </Text>
          </TouchableOpacity>
        </View>

        {availableTypes.length > 1 && (
          <TouchableOpacity
            style={[styles.filterButton, !!filterType && styles.filterButtonActive]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Text style={[styles.filterButtonText, !!filterType && styles.filterButtonTextActive]} numberOfLines={1}>
              {filterType ? formatMaterialType(filterType) : 'All Types'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={filterType ? Colors.primary : Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'stash' ? (
        <StashTab
          sections={stashSections}
          allEmpty={stashMaterials.length === 0}
          showUsedUp={showUsedUp}
          setShowUsedUp={setShowUsedUp}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onToggleFavorite={toggleStashFavorite}
          onPressMaterial={(id) => navigation.navigate('AddMaterial', { projectId: '', materialId: id })}
          onAddToStash={() => navigation.navigate('AddMaterial', { projectId: '' })}
          selectedIds={selectedIds}
          onLongPressMaterial={toggleSelection}
          onRemoveSelected={removeSelectedFromStash}
          onClearSelection={clearSelection}
        />
      ) : (
        <FavoritesTab
          materials={filteredFavorites}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onUnfavorite={handleUnfavorite}
          onPressMaterial={(id) => navigation.navigate('AddMaterial', { projectId: '', materialId: id })}
        />
      )}

      {/* Material type filter modal */}
      <Modal visible={filterModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Material Type</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.modalRow, !filterType && styles.modalRowSelected]}
              onPress={() => { setFilterType(null); setFilterModalVisible(false); }}
            >
              <Text style={[styles.modalRowText, !filterType && styles.modalRowTextSelected]}>
                All Types
              </Text>
            </TouchableOpacity>
            {availableTypes.map((type) => {
              const colors = getMaterialBadgeColors(type);
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.modalRow, filterType === type && styles.modalRowSelected]}
                  onPress={() => { setFilterType(type); setFilterModalVisible(false); }}
                >
                  <View style={styles.modalRowInner}>
                    <View style={[styles.modalDot, { backgroundColor: colors.text }]} />
                    <Text style={[styles.modalRowText, filterType === type && styles.modalRowTextSelected]}>
                      {formatMaterialType(type)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Stash Tab ──────────────────────────────────────────────

type StashTabProps = {
  sections: { title: string; data: StashMaterial[] }[];
  allEmpty: boolean;
  showUsedUp: boolean;
  setShowUsedUp: (v: boolean) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onPressMaterial: (id: string) => void;
  onAddToStash: () => void;
  selectedIds: Set<string>;
  onLongPressMaterial: (id: string) => void;
  onRemoveSelected: () => void;
  onClearSelection: () => void;
};

function StashTab({
  sections,
  allEmpty,
  showUsedUp,
  setShowUsedUp,
  refreshing,
  onRefresh,
  onToggleFavorite,
  onPressMaterial,
  onAddToStash,
  selectedIds,
  onLongPressMaterial,
  onRemoveSelected,
  onClearSelection,
}: StashTabProps) {
  const isSelecting = selectedIds.size > 0;
  if (allEmpty) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <Image source={mascotNeutral} style={styles.emptyMascot} resizeMode="contain" />
          <Text style={styles.emptyTitle}>Your stash is empty</Text>
          <Text style={styles.emptySubtitle}>Add materials to track your inventory</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onAddToStash}>
            <Text style={styles.emptyButtonText}>Add to Stash</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Show Used Up toggle + selection action bar */}
      <View style={styles.toggleRow}>
        {isSelecting ? (
          <>
            <TouchableOpacity onPress={onClearSelection}>
              <Text style={styles.selectionCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeSelectedButton} onPress={onRemoveSelected}>
              <Text style={styles.removeSelectedText}>Remove {selectedIds.size} from Stash</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.toggleLabel}>Show Used Up</Text>
            <Switch
              value={showUsedUp}
              onValueChange={setShowUsedUp}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        ListEmptyComponent={
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>
              {showUsedUp ? 'No stash items' : 'No active stash items'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <StashCard
            material={item}
            selected={selectedIds.has(item.id)}
            isSelecting={isSelecting}
            onPress={() => {
              if (isSelecting) onLongPressMaterial(item.id);
              else onPressMaterial(item.id);
            }}
            onLongPress={() => onLongPressMaterial(item.id)}
            onToggleFavorite={() => onToggleFavorite(item.id, item.is_favorited)}
          />
        )}
      />

      {/* FAB */}
      {!isSelecting && (
        <TouchableOpacity style={styles.fab} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAddToStash(); }} activeOpacity={0.8}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StashCard({
  material,
  selected,
  isSelecting,
  onPress,
  onLongPress,
  onToggleFavorite,
}: {
  material: StashMaterial;
  selected: boolean;
  isSelecting: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggleFavorite: () => void;
}) {
  const badgeColors = getMaterialBadgeColors(material.material_type);
  const statusStyle = getStashStatusStyle(material.stash_status);
  const isUsedUp = material.stash_status === 'used_up';
  const secondary = getSecondaryLine(material);

  return (
    <TouchableOpacity
      style={[styles.card, isUsedUp && styles.cardMuted, selected && styles.cardSelected]}
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.cardLeft}>
        {material.material_type && (
          <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
            <Text style={[styles.badgeText, { color: badgeColors.text }]}>{material.material_type}</Text>
          </View>
        )}
        <Text style={styles.materialName}>{getMaterialDisplayName(material)}</Text>
        {secondary && (
          <Text style={styles.materialSecondary} numberOfLines={1}>{secondary}</Text>
        )}
        <View style={styles.stashInfoRow}>
          <Text style={styles.quantityText}>{getQuantityDisplay(material)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
              {getStashStatusLabel(material.stash_status)}
            </Text>
          </View>
        </View>
      </View>
      {isSelecting ? (
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={selected ? Colors.primary : Colors.textTertiary}
          style={styles.heartButton}
        />
      ) : (
        <TouchableOpacity
          style={styles.heartButton}
          onPress={onToggleFavorite}
          hitSlop={12}
        >
          <Ionicons
            name={material.is_favorited ? 'heart' : 'heart-outline'}
            size={22}
            color={material.is_favorited ? Colors.primary : Colors.textTertiary}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── Favorites Tab ──────────────────────────────────────────

type FavoritesTabProps = {
  materials: FavoriteMaterial[];
  refreshing: boolean;
  onRefresh: () => void;
  onUnfavorite: (id: string) => void;
  onPressMaterial: (id: string) => void;
};

function FavoritesTab({
  materials,
  refreshing,
  onRefresh,
  onUnfavorite,
  onPressMaterial,
}: FavoritesTabProps) {
  if (materials.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <Image source={mascotNeutral} style={styles.emptyMascot} resizeMode="contain" />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySubtitle}>Materials you heart will appear here</Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={materials}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
      renderItem={({ item }) => {
        const secondary = getSecondaryLine(item);
        const badgeColors = getMaterialBadgeColors(item.material_type);
        return (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => onPressMaterial(item.id)}
          >
            <View style={styles.cardLeft}>
              {item.material_type && (
                <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
                  <Text style={[styles.badgeText, { color: badgeColors.text }]}>{item.material_type}</Text>
                </View>
              )}
              <Text style={styles.materialName}>{getMaterialDisplayName(item)}</Text>
              {secondary && (
                <Text style={styles.materialSecondary} numberOfLines={1}>{secondary}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.heartButton}
              onPress={() => onUnfavorite(item.id)}
              hitSlop={12}
            >
              <Ionicons name="heart" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      }}
    />
  );
}

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  // Header
  headerBand: {
    backgroundColor: Colors.primaryLight,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A3D6B',
  },
  headerTagline: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6B5B8A',
    marginTop: 2,
  },
  // Sub-tabs
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  tabPills: {
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabPillActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryLight,
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabPillTextActive: {
    color: '#4A3D6B',
    fontWeight: '600',
  },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  toggleLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  selectionCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  removeSelectedButton: {
    backgroundColor: Colors.error,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removeSelectedText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  // Empty states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  emptyMascot: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // List
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  noResults: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  // Cards
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMuted: {
    opacity: 0.5,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryUltraLight,
  },
  cardLeft: {
    flex: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  materialName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  materialSecondary: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Stash-specific
  stashInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  heartButton: {
    padding: 8,
    marginLeft: 8,
  },
  // Filter
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: Colors.primaryUltraLight,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
    marginRight: 8,
  },
  filterButtonTextActive: {
    color: Colors.primary,
  },
  // Modal
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
  modalRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
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
