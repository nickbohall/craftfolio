import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { usePremium } from '../../hooks/usePremium';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  EditProject: { projectId: string };
  Upgrade: undefined;
};

type CraftType = { id: string; name: string };

type Props = NativeStackScreenProps<RootStackParamList, 'EditProject'>;

export default function EditProjectScreen({ route, navigation }: Props) {
  const { projectId } = route.params;
  const { isPremium } = usePremium();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [isShareable, setIsShareable] = useState(false);
  const [craftTypes, setCraftTypes] = useState<CraftType[]>([]);
  const [selectedCraftType, setSelectedCraftType] = useState<CraftType | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [madeFor, setMadeFor] = useState('');
  const [dateCompleted, setDateCompleted] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [techniqueNotes, setTechniqueNotes] = useState('');
  const [patternSource, setPatternSource] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [projectRes, craftTypesRes] = await Promise.all([
        supabase
          .from('projects')
          .select('title, craft_type_id, made_for, date_completed, technique_notes, pattern_source, is_shareable')
          .eq('id', projectId)
          .single(),
        supabase
          .from('craft_types')
          .select('id, name')
          .order('name'),
      ]);

      const types = (craftTypesRes.data as CraftType[]) ?? [];
      setCraftTypes(types);

      if (projectRes.data) {
        const p = projectRes.data;
        setTitle(p.title ?? '');
        setMadeFor(p.made_for ?? '');
        setTechniqueNotes(p.technique_notes ?? '');
        setPatternSource(p.pattern_source ?? '');
        if (p.date_completed) {
          setDateCompleted(new Date(p.date_completed + 'T00:00:00'));
        }
        setIsShareable(p.is_shareable ?? false);
        if (p.craft_type_id) {
          const match = types.find((ct) => ct.id === p.craft_type_id);
          if (match) setSelectedCraftType(match);
        }
      }

      setLoading(false);
    }
    load();
  }, [projectId]);

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        title: title.trim(),
        craft_type_id: selectedCraftType?.id ?? null,
        made_for: madeFor.trim() || null,
        date_completed: dateCompleted ? dateCompleted.toISOString().split('T')[0] : null,
        technique_notes: techniqueNotes.trim() || null,
        pattern_source: patternSource.trim() || null,
        is_shareable: isShareable,
      })
      .eq('id', projectId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    navigation.goBack();
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Edit Project</Text>

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

      {/* Share Toggle */}
      <Text style={styles.label}>Sharing</Text>
      {isPremium ? (
        <View style={styles.shareRow}>
          <Text style={styles.shareLabel}>Share this project</Text>
          <Switch
            value={isShareable}
            onValueChange={setIsShareable}
            trackColor={{ false: Colors.lightGray, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>
      ) : (
        <TouchableOpacity
          style={styles.shareLockedRow}
          onPress={() => navigation.navigate('Upgrade')}
        >
          <Text style={styles.shareLabel}>Share this project</Text>
          <Text style={styles.lockedText}>Upgrade to share</Text>
        </TouchableOpacity>
      )}

      {/* Pattern Source */}
      <Text style={styles.label}>Pattern Source (optional)</Text>
      <TextInput
        style={styles.input}
        value={patternSource}
        onChangeText={setPatternSource}
        placeholder="URL or description"
        placeholderTextColor={Colors.textSecondary}
      />

      {/* Technique Notes */}
      <Text style={styles.label}>Technique Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={techniqueNotes}
        onChangeText={setTechniqueNotes}
        placeholder="What techniques did you use? Any tips?"
        placeholderTextColor={Colors.textSecondary}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Error */}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        disabled={saving}
        onPress={handleSave}
      >
        {saving ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.saveText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      {/* Cancel */}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
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
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    height: undefined,
    minHeight: 100,
    paddingVertical: 14,
  },
  pickerButton: {
    backgroundColor: Colors.white,
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
    fontWeight: '500',
  },
  error: {
    color: Colors.error,
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: Colors.primary,
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
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 12,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  shareRow: {
    backgroundColor: Colors.white,
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
  shareLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  lockedText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
});
