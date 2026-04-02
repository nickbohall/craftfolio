import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/colors';
import { supabase, uploadProjectPhoto } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { usePremium } from '../../hooks/usePremium';
import { getMaterialDisplayName } from '../../lib/materialUtils';
import { getMaterialBadgeColors } from '../../lib/materialColors';
import { validateProjectDetails } from '../../lib/validation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

type RootStackParamList = {
  Tabs: undefined;
  AddPhotos: undefined;
  AddDetails: { photos: string[] };
  AddMaterial: { projectId: string };
  Upgrade: undefined;
};

type CraftType = { id: string; name: string };
type SavedMaterial = { id: string; brand: string | null; name: string | null; material_type: string | null };

type Props = NativeStackScreenProps<RootStackParamList, 'AddDetails'>;

export default function AddDetailsScreen({ route, navigation }: Props) {
  const { photos } = route.params;
  const { user } = useAuth();
  const { isPremium } = usePremium();

  const STATUS_OPTIONS = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'abandoned', label: 'Abandoned' },
  ] as const;

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('in_progress');
  const [craftTypes, setCraftTypes] = useState<CraftType[]>([]);
  const [craftTypesLoading, setCraftTypesLoading] = useState(true);
  const [selectedCraftType, setSelectedCraftType] = useState<CraftType | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [customCraftName, setCustomCraftName] = useState('');
  const [dateStarted, setDateStarted] = useState<Date | null>(null);
  const [showDateStartedPicker, setShowDateStartedPicker] = useState(false);
  const [dateCompleted, setDateCompleted] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hoursLogged, setHoursLogged] = useState('');
  const [madeFor, setMadeFor] = useState('');
  const [isShareable, setIsShareable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Post-save state
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [materials, setMaterials] = useState<SavedMaterial[]>([]);

  const isDirty = !savedProjectId && (title.trim().length > 0 || madeFor.trim().length > 0 || !!selectedCraftType || !!dateStarted || !!dateCompleted || hoursLogged.trim().length > 0);
  const allowNavigation = useUnsavedChanges(isDirty);

  useEffect(() => {
    async function fetchCraftTypes() {
      const { data, error } = await supabase
        .from('craft_types')
        .select('id, name')
        .order('name');

      if (error) {
        setError('Failed to load craft types');
      } else {
        setCraftTypes((data as CraftType[]) ?? []);
      }
      setCraftTypesLoading(false);
    }
    fetchCraftTypes();
  }, []);

  async function handleAddCustomCraftType() {
    const trimmed = customCraftName.trim();
    if (!trimmed) return;

    // Check if it already exists (case-insensitive)
    const existing = craftTypes.find((ct) => ct.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setSelectedCraftType(existing);
      setCustomCraftName('');
      setPickerVisible(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('craft_types')
      .insert({ name: trimmed, is_custom: true })
      .select('id, name')
      .single();

    if (data) {
      setCraftTypes((prev) => [...prev, data as CraftType].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCraftType(data as CraftType);
    }
    setCustomCraftName('');
    setPickerVisible(false);
  }

  // Refresh materials list when returning from AddMaterialScreen
  const fetchMaterials = useCallback(async () => {
    if (!savedProjectId) return;

    const { data } = await supabase
      .from('project_materials')
      .select('material_id')
      .eq('project_id', savedProjectId);

    if (!data || data.length === 0) {
      setMaterials([]);
      return;
    }

    const materialIds = (data as { material_id: string }[]).map((pm) => pm.material_id);
    const { data: mats } = await supabase
      .from('materials')
      .select('id, brand, name, material_type')
      .in('id', materialIds);

    setMaterials((mats as SavedMaterial[]) ?? []);
  }, [savedProjectId]);

  useEffect(() => {
    if (savedProjectId) {
      const unsubscribe = navigation.addListener('focus', fetchMaterials);
      return unsubscribe;
    }
  }, [savedProjectId, navigation, fetchMaterials]);

  async function handleSaveProject() {
    const titleError = validateProjectDetails(title);
    if (titleError) {
      setError(titleError);
      return;
    }
    if (!user) {
      setError('Not authenticated');
      return;
    }

    allowNavigation();
    setSaving(true);
    setError(null);

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: title.trim(),
        status,
        craft_type_id: selectedCraftType?.id ?? null,
        date_started: dateStarted ? dateStarted.toISOString().split('T')[0] : null,
        date_completed: dateCompleted ? dateCompleted.toISOString().split('T')[0] : null,
        hours_logged: hoursLogged.trim() ? parseFloat(hoursLogged.trim()) : null,
        made_for: madeFor.trim() || null,
        is_shareable: isShareable,
      })
      .select('id')
      .single();

    if (projectError || !project) {
      setError(projectError?.message ?? 'Failed to save project');
      setSaving(false);
      return;
    }

    if (photos.length > 0) {
      let publicUrls: string[];
      try {
        publicUrls = await Promise.all(
          photos.map((uri) => uploadProjectPhoto(uri, user.id))
        );
      } catch (uploadErr: any) {
        setError(uploadErr?.message ?? 'Failed to upload photos');
        setSaving(false);
        return;
      }

      const photoRows = publicUrls.map((url, index) => ({
        project_id: project.id,
        storage_url: url,
        is_cover: index === 0,
        sort_order: index,
      }));

      const { error: photosError } = await supabase
        .from('project_photos')
        .insert(photoRows);

      if (photosError) {
        setError(photosError.message);
        setSaving(false);
        return;
      }
    }

    console.log(`Project saved: ${project.id}`);
    setSavedProjectId(project.id);
    setSaving(false);
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function materialDisplayName(m: SavedMaterial): string {
    return getMaterialDisplayName(m);
  }

  // After project is saved, show materials section
  if (savedProjectId) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={styles.headerBar}>
        <View style={styles.headerButton} />
        <Text style={styles.headerTitle}>Materials</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.popToTop()}
        >
          <Text style={styles.headerDoneText}>Done</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>Add the materials you used for this project.</Text>

        {materials.length > 0 && (
          <View style={styles.materialsList}>
            {materials.map((m) => (
              <View key={m.id} style={styles.materialRow}>
                <View style={[styles.materialTypeBadge, { backgroundColor: getMaterialBadgeColors(m.material_type).bg }]}>
                  <Text style={[styles.materialTypeBadgeText, { color: getMaterialBadgeColors(m.material_type).text }]}>
                    {m.material_type ?? '?'}
                  </Text>
                </View>
                <Text style={styles.materialName}>{materialDisplayName(m)}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.addMaterialButton}
          onPress={() => navigation.navigate('AddMaterial', { projectId: savedProjectId })}
        >
          <Text style={styles.addMaterialText}>+ Add Material</Text>
        </TouchableOpacity>

      </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <View style={styles.headerBar}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
        <Text style={styles.headerCancelText}>Cancel</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Project Details</Text>
      <View style={styles.headerButton} />
    </View>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >

      {/* Title */}
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="What did you make?"
        placeholderTextColor={Colors.textSecondary}
      />

      {/* Status */}
      <Text style={styles.label}>Status</Text>
      <View style={styles.statusRow}>
        {STATUS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.statusOption,
              status === opt.value && styles.statusOptionActive,
            ]}
            onPress={() => setStatus(opt.value)}
          >
            <Text
              style={[
                styles.statusOptionText,
                status === opt.value && styles.statusOptionTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Craft Type */}
      <Text style={styles.label}>Craft Type</Text>
      {craftTypesLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
      ) : (
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setPickerVisible(true)}
        >
          <Text
            style={[
              styles.pickerButtonText,
              !selectedCraftType && styles.placeholderText,
            ]}
          >
            {selectedCraftType?.name ?? 'Select a craft type'}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      )}

      {/* Craft Type Modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Craft Type</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.customCraftRow}>
              <TextInput
                style={styles.customCraftInput}
                value={customCraftName}
                onChangeText={setCustomCraftName}
                placeholder="Other — type your own"
                placeholderTextColor={Colors.textTertiary}
                returnKeyType="done"
                onSubmitEditing={handleAddCustomCraftType}
              />
              {customCraftName.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.customCraftAddBtn}
                  onPress={handleAddCustomCraftType}
                >
                  <Text style={styles.customCraftAddText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={craftTypes}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.craftTypeRow,
                    selectedCraftType?.id === item.id && styles.craftTypeRowSelected,
                  ]}
                  onPress={() => {
                    setSelectedCraftType(item);
                    setCustomCraftName('');
                    setPickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.craftTypeName,
                      selectedCraftType?.id === item.id && styles.craftTypeNameSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Date Started */}
      <Text style={styles.label}>Date Started (optional)</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowDateStartedPicker(true)}
      >
        <Text
          style={[
            styles.pickerButtonText,
            !dateStarted && styles.placeholderText,
          ]}
        >
          {dateStarted ? formatDate(dateStarted) : 'Select a date'}
        </Text>
      </TouchableOpacity>

      {showDateStartedPicker && (
        <DateTimePicker
          value={dateStarted ?? new Date()}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') {
              setShowDateStartedPicker(false);
            }
            if (event.type === 'set' && selectedDate) {
              setDateStarted(selectedDate);
            }
          }}
        />
      )}
      {showDateStartedPicker && Platform.OS === 'ios' && (
        <TouchableOpacity onPress={() => setShowDateStartedPicker(false)}>
          <Text style={styles.modalDone}>Done</Text>
        </TouchableOpacity>
      )}

      {/* Date Completed */}
      <Text style={styles.label}>Date Completed (optional)</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Text
          style={[
            styles.pickerButtonText,
            !dateCompleted && styles.placeholderText,
          ]}
        >
          {dateCompleted ? formatDate(dateCompleted) : 'Select a date'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={dateCompleted ?? new Date()}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') {
              setShowDatePicker(false);
            }
            if (event.type === 'set' && selectedDate) {
              setDateCompleted(selectedDate);
            }
          }}
        />
      )}
      {showDatePicker && Platform.OS === 'ios' && (
        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
          <Text style={styles.modalDone}>Done</Text>
        </TouchableOpacity>
      )}

      {/* Hours Logged */}
      <Text style={styles.label}>Hours Logged (optional)</Text>
      <TextInput
        style={styles.input}
        value={hoursLogged}
        onChangeText={setHoursLogged}
        placeholder="e.g. 4.5"
        placeholderTextColor={Colors.textSecondary}
        keyboardType="numeric"
      />

      {/* Made For */}
      <Text style={styles.label}>Made For (optional)</Text>
      <TextInput
        style={styles.input}
        value={madeFor}
        onChangeText={setMadeFor}
        placeholder="Who is this for?"
        placeholderTextColor={Colors.textSecondary}
      />

      {/* Visibility Toggle */}
      <Text style={styles.label}>Visibility</Text>
      {isPremium ? (
        <View style={styles.shareRow}>
          <View>
            <Text style={styles.shareLabel}>{isShareable ? 'Public' : 'Private'}</Text>
            <Text style={styles.shareHint}>
              {isShareable ? 'Visible on your portfolio' : 'Only you can see this'}
            </Text>
          </View>
          <Switch
            value={isShareable}
            onValueChange={setIsShareable}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>
      ) : (
        <TouchableOpacity
          style={styles.shareLockedRow}
          onPress={() => navigation.navigate('Upgrade')}
        >
          <View>
            <Text style={styles.shareLabel}>Private</Text>
            <Text style={styles.shareHint}>Upgrade to make projects public</Text>
          </View>
          <Text style={styles.lockedText}>Upgrade</Text>
        </TouchableOpacity>
      )}

      {/* Error */}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Save Project */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        disabled={saving}
        onPress={handleSaveProject}
      >
        {saving ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.saveText}>Save Project</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
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
  headerDoneText: {
    fontSize: 16,
    color: Colors.success,
    fontWeight: '600',
    textAlign: 'right',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: Colors.text,
  },
  pickerButton: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  chevron: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
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
    fontWeight: '500',
    color: Colors.text,
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  customCraftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  customCraftInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
    fontSize: 15,
    color: Colors.text,
  },
  customCraftAddBtn: {
    backgroundColor: Colors.success,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 42,
    justifyContent: 'center',
  },
  customCraftAddText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  craftTypeRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  craftTypeRowSelected: {
    backgroundColor: Colors.primaryUltraLight,
  },
  craftTypeName: {
    fontSize: 16,
    color: Colors.text,
  },
  craftTypeNameSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  error: {
    color: Colors.error,
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: Colors.success,
    borderRadius: 24,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  shareRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareLockedRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  shareHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  lockedText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  // Materials section (post-save)
  materialsList: {
    marginBottom: 16,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  materialTypeBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 12,
  },
  materialTypeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  materialName: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  addMaterialButton: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: Colors.primaryUltraLight,
  },
  addMaterialText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  statusOptionTextActive: {
    color: Colors.white,
  },
});
