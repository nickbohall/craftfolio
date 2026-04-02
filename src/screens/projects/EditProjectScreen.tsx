import React, { useState, useEffect, useRef } from 'react';
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
import { supabase } from '../../lib/supabase';
import { usePremium } from '../../hooks/usePremium';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

type RootStackParamList = {
  EditProject: { projectId: string };
  Upgrade: undefined;
};

type CraftType = { id: string; name: string };

type Props = NativeStackScreenProps<RootStackParamList, 'EditProject'>;

export default function EditProjectScreen({ route, navigation }: Props) {
  const { projectId } = route.params;
  const { isPremium } = usePremium();

  const STATUS_OPTIONS = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'abandoned', label: 'Abandoned' },
  ] as const;

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('completed');
  const [isShareable, setIsShareable] = useState(false);
  const [craftTypes, setCraftTypes] = useState<CraftType[]>([]);
  const [selectedCraftType, setSelectedCraftType] = useState<CraftType | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [madeFor, setMadeFor] = useState('');
  const [dateStarted, setDateStarted] = useState<Date | null>(null);
  const [showDateStartedPicker, setShowDateStartedPicker] = useState(false);
  const [dateCompleted, setDateCompleted] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hoursLogged, setHoursLogged] = useState('');
  const [techniqueNotes, setTechniqueNotes] = useState('');
  const [patternSource, setPatternSource] = useState('');
  const [patternName, setPatternName] = useState('');
  const [patternDesigner, setPatternDesigner] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialValues = useRef<Record<string, any> | null>(null);

  const isDirty = !loading && initialValues.current != null && (
    title !== initialValues.current.title ||
    status !== initialValues.current.status ||
    madeFor !== initialValues.current.madeFor ||
    hoursLogged !== initialValues.current.hoursLogged ||
    techniqueNotes !== initialValues.current.techniqueNotes ||
    patternSource !== initialValues.current.patternSource ||
    patternName !== initialValues.current.patternName ||
    patternDesigner !== initialValues.current.patternDesigner ||
    isShareable !== initialValues.current.isShareable ||
    selectedCraftType?.id !== initialValues.current.craftTypeId ||
    dateStarted?.toISOString() !== initialValues.current.dateStarted ||
    dateCompleted?.toISOString() !== initialValues.current.dateCompleted
  );
  const allowNavigation = useUnsavedChanges(isDirty);

  useEffect(() => {
    async function load() {
      const [projectRes, craftTypesRes] = await Promise.all([
        supabase
          .from('projects')
          .select('title, craft_type_id, made_for, date_started, date_completed, status, hours_logged, technique_notes, pattern_source, pattern_name, pattern_designer, is_shareable')
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
        setStatus(p.status ?? 'completed');
        setTechniqueNotes(p.technique_notes ?? '');
        setPatternSource(p.pattern_source ?? '');
        setPatternName(p.pattern_name ?? '');
        setPatternDesigner(p.pattern_designer ?? '');
        if (p.date_started) {
          setDateStarted(new Date(p.date_started + 'T00:00:00'));
        }
        if (p.date_completed) {
          setDateCompleted(new Date(p.date_completed + 'T00:00:00'));
        }
        setHoursLogged(p.hours_logged != null ? String(p.hours_logged) : '');
        setIsShareable(p.is_shareable ?? false);
        if (p.craft_type_id) {
          const match = types.find((ct) => ct.id === p.craft_type_id);
          if (match) setSelectedCraftType(match);
        }
        initialValues.current = {
          title: p.title ?? '',
          status: p.status ?? 'completed',
          madeFor: p.made_for ?? '',
          hoursLogged: p.hours_logged != null ? String(p.hours_logged) : '',
          techniqueNotes: p.technique_notes ?? '',
          patternSource: p.pattern_source ?? '',
          patternName: p.pattern_name ?? '',
          patternDesigner: p.pattern_designer ?? '',
          isShareable: p.is_shareable ?? false,
          craftTypeId: p.craft_type_id ? (types.find((ct) => ct.id === p.craft_type_id)?.id ?? null) : null,
          dateStarted: p.date_started ? new Date(p.date_started + 'T00:00:00').toISOString() : undefined,
          dateCompleted: p.date_completed ? new Date(p.date_completed + 'T00:00:00').toISOString() : undefined,
        };
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
    allowNavigation();

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        title: title.trim(),
        craft_type_id: selectedCraftType?.id ?? null,
        made_for: madeFor.trim() || null,
        status,
        date_started: dateStarted ? dateStarted.toISOString().split('T')[0] : null,
        date_completed: dateCompleted ? dateCompleted.toISOString().split('T')[0] : null,
        hours_logged: hoursLogged.trim() ? parseFloat(hoursLogged.trim()) : null,
        technique_notes: techniqueNotes.trim() || null,
        pattern_source: patternSource.trim() || null,
        pattern_name: patternName.trim() || null,
        pattern_designer: patternDesigner.trim() || null,
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <View style={styles.headerBar}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
        <Text style={styles.headerCancelText}>Cancel</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Edit Project</Text>
      <TouchableOpacity
        onPress={handleSave}
        style={styles.headerButton}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Text style={styles.headerSaveText}>Save</Text>
        )}
      </TouchableOpacity>
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

      {/* Pattern Name */}
      <Text style={styles.label}>Pattern Name (optional)</Text>
      <TextInput
        style={styles.input}
        value={patternName}
        onChangeText={setPatternName}
        placeholder="e.g. Cozy Cable Cardigan"
        placeholderTextColor={Colors.textSecondary}
      />

      {/* Pattern Designer */}
      <Text style={styles.label}>Pattern Designer (optional)</Text>
      <TextInput
        style={styles.input}
        value={patternDesigner}
        onChangeText={setPatternDesigner}
        placeholder="e.g. Andrea Mowry"
        placeholderTextColor={Colors.textSecondary}
      />

      {/* Pattern Source */}
      <Text style={styles.label}>Pattern Link / Source (optional)</Text>
      <TextInput
        style={styles.input}
        value={patternSource}
        onChangeText={setPatternSource}
        placeholder="URL or description"
        placeholderTextColor={Colors.textSecondary}
      />

      {/* Technique Notes */}
      <Text style={styles.label}>Modifications / Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={techniqueNotes}
        onChangeText={setTechniqueNotes}
        placeholder="What modifications did you make? Any tips?"
        placeholderTextColor={Colors.textSecondary}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Error */}
      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
    </KeyboardAvoidingView>
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
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  headerSaveText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
  textArea: {
    height: undefined,
    minHeight: 100,
    paddingVertical: 14,
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
