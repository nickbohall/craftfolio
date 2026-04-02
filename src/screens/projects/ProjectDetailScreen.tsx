import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  NativeSyntheticEvent,
  NativeScrollEvent,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { usePremium } from '../../hooks/usePremium';
import { getMaterialDisplayName } from '../../lib/materialUtils';
import { getMaterialBadgeColors } from '../../lib/materialColors';
import { getDefaultStashUnit, isNeedleType } from '../../lib/validation';
import type { MaterialType } from '../../lib/validation';

const mascotIcon = require('../../../assets/images/mascot-icon.png');

type RootStackParamList = {
  ProjectDetail: { projectId: string };
  EditProject: { projectId: string };
  EditPhotos: { projectId: string };
  AddMaterial: { projectId: string; materialId?: string };
  Upgrade: undefined;
};

type Photo = {
  id: string;
  storage_url: string;
  is_cover: boolean;
  sort_order: number;
};

type Material = {
  id: string;
  material_type: string | null;
  brand: string | null;
  name: string | null;
  color_name: string | null;
  yarn_weight: string | null;
  needle_size_mm: number | null;
  needle_size_us: string | null;
  needle_type: string | null;
  is_favorited: boolean;
  quantity_in_stash: number | null;
  stash_unit: string | null;
  yardage_per_skein: number | null;
  weight_per_skein_grams: number | null;
};

type ProjectMaterial = {
  id: string;
  quantity_used: string | null;
  materials: Material;
};

