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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { usePremium } from '../../hooks/usePremium';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MaterialType, YarnWeight, NeedleType, NeedleMaterial } from '../../types/database';

type RootStackParamList = {
  Tabs: undefined;
  AddPhotos: undefined;
  AddDetails: { photos: string[] };
  AddMaterial: { projectId: string; materialId?: string };
  Upgrade: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'AddMaterial'>;

const MATERIAL_TYPES: { label: string; value: MaterialType }[] = [
  { label: 'Yarn', value: 'yarn' },
  { label: 'Thread / Floss', value: 'thread/floss' },
  { label: 'Needle / Hook', value: 'needle' },
  { label: 'Fabric', value: 'fabric' },
  { label: 'Resin / Other', value: 'other' },
];

const YARN_WEIGHTS: YarnWeight[] = [
  'Lace (0)', 'Fingering (1)', 'Sport (2)', 'DK (3)',
  'Worsted (4)', 'Aran (5)', 'Bulky (6)', 'Super Bulky (7)', 'Jumbo (8)',
];

const NEEDLE_TYPES: { label: string; value: NeedleType }[] = [
  { label: 'Straight', value: 'straight' },
  { label: 'Circular', value: 'circular' },
  { label: 'DPN', value: 'DPN' },
  { label: 'Interchangeable', value: 'interchangeable' },
  { label: 'Crochet Hook', value: 'crochet hook' },
];

const NEEDLE_MATERIALS: { label: string; value: NeedleMaterial }[] = [
  { label: 'Bamboo', value: 'bamboo' },
  { label: 'Metal', value: 'metal' },
  { label: 'Wood', value: 'wood' },
  { label: 'Plastic', value: 'plastic' },
];

type PickerConfig = {
  title: string;
  data: { label: string; value: string }[];
  onSelect: (value: string) => void;
  selected: string | null;
};

export default function AddMaterialScreen({ route, navigation }: Props) {
  const { projectId, materialId } = route.params;
  const isEditing = !!materialId;
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const [scanning, setScanning] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditing);

  const [materialType, setMaterialType] = useState<MaterialType | null>(null);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [colorName, setColorName] = useState('');
  const [colorCode, setColorCode] = useState('');
  const [dyeLot, setDyeLot] = useState('');
  const [fiberContent, setFiberContent] = useState('');
  const [yarnWeight, setYarnWeight] = useState<YarnWeight | null>(null);
  const [yardagePerSkein, setYardagePerSkein] = useState('');
  const [weightPerSkeinGrams, setWeightPerSkeinGrams] = useState('');
  const [needleType, setNeedleType] = useState<NeedleType | null>(null);
  const [needleSizeMm, setNeedleSizeMm] = useState('');
  const [needleSizeUs, setNeedleSizeUs] = useState('');
  const [needleMaterial, setNeedleMaterial] = useState<NeedleMaterial | null>(null);
  const [cableLengthInches, setCableLengthInches] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerConfig | null>(null);

  // Load existing material for editing
  useEffect(() => {
    if (!materialId) return;
    async function fetchMaterial() {
      const { data: rawData } = await supabase
        .from('materials')
        .select('*')
        .eq('id', materialId!)
        .single();

      const data = rawData as any;
      if (data) {
        if (data.material_type) setMaterialType(data.material_type as MaterialType);
        if (data.brand) setBrand(data.brand);
        if (data.name) setName(data.name);
        if (data.color_name) setColorName(data.color_name);
        if (data.color_code) setColorCode(data.color_code);
        if (data.dye_lot) setDyeLot(data.dye_lot);
        if (data.fiber_content) setFiberContent(data.fiber_content);
        if (data.yarn_weight) setYarnWeight(data.yarn_weight as YarnWeight);
        if (data.yardage_per_skein != null) setYardagePerSkein(String(data.yardage_per_skein));
        if (data.weight_per_skein_grams != null) setWeightPerSkeinGrams(String(data.weight_per_skein_grams));
        if (data.needle_type) setNeedleType(data.needle_type as NeedleType);
        if (data.needle_size_mm != null) setNeedleSizeMm(String(data.needle_size_mm));
        if (data.needle_size_us) setNeedleSizeUs(data.needle_size_us);
        if (data.needle_material) setNeedleMaterial(data.needle_material as NeedleMaterial);
        if (data.cable_length_inches != null) setCableLengthInches(String(data.cable_length_inches));
        if (data.notes) setNotes(data.notes);
      }
      setLoadingExisting(false);
    }
    fetchMaterial();
  }, [materialId]);

  async function handleScan() {
    if (!isPremium) {
      navigation.navigate('Upgrade');
      return;
    }

    // Let user choose camera or gallery
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    const useCamera = status === 'granted';

    const pickerOpts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.5,
      allowsEditing: false,
    };

    const result = useCamera
      ? await ImagePicker.launchCameraAsync(pickerOpts)
      : await ImagePicker.launchImageLibraryAsync(pickerOpts);

    if (result.canceled || !result.assets?.[0]) return;

    setScanning(true);
    try {
      const asset = result.assets[0];
      // Resize to max 1200px wide, keep quality high for label text
      const manipulated = await manipulateAsync(
        asset.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.9, format: SaveFormat.JPEG }
      );
      const file = new ExpoFile(manipulated.uri);
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const mime_type = 'image/jpeg';

      console.log('Scan: sending image, size:', base64.length);
      const { data: rawData, error: fnError } = await supabase.functions.invoke('scan-material-label', {
        body: { image_base64: base64, mime_type },
      });

      // data may be a string or object depending on Supabase client version
      const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

      console.log('Scan response:', JSON.stringify(data));
      console.log('Scan error:', fnError?.message ?? fnError);

      if (fnError || !data) {
        setScanning(false);
        return;
      }

      // Pre-fill fields from scan results
      if (data.material_type) {
        const validTypes: MaterialType[] = ['yarn', 'thread/floss', 'needle', 'fabric', 'other'];
        if (validTypes.includes(data.material_type)) {
          setMaterialType(data.material_type as MaterialType);
        }
      }
      if (data.brand) setBrand(data.brand);
      if (data.color_name) setColorName(data.color_name);
      if (data.color_code) setColorCode(data.color_code);
      if (data.fiber_content) setFiberContent(data.fiber_content);
      if (data.yarn_weight) {
        const match = YARN_WEIGHTS.find((w) => w === data.yarn_weight);
        if (match) setYarnWeight(match);
      }
      if (data.needle_size_mm) setNeedleSizeMm(String(data.needle_size_mm));
      if (data.needle_size_us) setNeedleSizeUs(data.needle_size_us);
    } catch {
      // Silent fallback — no error shown to user
    } finally {
      setScanning(false);
    }
  }

  async function handleSave() {
    if (!materialType || !user) return;

    setSaving(true);
    setError(null);

    const materialData = {
      material_type: materialType,
      brand: brand.trim() || null,
      name: name.trim() || null,
      color_name: colorName.trim() || null,
      color_code: colorCode.trim() || null,
      dye_lot: dyeLot.trim() || null,
      fiber_content: fiberContent.trim() || null,
      yarn_weight: yarnWeight,
      yardage_per_skein: yardagePerSkein ? Number(yardagePerSkein) : null,
      weight_per_skein_grams: weightPerSkeinGrams ? Number(weightPerSkeinGrams) : null,
      needle_type: needleType,
      needle_size_mm: needleSizeMm ? Number(needleSizeMm) : null,
      needle_size_us: needleSizeUs.trim() || null,
      needle_material: needleMaterial,
      cable_length_inches: cableLengthInches ? Number(cableLengthInches) : null,
      notes: notes.trim() || null,
    };

    if (isEditing) {
      // Update existing material
      const { error: updateError } = await supabase
        .from('materials')
        .update(materialData)
        .eq('id', materialId!);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      navigation.goBack();
      return;
    }

    // Insert new material
    const { data: material, error: matError } = await supabase
      .from('materials')
      .insert({ ...materialData, user_id: user.id })
      .select('id')
      .single();

    if (matError || !material) {
      setError(matError?.message ?? 'Failed to save material');
      setSaving(false);
      return;
    }

    const { error: joinError } = await supabase
      .from('project_materials')
      .insert({
        project_id: projectId,
        material_id: material.id,
      });

    if (joinError) {
      setError(joinError.message);
      setSaving(false);
      return;
    }

    navigation.goBack();
  }

  function renderField(label: string, value: string, onChangeText: (t: string) => void, opts?: { placeholder?: string; numeric?: boolean }) {
    return (
      <View key={label}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={opts?.placeholder ?? label}
          placeholderTextColor={Colors.textSecondary}
          keyboardType={opts?.numeric ? 'decimal-pad' : 'default'}
        />
      </View>
    );
  }

  function renderPickerField(label: string, displayValue: string | null, config: PickerConfig) {
    return (
      <View key={label}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setPicker(config)}
        >
          <Text style={[styles.pickerButtonText, !displayValue && styles.placeholderText]}>
            {displayValue ?? `Select ${label.toLowerCase()}`}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderFields() {
    if (!materialType) return null;

    switch (materialType) {
      case 'yarn':
        return (
          <>
            {renderField('Brand', brand, setBrand)}
            {renderField('Name / Colorway', name, setName)}
            {renderField('Color Name', colorName, setColorName)}
            {renderField('Color Code', colorCode, setColorCode)}
            {renderField('Dye Lot', dyeLot, setDyeLot)}
            {renderField('Fiber Content', fiberContent, setFiberContent, { placeholder: 'e.g. 100% merino wool' })}
            {renderPickerField('Yarn Weight', yarnWeight, {
              title: 'Yarn Weight',
              data: YARN_WEIGHTS.map((w) => ({ label: w, value: w })),
              onSelect: (v) => setYarnWeight(v as YarnWeight),
              selected: yarnWeight,
            })}
            {renderField('Yardage per Skein', yardagePerSkein, setYardagePerSkein, { numeric: true })}
            {renderField('Weight per Skein (grams)', weightPerSkeinGrams, setWeightPerSkeinGrams, { numeric: true })}
          </>
        );
      case 'thread/floss':
        return (
          <>
            {renderField('Brand', brand, setBrand)}
            {renderField('Color Name', colorName, setColorName)}
            {renderField('Color Code', colorCode, setColorCode, { placeholder: 'e.g. DMC #321' })}
            {renderField('Fiber Content', fiberContent, setFiberContent)}
            {renderField('Notes', notes, setNotes)}
          </>
        );
      case 'needle':
        return (
          <>
            {renderPickerField('Needle Type', NEEDLE_TYPES.find((n) => n.value === needleType)?.label ?? null, {
              title: 'Needle Type',
              data: NEEDLE_TYPES,
              onSelect: (v) => setNeedleType(v as NeedleType),
              selected: needleType,
            })}
            {renderField('Size (mm)', needleSizeMm, setNeedleSizeMm, { numeric: true })}
            {renderField('Size (US)', needleSizeUs, setNeedleSizeUs, { placeholder: 'e.g. US 7' })}
            {renderPickerField('Material', NEEDLE_MATERIALS.find((n) => n.value === needleMaterial)?.label ?? null, {
              title: 'Needle Material',
              data: NEEDLE_MATERIALS,
              onSelect: (v) => setNeedleMaterial(v as NeedleMaterial),
              selected: needleMaterial,
            })}
            {needleType === 'circular' &&
              renderField('Cable Length (inches)', cableLengthInches, setCableLengthInches, { numeric: true })}
          </>
        );
      case 'fabric':
        return (
          <>
            {renderField('Brand', brand, setBrand)}
            {renderField('Color Name', colorName, setColorName)}
            {renderField('Fiber Content', fiberContent, setFiberContent)}
            {renderField('Notes', notes, setNotes)}
          </>
        );
      case 'other':
        return (
          <>
            {renderField('Brand', brand, setBrand)}
            {renderField('Color Name', colorName, setColorName)}
            {renderField('Notes', notes, setNotes)}
          </>
        );
      default:
        return null;
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{isEditing ? 'Edit Material' : 'Add Material'}</Text>

      {loadingExisting ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 24 }} />
      ) : null}

      {/* Scan Label Button */}
      <TouchableOpacity
        style={[styles.scanButton, scanning && styles.saveButtonDisabled]}
        onPress={handleScan}
        disabled={scanning}
      >
        {scanning ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.scanButtonText}>
            {isPremium ? 'Scan Label' : 'Scan Label (Premium)'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Material Type Selector */}
      <Text style={styles.label}>What type of material?</Text>
      <View style={styles.typeGrid}>
        {MATERIAL_TYPES.map((mt) => (
          <TouchableOpacity
            key={mt.value}
            style={[
              styles.typeButton,
              materialType === mt.value && styles.typeButtonSelected,
            ]}
            onPress={() => setMaterialType(mt.value)}
          >
            <Text
              style={[
                styles.typeButtonText,
                materialType === mt.value && styles.typeButtonTextSelected,
              ]}
            >
              {mt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Dynamic Fields */}
      {renderFields()}

      {/* Error */}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Save */}
      {materialType && (
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
          onPress={handleSave}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveText}>{isEditing ? 'Update Material' : 'Save Material'}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Cancel */}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>

      {/* Generic Picker Modal */}
      <Modal visible={!!picker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{picker?.title}</Text>
              <TouchableOpacity onPress={() => setPicker(null)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={picker?.data ?? []}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerRow,
                    picker?.selected === item.value && styles.pickerRowSelected,
                  ]}
                  onPress={() => {
                    picker?.onSelect(item.value);
                    setPicker(null);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerRowText,
                      picker?.selected === item.value && styles.pickerRowTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
    fontSize: 24,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 24,
  },
  scanButton: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  scanButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  typeButton: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  typeButtonSelected: {
    backgroundColor: Colors.white,
    borderColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  typeButtonTextSelected: {
    color: Colors.text,
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
  pickerRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pickerRowSelected: {
    backgroundColor: '#F3EEFA',
  },
  pickerRowText: {
    fontSize: 16,
    color: Colors.text,
  },
  pickerRowTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
});
