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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/colors';
import { supabase, uploadProjectPhoto } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Tabs: undefined;
  AddPhotos: undefined;
  AddDetails: { photos: string[] };
  AddMaterial: { projectId: string };
};

type CraftType = { id: string; name: string };
type SavedMaterial = { id: string; brand: string | null; name: string | null; material_type: string | null };

type Props = NativeStackScreenProps<RootStackParamList, 'AddDetails'>;

export default function AddDetailsScreen({ route, navigation }: Props) {
  const { photos } = route.params;
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [craftTypes, setCraftTypes] = useState<CraftType[]>([]);
  const [craftTypesLoading, setCraftTypesLoading] = useState(true);
  const [selectedCraftType, setSelectedCraftType] = useState<CraftType | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [madeFor, setMadeFor] = useState('');
  const [dateCompleted, setDateCompleted] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Post-save state
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [materials, setMaterials] = useState<SavedMaterial[]>([]);

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
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!user) {
      setError('Not authenticated');
      return;
    }

    setSaving(true);
    setError(null);

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: title.trim(),
        craft_type_id: selectedCraftType?.id ?? null,
        made_for: madeFor.trim() || null,
        date_completed: dateCompleted ? dateCompleted.toISOString().split('T')[0] : null,
      })
      .select('id')
      .single();

    if (projectError || !project) {
      setError(projectError?.message ?? 'Failed to save project');
      setSaving(false);
      return;
    }

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
    if (m.brand && m.name) return `${m.brand} — ${m.name}`;
    if (m.brand) return m.brand;
    if (m.name) return m.name;
    return m.material_type ?? 'Material';
  }

  // After project is saved, show materials section
  if (savedProjectId) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Materials</Text>
        <Text style={styles.subtitle}>Add the materials you used for this project.</Text>

        {materials.length > 0 && (
          <View style={styles.materialsList}>
            {materials.map((m) => (
              <View key={m.id} style={styles.materialRow}>
                <View style={styles.materialTypeBadge}>
                  <Text style={styles.materialTypeBadgeText}>
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

        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => navigation.popToTop()}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Project Details</Text>

      {/* Title */}
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="What did you make?"
        placeholderTextColor={Colors.textSecondary}
      />

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
            <FlatList
              data={craftTypes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.craftTypeRow,
                    selectedCraftType?.id === item.id && styles.craftTypeRowSelected,
                  ]}
                  onPress={() => {
                    setSelectedCraftType(item);
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

      {/* Made For */}
      <Text style={styles.label}>Made For (optional)</Text>
      <TextInput
        style={styles.input}
        value={madeFor}
        onChangeText={setMadeFor}
        placeholder="Who is this for?"
        placeholderTextColor={Colors.textSecondary}
      />

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
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
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  pickerButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    fontWeight: '600',
    color: Colors.text,
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  craftTypeRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  craftTypeRowSelected: {
    backgroundColor: '#F3EEFA',
  },
  craftTypeName: {
    fontSize: 16,
    color: Colors.text,
  },
  craftTypeNameSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  error: {
    color: Colors.error,
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
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
  // Materials section (post-save)
  materialsList: {
    marginBottom: 16,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  materialTypeBadge: {
    backgroundColor: '#F3EEFA',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 12,
  },
  materialTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
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
  },
  addMaterialText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