type Project = {
  id: string;
  title: string;
  status: string;
  made_for: string | null;
  date_started: string | null;
  date_completed: string | null;
  hours_logged: number | null;
  technique_notes: string | null;
  pattern_source: string | null;
  pattern_name: string | null;
  pattern_designer: string | null;
  craft_types: { name: string } | null;
  project_photos: Photo[];
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ProjectDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ProjectDetail'>>();
  const { projectId } = route.params;
  const { isPremium } = usePremium();

  const [project, setProject] = useState<Project | null>(null);
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const fetchData = useCallback(async () => {
    const projectRes = await (supabase
      .from('projects') as any)
      .select(
        'id, title, status, made_for, date_started, date_completed, hours_logged, technique_notes, pattern_source, pattern_name, pattern_designer, craft_types(name), project_photos(id, storage_url, is_cover, sort_order)'
      )
      .eq('id', projectId)
      .single();

    const materialsRes = await (supabase
      .from('project_materials') as any)
      .select('id, quantity_used, materials(*)')
      .eq('project_id', projectId);

    if (projectRes.data) {
      const p = projectRes.data as unknown as Project;
      p.project_photos.sort((a, b) => {
        if (a.is_cover && !b.is_cover) return -1;
        if (!a.is_cover && b.is_cover) return 1;
        return a.sort_order - b.sort_order;
      });
      setProject(p);
    }

    if (materialsRes.data) {
      setMaterials(materialsRes.data as unknown as ProjectMaterial[]);
    }

    setLoading(false);
    setRefreshing(false);
  }, [projectId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32));
    setActivePhotoIndex(index);
  }

  function getMaterialSpec(mat: Material): string | null {
    if (mat.material_type === 'yarn' && mat.yarn_weight) return mat.yarn_weight;
    if ((mat.material_type === 'needle' || mat.material_type === 'hook') && mat.needle_size_mm) {
      const us = mat.needle_size_us ? ` (${mat.needle_size_us})` : '';
      const type = mat.needle_type ? ` ${mat.needle_type}` : '';
      return `${mat.needle_size_mm}mm${us}${type}`;
    }
    return null;
  }

  function handleRemoveMaterial(projectMaterialId: string) {
    Alert.alert(
      'Remove Material',
      'Remove this material from the project?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('project_materials')
              .delete()
              .eq('id', projectMaterialId);
            setMaterials((prev) => prev.filter((pm) => pm.id !== projectMaterialId));
          },
        },
      ]
    );
  }

  function handleDeleteProject() {
    Alert.alert(
      'Delete Project',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('project_materials').delete().eq('project_id', projectId);
            await supabase.from('project_photos').delete().eq('project_id', projectId);
            await supabase.from('projects').delete().eq('id', projectId);
            navigation.goBack();
          },
        },
      ]
    );
  }

  function handleShareProject() {
    if (!isPremium) {
      navigation.navigate('Upgrade');
      return;
    }
    const url = `https://getcraftfolio.com/p/${projectId}`;
    Share.share({ message: `Check out what I made: ${url}`, url });
  }

  function getStatusLabel(s: string): string {
    switch (s) {
      case 'not_started': return 'Not Started';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'abandoned': return 'Abandoned';
      default: return s;
    }
  }

  function getStatusStyle(s: string) {
    switch (s) {
      case 'in_progress': return { backgroundColor: '#FEF3E2' };
      case 'completed': return { backgroundColor: '#D4EDE0' };
      case 'abandoned': return { backgroundColor: Colors.surfaceElevated };
      case 'not_started': return { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' as const };
      default: return { backgroundColor: Colors.surfaceElevated };
    }
  }

  function getStatusTextStyle(s: string) {
    switch (s) {
      case 'in_progress': return { color: Colors.warning };
      case 'completed': return { color: Colors.success };
      case 'abandoned': return { color: Colors.textSecondary };
      case 'not_started': return { color: Colors.textTertiary };
      default: return { color: Colors.textSecondary };
    }
  }

  function getMaterialTitle(mat: Material): string {
    return getMaterialDisplayName(mat);
  }

  // Edit quantity used
  const [editingPm, setEditingPm] = useState<ProjectMaterial | null>(null);
  const [editQtyValue, setEditQtyValue] = useState('');
  const [editUsageUnit, setEditUsageUnit] = useState<'skeins' | 'grams' | 'yards'>('skeins');
  const [editUnitPickerVisible, setEditUnitPickerVisible] = useState(false);

  // Add to stash
  const [stashMaterial, setStashMaterial] = useState<Material | null>(null);
  const [stashQtyValue, setStashQtyValue] = useState('');
  const [stashUnitPickerVisible, setStashUnitPickerVisible] = useState(false);
  const [stashUnit, setStashUnit] = useState<string | null>(null);
  const [savingStash, setSavingStash] = useState(false);

  function openAddToStash(mat: Material) {
    const defaultUnit = getDefaultStashUnit(mat.material_type as MaterialType);
    setStashMaterial(mat);
    setStashQtyValue('');
    setStashUnit(defaultUnit);
  }

  async function saveAddToStash() {
    if (!stashMaterial) return;
    setSavingStash(true);
    const needle = isNeedleType(stashMaterial.material_type as MaterialType);
    const qty = needle ? 1 : (stashQtyValue.trim() ? Number(stashQtyValue.trim()) : null);

    if (!needle && (qty === null || isNaN(qty) || qty <= 0)) {
      Alert.alert('Quantity required', 'Please enter a quantity to add to your stash.');
      setSavingStash(false);
      return;
    }

    const updates: Record<string, any> = {
      quantity_in_stash: needle ? 1 : qty,
      stash_status: 'in_stash',
    };
    if (!needle && stashUnit) {
      updates.stash_unit = stashUnit;
    }

    await supabase.from('materials').update(updates).eq('id', stashMaterial.id);

    // Update local state so the icon fills immediately
    setMaterials((prev) =>
      prev.map((pm) =>
        pm.materials.id === stashMaterial.id
          ? { ...pm, materials: { ...pm.materials, quantity_in_stash: updates.quantity_in_stash, stash_unit: updates.stash_unit ?? pm.materials.stash_unit } }
          : pm
      )
    );

    setSavingStash(false);
    setStashMaterial(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function parseStoredQuantity(stored: string | null): { value: string; unit: 'skeins' | 'grams' | 'yards' } {
    if (!stored) return { value: '', unit: 'skeins' };
    const gramsMatch = stored.match(/^([\d.]+)\s*grams?$/i);
    if (gramsMatch) return { value: gramsMatch[1], unit: 'grams' };
    const yardsMatch = stored.match(/^([\d.]+)\s*yards?$/i);
    if (yardsMatch) return { value: yardsMatch[1], unit: 'yards' };
    return { value: stored, unit: 'skeins' };
  }

  function openEditQuantity(pm: ProjectMaterial) {
    const parsed = parseStoredQuantity(pm.quantity_used);
    setEditingPm(pm);
    setEditQtyValue(parsed.value);
    setEditUsageUnit(pm.materials.material_type === 'yarn' ? parsed.unit : 'skeins');
  }

  function convertToSkeins(value: number, unit: 'skeins' | 'grams' | 'yards', mat: Material): number | null {
    if (unit === 'skeins') return value;
    if (unit === 'grams') {
      const wps = mat.weight_per_skein_grams;
      if (!wps || wps <= 0) return null;
      return value / wps;
    }
    if (unit === 'yards') {
      const yps = mat.yardage_per_skein;
      if (!yps || yps <= 0) return null;
      return value / yps;
    }
    return value;
  }

  async function saveEditQuantity() {
    if (!editingPm) return;
    const mat = editingPm.materials;
    const rawValue = editQtyValue.trim();
    const isYarnAltUnit = mat.material_type === 'yarn' && editUsageUnit !== 'skeins';

    // Format stored string
    const newQtyStr = rawValue
      ? (isYarnAltUnit ? `${rawValue} ${editUsageUnit}` : rawValue)
      : null;
    const oldParsed = parseStoredQuantity(editingPm.quantity_used);

    // Update project_materials row
    await supabase
      .from('project_materials')
      .update({ quantity_used: newQtyStr })
      .eq('id', editingPm.id);

    // Stash delta: adjust if this is a stash material (not needle/hook)
    const isStash = mat.quantity_in_stash != null;
    const isNeedle = mat.material_type === 'needle' || mat.material_type === 'hook';
    if (isStash && !isNeedle) {
      const oldValue = oldParsed.value ? Number(oldParsed.value) : 0;
      const newValue = rawValue ? Number(rawValue) : 0;

      const oldSkeins = !isNaN(oldValue) && oldValue > 0
        ? convertToSkeins(oldValue, oldParsed.unit, mat) ?? 0
        : 0;
      const newSkeins = !isNaN(newValue) && newValue > 0
        ? convertToSkeins(newValue, editUsageUnit, mat)
        : 0;

      if (newSkeins === null) {
        // Can't convert — warn
        Alert.alert(
          'Stash not updated',
          `${editUsageUnit === 'grams' ? 'Weight' : 'Yardage'} per skein is not set, so your stash could not be adjusted.`
        );
      } else {
        const delta = (newSkeins ?? 0) - oldSkeins;
        if (!isNaN(delta) && delta !== 0) {
          const currentStash = mat.quantity_in_stash ?? 0;
          const updatedStash = Math.max(0, currentStash - delta);
          const updates: any = { quantity_in_stash: updatedStash };
          if (updatedStash === 0) updates.stash_status = 'used_up';
          await supabase.from('materials').update(updates).eq('id', mat.id);
        }
      }
    }

    // Update local state
    setMaterials((prev) =>
      prev.map((pm) => pm.id === editingPm.id ? { ...pm, quantity_used: newQtyStr } : pm)
    );
    setEditingPm(null);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Project not found</Text>
      </View>
    );
  }

  const photos = project.project_photos;

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{project.title}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleShareProject} style={styles.headerPill}>
            <Text style={styles.headerPillText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProject', { projectId })}
            style={styles.headerPill}
          >
            <Text style={styles.headerPillText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Photo carousel */}
        {photos.length > 0 ? (
          <>
            <View style={styles.photoContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {photos.map((photo) => (
                  <Image
                    key={photo.id}
                    source={{ uri: photo.storage_url }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </View>
            {photos.length > 1 && (
              <View style={styles.dots}>
                {photos.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === activePhotoIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Image source={mascotIcon} style={styles.placeholderMascot} resizeMode="contain" />
          </View>
        )}

        <View style={styles.editPhotosRow}>
          <TouchableOpacity
            style={styles.headerPill}
            onPress={() => navigation.navigate('EditPhotos', { projectId })}
          >
            <Text style={styles.headerPillText}>Edit Photos</Text>
          </TouchableOpacity>
        </View>

        {/* Project info */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{project.title}</Text>
          <View style={[styles.statusBadge, getStatusStyle(project.status)]}>
            <Text style={[styles.statusBadgeText, getStatusTextStyle(project.status)]}>{getStatusLabel(project.status)}</Text>
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {project.craft_types?.name && (
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Craft Type</Text>
                <Text style={styles.statValue}>{project.craft_types.name}</Text>
              </View>
            )}
            {project.made_for && (
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Made For</Text>
                <Text style={styles.statValue}>{project.made_for}</Text>
              </View>
            )}
            {project.date_started && (
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Started</Text>
                <Text style={styles.statValue}>{formatDate(project.date_started)}</Text>
              </View>
            )}
            {project.date_completed && (
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Completed</Text>
                <Text style={styles.statValue}>{formatDate(project.date_completed)}</Text>
              </View>
            )}
            {project.hours_logged != null && (
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Time Worked</Text>
                <Text style={styles.statValue}>{project.hours_logged} hrs</Text>
              </View>
            )}
          </View>

          {/* Technique notes */}
          {project.technique_notes && (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardLabel}>Modifications / Notes</Text>
              <Text style={styles.infoCardText}>{project.technique_notes}</Text>
            </View>
          )}

          {/* Pattern source */}
          {(project.pattern_name || project.pattern_designer || project.pattern_source) && (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardLabel}>Pattern</Text>
              {project.pattern_name && (
                <Text style={styles.infoCardText}>{project.pattern_name}</Text>
              )}
              {project.pattern_designer && (
                <Text style={styles.materialDetail}>by {project.pattern_designer}</Text>
              )}
              {project.pattern_source && (
                <Text style={styles.materialDetail}>{project.pattern_source}</Text>
              )}
            </View>
          )}
        </View>

        {/* Materials */}
        <View style={styles.materialsSection}>
          <Text style={styles.sectionHeader}>Materials</Text>
          {materials.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyMaterialsCard}
              onPress={() => navigation.navigate('AddMaterial', { projectId })}
            >
              <Ionicons name="color-palette-outline" size={32} color={Colors.primary} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyMaterialsPrompt}>What materials did you use?</Text>
              <Text style={styles.emptyMaterialsHint}>Tap to log yarn, needles, fabric, and more</Text>
              <View style={styles.emptyMaterialsButton}>
                <Text style={styles.emptyMaterialsButtonText}>+ Add Material</Text>
              </View>
            </TouchableOpacity>
          ) : (
            materials.map((pm) => {
              const mat = pm.materials;
              const spec = getMaterialSpec(mat);
              return (
                <TouchableOpacity
                  key={pm.id}
                  style={styles.materialCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('AddMaterial', { projectId, materialId: mat.id })}
                  onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleRemoveMaterial(pm.id); }}
                >
                  <View style={styles.materialCardRow}>
                    <View style={styles.materialCardLeft}>
                      {mat.material_type && (
                        <View style={[styles.badge, { backgroundColor: getMaterialBadgeColors(mat.material_type).bg }]}>
                          <Text style={[styles.badgeText, { color: getMaterialBadgeColors(mat.material_type).text }]}>{mat.material_type}</Text>
                        </View>
                      )}
                      <Text style={styles.materialTitle}>{getMaterialTitle(mat)}</Text>
                      {mat.color_name && (
                        <Text style={styles.materialDetail}>{mat.color_name}</Text>
                      )}
                      {spec && <Text style={styles.materialDetail}>{spec}</Text>}
                      <TouchableOpacity onPress={() => openEditQuantity(pm)} hitSlop={8}>
                        <Text style={[styles.materialDetail, !pm.quantity_used && styles.materialDetailHint]}>
                          {pm.quantity_used
                            ? `Used: ${pm.quantity_used}${pm.quantity_used.match(/[a-z]/i) ? '' : mat.stash_unit ? ` ${mat.stash_unit}` : ''}`
                            : 'Tap to add quantity used'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.materialCardIcons}>
                      {mat.quantity_in_stash != null ? (
                        <Ionicons name="cube" size={20} color={Colors.primary} />
                      ) : (
                        <TouchableOpacity
                          onPress={() => openAddToStash(mat)}
                          hitSlop={8}
                        >
                          <Ionicons name="cube-outline" size={20} color={Colors.textTertiary} />
                        </TouchableOpacity>
                      )}
                      {mat.is_favorited && (
                        <Ionicons name="heart" size={18} color={Colors.primary} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {materials.length > 0 && (
            <TouchableOpacity
              style={styles.addMaterialButton}
              onPress={() => navigation.navigate('AddMaterial', { projectId })}
            >
              <Text style={styles.addMaterialText}>+ Add Material</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteProject}>
          <Text style={styles.deleteButtonText}>Delete Project</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Quantity Used Modal */}
      <Modal visible={!!editingPm} animationType="fade" transparent>
        <View style={styles.editQtyOverlay}>
          <View style={styles.editQtyCard}>
            <Text style={styles.editQtyTitle}>Quantity Used</Text>
            {editingPm && (
              <Text style={styles.editQtySubtitle}>
                {getMaterialTitle(editingPm.materials)}
              </Text>
            )}
            <View style={styles.editQtyInputRow}>
              <TextInput
                style={styles.editQtyInput}
                value={editQtyValue}
                onChangeText={setEditQtyValue}
                placeholder="e.g. 2.5"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
                autoFocus
              />
              {editingPm?.materials.material_type === 'yarn' ? (
                <TouchableOpacity
                  style={styles.editQtyUnitButton}
                  onPress={() => setEditUnitPickerVisible(true)}
                >
                  <Text style={styles.editQtyUnit}>{editUsageUnit}</Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
                </TouchableOpacity>
              ) : editingPm?.materials.stash_unit ? (
                <Text style={styles.editQtyUnit}>{editingPm.materials.stash_unit}</Text>
              ) : null}
            </View>
            <View style={styles.editQtyButtons}>
              <TouchableOpacity
                style={styles.editQtyCancelBtn}
                onPress={() => setEditingPm(null)}
              >
                <Text style={styles.editQtyCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editQtySaveBtn}
                onPress={saveEditQuantity}
              >
                <Text style={styles.editQtySaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Usage unit picker for yarn */}
      <Modal visible={editUnitPickerVisible} animationType="slide" transparent>
        <View style={styles.editQtyOverlay}>
          <View style={styles.editQtyCard}>
            <Text style={styles.editQtyTitle}>Measure by</Text>
            {(['skeins', 'grams', 'yards'] as const).map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[styles.editQtyUnitRow, editUsageUnit === unit && styles.editQtyUnitRowActive]}
                onPress={() => { setEditUsageUnit(unit); setEditUnitPickerVisible(false); }}
              >
                <Text style={[styles.editQtyUnitRowText, editUsageUnit === unit && styles.editQtyUnitRowTextActive]}>
                  {unit.charAt(0).toUpperCase() + unit.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Add to Stash Modal */}
      <Modal visible={!!stashMaterial} animationType="fade" transparent>
        <View style={styles.editQtyOverlay}>
          <View style={styles.editQtyCard}>
            <Text style={styles.editQtyTitle}>Add to Stash</Text>
            {stashMaterial && (
              <Text style={styles.editQtySubtitle}>
                {getMaterialTitle(stashMaterial)}
              </Text>
            )}
            {stashMaterial && isNeedleType(stashMaterial.material_type as MaterialType) ? (
              <Text style={styles.stashNeedleNote}>
                This will be added to your stash as a tool (no quantity needed).
              </Text>
            ) : (
              <View style={styles.editQtyInputRow}>
                <TextInput
                  style={styles.editQtyInput}
                  value={stashQtyValue}
                  onChangeText={setStashQtyValue}
                  placeholder="Quantity"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                {stashMaterial?.material_type === 'thread/floss' ? (
                  <TouchableOpacity
                    style={styles.editQtyUnitButton}
                    onPress={() => setStashUnitPickerVisible(true)}
                  >
                    <Text style={styles.editQtyUnit}>{stashUnit ?? 'skeins'}</Text>
                    <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
                  </TouchableOpacity>
                ) : stashUnit ? (
                  <Text style={styles.editQtyUnit}>{stashUnit}</Text>
                ) : null}
              </View>
            )}
            <View style={styles.editQtyButtons}>
              <TouchableOpacity
                style={styles.editQtyCancelBtn}
                onPress={() => setStashMaterial(null)}
              >
                <Text style={styles.editQtyCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editQtySaveBtn}
                onPress={saveAddToStash}
                disabled={savingStash}
              >
                <Text style={styles.editQtySaveText}>
                  {savingStash ? 'Adding...' : 'Add to Stash'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Stash unit picker for thread/floss */}
      <Modal visible={stashUnitPickerVisible} animationType="slide" transparent>
        <View style={styles.editQtyOverlay}>
          <View style={styles.editQtyCard}>
            <Text style={styles.editQtyTitle}>Unit</Text>
            {(['skeins', 'cards'] as const).map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[styles.editQtyUnitRow, stashUnit === unit && styles.editQtyUnitRowActive]}
                onPress={() => { setStashUnit(unit); setStashUnitPickerVisible(false); }}
              >
                <Text style={[styles.editQtyUnitRowText, stashUnit === unit && styles.editQtyUnitRowTextActive]}>
                  {unit.charAt(0).toUpperCase() + unit.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerPill: {
    backgroundColor: Colors.primaryUltraLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  photo: {
    width: SCREEN_WIDTH - 32,
    height: (SCREEN_WIDTH - 32) * 0.75,
  },
  photoContainer: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    width: SCREEN_WIDTH - 32,
    height: (SCREEN_WIDTH - 32) * 0.75,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderMascot: {
    width: 80,
    height: 80,
    opacity: 0.6,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  editPhotosRow: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: 10,
    padding: 12,
    width: '48%' as any,
    flexGrow: 1,
    flexBasis: '46%' as any,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  materialsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyMaterialsCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyMaterialsPrompt: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  emptyMaterialsHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  emptyMaterialsButton: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyMaterialsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A3D6B',
  },
  materialCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  materialCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  materialCardLeft: {
    flex: 1,
  },
  materialCardIcons: {
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  materialTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  materialDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addMaterialButton: {
    borderWidth: 2,
    borderColor: Colors.text,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  addMaterialText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 24,
    marginHorizontal: 20,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  materialDetailHint: {
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  stashNeedleNote: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  // Edit quantity modal
  editQtyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  editQtyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
  },
  editQtyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  editQtySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  editQtyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  editQtyInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: Colors.text,
  },
  editQtyUnit: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  editQtyUnitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    gap: 4,
  },
  editQtyUnitRow: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  editQtyUnitRowActive: {
    backgroundColor: Colors.primaryUltraLight,
    borderRadius: 8,
  },
  editQtyUnitRowText: {
    fontSize: 16,
    color: Colors.text,
  },
  editQtyUnitRowTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  editQtyButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  editQtyCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  editQtyCancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  editQtySaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  editQtySaveText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
});
