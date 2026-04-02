import React, { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
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
  SectionList,
  Platform,
  KeyboardAvoidingView,
  Switch,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { usePremium } from '../../hooks/usePremium';
import { getMaterialDisplayName } from '../../lib/materialUtils';
import { getMaterialBadgeColors } from '../../lib/materialColors';
import { getDefaultStashUnit, isNeedleType } from '../../lib/validation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
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
  { label: 'Polymer Clay', value: 'polymer clay' },
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
  const [collection, setCollection] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerConfig | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSaveCount, setBulkSaveCount] = useState(0);
  const bulkToastOpacity = useRef(new Animated.Value(0)).current;
  const bulkToastLastName = useRef('');

  // Stash mode: automatic based on context. No project = stash. Has project = project material.
  const isStashMode = !projectId && !isEditing;
  const [stashQuantity, setStashQuantity] = useState('');
  const [stashUnit, setStashUnit] = useState<string | null>(null);
  const [stashUnitPickerVisible, setStashUnitPickerVisible] = useState(false);

  // Stash picker (add from stash flow)
  const [stashPickerVisible, setStashPickerVisible] = useState(false);
  const [stashItems, setStashItems] = useState<any[]>([]);
  const [loadingStash, setLoadingStash] = useState(false);
  const [stashSearch, setStashSearch] = useState('');
  const [selectedFromStash, setSelectedFromStash] = useState(false);
  const [selectedStashMaterialId, setSelectedStashMaterialId] = useState<string | null>(null);
  const [selectedStashUnit, setSelectedStashUnit] = useState<string | null>(null);
  const [quantityUsed, setQuantityUsed] = useState('');
  const [usageUnit, setUsageUnit] = useState<'skeins' | 'grams' | 'yards'>('skeins');
  const [usageUnitPickerVisible, setUsageUnitPickerVisible] = useState(false);

  const isDirty = !isEditing && (!!materialType || brand.length > 0 || name.length > 0 || colorName.length > 0 || notes.length > 0);
  const allowNavigation = useUnsavedChanges(isDirty);

  // Favorites picker
  const [favoritesVisible, setFavoritesVisible] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  async function openFavoritesPicker() {
    setLoadingFavorites(true);
    setFavoritesVisible(true);
    const { data } = await supabase
      .from('materials')
      .select('id, material_type, brand, name, color_name, needle_type, needle_material, needle_size_mm')
      .eq('user_id', user!.id)
      .eq('is_favorited', true)
      .order('created_at', { ascending: false });
    setFavorites(data ?? []);
    setLoadingFavorites(false);
  }

  async function handlePickFavorite(materialId: string) {
    setFavoritesVisible(false);
    allowNavigation();
    setSaving(true);
    const { error: joinError } = await supabase
      .from('project_materials')
      .insert({ project_id: projectId, material_id: materialId });
    setSaving(false);
    if (joinError) {
      setError(joinError.message);
      return;
    }
    navigation.goBack();
  }

  // Stash picker
  async function openStashPicker() {
    setLoadingStash(true);
    setStashPickerVisible(true);
    setStashSearch('');
    const { data } = await supabase
      .from('materials')
      .select('*')
      .eq('user_id', user!.id)
      .not('quantity_in_stash', 'is', null)
      .neq('stash_status', 'used_up')
      .order('material_type')
      .order('created_at', { ascending: false });
    setStashItems(data ?? []);
    setLoadingStash(false);
  }

  function handlePickFromStash(mat: any) {
    setStashPickerVisible(false);
    setSelectedFromStash(true);
    setSelectedStashMaterialId(mat.id);
    setSelectedStashUnit(mat.stash_unit ?? null);
    setQuantityUsed('');
    setUsageUnit('skeins');

    // Pre-fill ALL fields
    if (mat.material_type) setMaterialType(mat.material_type as MaterialType);
    if (mat.brand) setBrand(mat.brand); else setBrand('');
    if (mat.name) setName(mat.name); else setName('');
    if (mat.color_name) setColorName(mat.color_name); else setColorName('');
    if (mat.color_code) setColorCode(mat.color_code); else setColorCode('');
    if (mat.dye_lot) setDyeLot(mat.dye_lot); else setDyeLot('');
    if (mat.fiber_content) setFiberContent(mat.fiber_content); else setFiberContent('');
    if (mat.yarn_weight) setYarnWeight(mat.yarn_weight as YarnWeight); else setYarnWeight(null);
    if (mat.yardage_per_skein != null) setYardagePerSkein(String(mat.yardage_per_skein)); else setYardagePerSkein('');
    if (mat.weight_per_skein_grams != null) setWeightPerSkeinGrams(String(mat.weight_per_skein_grams)); else setWeightPerSkeinGrams('');
    if (mat.needle_type) setNeedleType(mat.needle_type as NeedleType); else setNeedleType(null);
    if (mat.needle_size_mm != null) setNeedleSizeMm(String(mat.needle_size_mm)); else setNeedleSizeMm('');
    if (mat.needle_size_us) setNeedleSizeUs(mat.needle_size_us); else setNeedleSizeUs('');
    if (mat.needle_material) setNeedleMaterial(mat.needle_material as NeedleMaterial); else setNeedleMaterial(null);
    if (mat.cable_length_inches != null) setCableLengthInches(String(mat.cable_length_inches)); else setCableLengthInches('');
    if (mat.notes) setNotes(mat.notes); else setNotes('');
    if (mat.collection) setCollection(mat.collection); else setCollection('');
    setIsFavorited(!!mat.is_favorited);
    // Stash fields pre-fill
    if (mat.quantity_in_stash != null) {
      setStashQuantity(String(mat.quantity_in_stash));
      setStashUnit(mat.stash_unit ?? null);
    }
  }

  async function decrementStash(matId: string, used: number) {
    const { data: mat } = await supabase
      .from('materials')
      .select('material_type, quantity_in_stash, stash_unit, stash_status')
      .eq('id', matId)
      .single();

    if (!mat) return;
    if (mat.material_type === 'needle' || mat.material_type === 'hook') return;
    if (mat.quantity_in_stash == null) return;

    const current = mat.quantity_in_stash as number;
    const newQty = current - used;

    if (newQty < 0) {
      const unitLabel = mat.stash_unit ?? 'units';
      return new Promise<void>((resolve) => {
        Alert.alert(
          'Not enough in stash',
          `You only have ${current} ${unitLabel} but used ${used}. Your stash will be updated to 0.`,
          [{
            text: 'OK',
            onPress: async () => {
              await supabase.from('materials').update({
                quantity_in_stash: 0,
                stash_status: 'used_up',
              }).eq('id', matId);
              resolve();
            },
          }]
        );
      });
    }

    if (newQty === 0) {
      return new Promise<void>((resolve) => {
        Alert.alert(
          'Last one used!',
          `You've used your last ${mat.stash_unit ?? 'unit'}! Mark as Used Up?`,
          [
            {
              text: 'Keep in Stash',
              onPress: async () => {
                await supabase.from('materials').update({ quantity_in_stash: 0 }).eq('id', matId);
                resolve();
              },
            },
            {
              text: 'Mark as Used Up',
              onPress: async () => {
                await supabase.from('materials').update({
                  quantity_in_stash: 0,
                  stash_status: 'used_up',
                }).eq('id', matId);
                resolve();
              },
            },
          ]
        );
      });
    }

    await supabase.from('materials').update({ quantity_in_stash: newQty }).eq('id', matId);
  }

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
        if (data.collection) setCollection(data.collection);
        setIsFavorited(!!data.is_favorited);
        // Stash pre-fill for editing
        if (data.quantity_in_stash != null) {
          setStashQuantity(String(data.quantity_in_stash));
          setStashUnit(data.stash_unit ?? null);
        }
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
        const validTypes: MaterialType[] = ['yarn', 'thread/floss', 'needle', 'fabric', 'polymer clay', 'other'];
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

  type StashUnitValue = 'skeins' | 'cards' | 'yards' | 'pieces' | null;

  function getStashFields(): { quantity_in_stash: number | null; stash_unit: StashUnitValue; stash_status: 'in_stash' | 'used_up' | 'reserved' } {
    if (!isStashMode) {
      return { quantity_in_stash: null, stash_unit: null, stash_status: 'in_stash' };
    }
    if (isNeedleType(materialType)) {
      return { quantity_in_stash: 0, stash_unit: null, stash_status: 'in_stash' };
    }
    const qty = stashQuantity ? Number(stashQuantity) : 0;
    const rawUnit = stashUnit ?? getDefaultStashUnit(materialType);
    const validUnits: StashUnitValue[] = ['skeins', 'cards', 'yards', 'pieces', null];
    const unit: StashUnitValue = validUnits.includes(rawUnit as StashUnitValue) ? rawUnit as StashUnitValue : null;
    return { quantity_in_stash: qty, stash_unit: unit, stash_status: 'in_stash' };
  }

  function resetForBulkAdd() {
    // Capture what was just saved for the toast
    const savedName = [colorName, colorCode].filter(Boolean).join(' — ') || 'Material';
    bulkToastLastName.current = savedName;

    setColorName('');
    setColorCode('');
    setDyeLot('');
    setCollection('');
    setError(null);
    setBulkSaveCount((c) => c + 1);

    // Haptic + animated toast
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    bulkToastOpacity.setValue(1);
    Animated.timing(bulkToastOpacity, {
      toValue: 0,
      duration: 600,
      delay: 2000,
      useNativeDriver: true,
    }).start();
  }

  async function handleSave() {
    if (!materialType || !user) return;

    allowNavigation();
    setSaving(true);
    setError(null);

    // Stash flow: link existing material to project, decrement, done
    if (selectedFromStash && selectedStashMaterialId && projectId) {
      const rawQty = quantityUsed.trim();
      // Store what the user entered for their reference (e.g. "150 grams")
      const qtyUsedStr = rawQty
        ? (usageUnit !== 'skeins' && materialType === 'yarn' ? `${rawQty} ${usageUnit}` : rawQty)
        : null;

      const { error: joinError } = await supabase
        .from('project_materials')
        .insert({
          project_id: projectId,
          material_id: selectedStashMaterialId,
          quantity_used: qtyUsedStr,
        });

      if (joinError) {
        setError(joinError.message);
        setSaving(false);
        return;
      }

      // Auto-decrement: convert to skeins if needed
      if (rawQty && !isNeedleType(materialType)) {
        const enteredValue = Number(rawQty);
        if (!isNaN(enteredValue) && enteredValue > 0) {
          let skeinsUsed = enteredValue;

          if (materialType === 'yarn' && usageUnit === 'grams') {
            const wps = weightPerSkeinGrams ? Number(weightPerSkeinGrams) : 0;
            if (wps > 0) {
              skeinsUsed = enteredValue / wps;
            } else {
              // Can't convert — warn and skip decrement
              Alert.alert(
                'Stash not updated',
                'Weight per skein is not set on this material, so your stash could not be adjusted. You can edit the material to add this info.'
              );
              setSaving(false);
              navigation.goBack();
              return;
            }
          } else if (materialType === 'yarn' && usageUnit === 'yards') {
            const yps = yardagePerSkein ? Number(yardagePerSkein) : 0;
            if (yps > 0) {
              skeinsUsed = enteredValue / yps;
            } else {
              Alert.alert(
                'Stash not updated',
                'Yardage per skein is not set on this material, so your stash could not be adjusted. You can edit the material to add this info.'
              );
              setSaving(false);
              navigation.goBack();
              return;
            }
          }

          await decrementStash(selectedStashMaterialId, skeinsUsed);
        }
      }

      setSaving(false);
      navigation.goBack();
      return;
    }

    const stashFields = getStashFields();
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
      collection: collection.trim() || null,
      is_favorited: isFavorited,
      ...stashFields,
    };

    if (isEditing) {
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

    // Link to project if we have a real projectId
    if (projectId) {
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
    }

    setSaving(false);

    // Bulk mode: reset color fields and stay on form
    if (!isEditing && bulkMode) {
      resetForBulkAdd();
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
            {renderField('Yarn Line', name, setName)}
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
            {renderField('Line', name, setName, { placeholder: 'e.g. Mouliné Spécial' })}
            {renderField('Collection', collection, setCollection, { placeholder: 'e.g. Coloris' })}
            {renderField('Color Name', colorName, setColorName)}
            {renderField('Color Code', colorCode, setColorCode, { placeholder: 'e.g. DMC #321' })}
            {renderField('Dye Lot', dyeLot, setDyeLot)}
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
      case 'polymer clay':
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

  async function toggleFavorite() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !isFavorited;
    setIsFavorited(newValue);
    if (isEditing && materialId) {
      await supabase
        .from('materials')
        .update({ is_favorited: newValue })
        .eq('id', materialId);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerCancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Material' : 'Add Material'}</Text>
        <TouchableOpacity onPress={toggleFavorite} hitSlop={12} style={styles.headerButton}>
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavorited ? Colors.primary : Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Bulk save success banner */}
      {bulkSaveCount > 0 && bulkMode && (
        <View style={styles.bulkBanner}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
          <Text style={styles.bulkBannerText}>
            {bulkSaveCount} {bulkSaveCount === 1 ? 'material' : 'materials'} added — enter next color
          </Text>
        </View>
      )}

      {loadingExisting ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 24 }} />
      ) : null}

      {/* Add from Stash */}
      {!isEditing && projectId !== '' && (
        <TouchableOpacity
          style={styles.stashPickerButton}
          onPress={openStashPicker}
        >
          <Ionicons name="cube-outline" size={18} color={Colors.primary} />
          <Text style={styles.stashPickerButtonText}>Add from Stash</Text>
        </TouchableOpacity>
      )}

      {/* Pick from Favorites */}
      {!isEditing && projectId !== '' && (
        <TouchableOpacity
          style={styles.favoritesButton}
          onPress={openFavoritesPicker}
        >
          <Ionicons name="heart" size={18} color={Colors.primary} />
          <Text style={styles.favoritesButtonText}>Pick from Favorites</Text>
        </TouchableOpacity>
      )}

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

      {/* Stash quantity fields — auto-shown when adding from Materials tab */}
      {isStashMode && materialType && (
        <View style={styles.stashSection}>
          <Text style={styles.label}>Stash Quantity</Text>
          {isNeedleType(materialType) ? (
            <Text style={styles.stashHint}>This item will be added to your stash</Text>
          ) : (
            <View style={styles.stashQuantityRow}>
              <TextInput
                style={[styles.input, styles.stashQuantityInput]}
                value={stashQuantity}
                onChangeText={(val) => {
                  setStashQuantity(val);
                  if (!stashUnit) setStashUnit(getDefaultStashUnit(materialType));
                }}
                placeholder="Quantity"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />
              {materialType === 'thread/floss' ? (
                <TouchableOpacity
                  style={styles.stashUnitButton}
                  onPress={() => setStashUnitPickerVisible(true)}
                >
                  <Text style={styles.stashUnitText}>{stashUnit ?? 'skeins'}</Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
                </TouchableOpacity>
              ) : (
                <View style={styles.stashUnitDisplay}>
                  <Text style={styles.stashUnitText}>{stashUnit ?? getDefaultStashUnit(materialType) ?? 'pieces'}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Thread/floss unit picker */}
      <Modal visible={stashUnitPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Unit</Text>
              <TouchableOpacity onPress={() => setStashUnitPickerVisible(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            {['skeins', 'cards'].map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[styles.pickerRow, stashUnit === unit && styles.pickerRowSelected]}
                onPress={() => { setStashUnit(unit); setStashUnitPickerVisible(false); }}
              >
                <Text style={[styles.pickerRowText, stashUnit === unit && styles.pickerRowTextSelected]}>
                  {unit.charAt(0).toUpperCase() + unit.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Dynamic Fields */}
      {renderFields()}

      {/* Quantity Used (stash flow) */}
      {selectedFromStash && !isNeedleType(materialType) && (
        <View>
          <Text style={styles.label}>Quantity Used</Text>
          <View style={styles.stashQuantityRow}>
            <TextInput
              style={[styles.input, styles.stashQuantityInput]}
              value={quantityUsed}
              onChangeText={setQuantityUsed}
              placeholder="How many did you use?"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="decimal-pad"
            />
            {materialType === 'yarn' ? (
              <TouchableOpacity
                style={styles.stashUnitButton}
                onPress={() => setUsageUnitPickerVisible(true)}
              >
                <Text style={styles.stashUnitText}>{usageUnit}</Text>
                <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
              </TouchableOpacity>
            ) : selectedStashUnit ? (
              <View style={styles.stashUnitDisplay}>
                <Text style={styles.stashUnitText}>{selectedStashUnit}</Text>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {/* Yarn usage unit picker */}
      <Modal visible={usageUnitPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Measure by</Text>
              <TouchableOpacity onPress={() => setUsageUnitPickerVisible(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            {(['skeins', 'grams', 'yards'] as const).map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[styles.pickerRow, usageUnit === unit && styles.pickerRowSelected]}
                onPress={() => { setUsageUnit(unit); setUsageUnitPickerVisible(false); }}
              >
                <Text style={[styles.pickerRowText, usageUnit === unit && styles.pickerRowTextSelected]}>
                  {unit.charAt(0).toUpperCase() + unit.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Error */}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Bulk mode toggle — right before save, only for new materials */}
      {!isEditing && materialType && (
        <View style={styles.bulkToggleRow}>
          <View>
            <Text style={styles.bulkToggleLabel}>Bulk Add</Text>
            <Text style={styles.bulkToggleHint}>Stay on form after saving to add more colors</Text>
          </View>
          <Switch
            value={bulkMode}
            onValueChange={setBulkMode}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>
      )}

      {/* Bulk save toast */}
      {bulkSaveCount > 0 && bulkMode && (
        <Animated.View style={[styles.bulkToast, { opacity: bulkToastOpacity }]}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
          <Text style={styles.bulkToastText}>
            Saved "{bulkToastLastName.current}" ({bulkSaveCount} added)
          </Text>
        </Animated.View>
      )}

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

      {/* Delete Material — only when editing */}
      {isEditing && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert(
              'Delete Material',
              'This will remove this material permanently. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    // Remove any project_materials links first
                    await supabase.from('project_materials').delete().eq('material_id', materialId!);
                    await supabase.from('materials').delete().eq('id', materialId!);
                    navigation.goBack();
                  },
                },
              ]
            );
          }}
        >
          <Text style={styles.deleteButtonText}>Delete Material</Text>
        </TouchableOpacity>
      )}

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

      {/* Stash Picker Modal */}
      <Modal visible={stashPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.stashModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add from Stash</Text>
              <TouchableOpacity onPress={() => setStashPickerVisible(false)}>
                <Text style={styles.modalDone}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={stashSearch}
                onChangeText={setStashSearch}
                placeholder="Search materials..."
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            {loadingStash ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
            ) : (
              <StashPickerList
                items={stashItems}
                search={stashSearch}
                onSelect={handlePickFromStash}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Favorites Picker Modal */}
      <Modal visible={favoritesVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pick from Favorites</Text>
              <TouchableOpacity onPress={() => setFavoritesVisible(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            {loadingFavorites ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
            ) : favorites.length === 0 ? (
              <View style={styles.favoritesEmpty}>
                <Text style={styles.favoritesEmptyText}>No favorites yet</Text>
                <Text style={styles.favoritesEmptyHint}>Heart a material to save it for reuse</Text>
              </View>
            ) : (
              <FlatList
                data={favorites}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const badgeColors = getMaterialBadgeColors(item.material_type);
                  return (
                    <TouchableOpacity
                      style={styles.favoriteRow}
                      onPress={() => handlePickFavorite(item.id)}
                    >
                      {item.material_type && (
                        <View style={[styles.favoriteBadge, { backgroundColor: badgeColors.bg }]}>
                          <Text style={[styles.favoriteBadgeText, { color: badgeColors.text }]}>
                            {item.material_type}
                          </Text>
                        </View>
                      )}
                      <View style={styles.favoriteInfo}>
                        <Text style={styles.favoriteName}>{getMaterialDisplayName(item)}</Text>
                        {item.color_name && (
                          <Text style={styles.favoriteDetail}>{item.color_name}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function formatMaterialType(type: string): string {
  if (type === 'thread/floss') return 'Thread / Floss';
  if (type === 'needle') return 'Needle / Hook';
  if (type === 'polymer clay') return 'Polymer Clay';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function StashPickerList({ items, search, onSelect }: { items: any[]; search: string; onSelect: (mat: any) => void }) {
  const filtered = items.filter((m) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const display = getMaterialDisplayName(m).toLowerCase();
    const brand = (m.brand ?? '').toLowerCase();
    const color = (m.color_name ?? '').toLowerCase();
    return display.includes(s) || brand.includes(s) || color.includes(s);
  });

  const groups: Record<string, any[]> = {};
  for (const mat of filtered) {
    const key = mat.material_type ?? 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(mat);
  }
  const sections = Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, data]) => ({ title: formatMaterialType(type), data }));

  if (sections.length === 0) {
    return (
      <View style={stashPickerStyles.empty}>
        <Text style={stashPickerStyles.emptyText}>
          {search.trim() ? 'No matches found' : 'Your stash is empty'}
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section: { title } }) => (
        <Text style={stashPickerStyles.sectionHeader}>{title}</Text>
      )}
      renderItem={({ item }) => {
        const badgeColors = getMaterialBadgeColors(item.material_type);
        const isNeedle = item.material_type === 'needle' || item.material_type === 'hook';
        const qtyDisplay = isNeedle
          ? 'In Stash'
          : `${item.quantity_in_stash ?? 0} ${item.stash_unit ?? 'pieces'}`;
        return (
          <TouchableOpacity style={stashPickerStyles.row} onPress={() => onSelect(item)}>
            {item.material_type && (
              <View style={[stashPickerStyles.badge, { backgroundColor: badgeColors.bg }]}>
                <Text style={[stashPickerStyles.badgeText, { color: badgeColors.text }]}>
                  {item.material_type}
                </Text>
              </View>
            )}
            <View style={stashPickerStyles.info}>
              <Text style={stashPickerStyles.name}>{getMaterialDisplayName(item)}</Text>
              <View style={stashPickerStyles.metaRow}>
                <Text style={stashPickerStyles.qty}>{qtyDisplay}</Text>
                {item.color_name && <Text style={stashPickerStyles.color}>{item.color_name}</Text>}
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const stashPickerStyles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 12 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '500', color: Colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 },
  qty: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  color: { fontSize: 13, color: Colors.textTertiary },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
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
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  typeButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  typeButtonSelected: {
    backgroundColor: Colors.primaryUltraLight,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  typeButtonTextSelected: {
    color: Colors.primary,
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
  // Bulk mode
  bulkToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 24,
    marginBottom: 4,
  },
  bulkToggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  bulkToggleHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  bulkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  bulkBannerText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '500',
    flex: 1,
  },
  bulkToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
    marginBottom: 4,
    gap: 8,
  },
  bulkToastText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '500',
    flex: 1,
  },
  saveText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 12,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
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
  pickerRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pickerRowSelected: {
    backgroundColor: Colors.primaryUltraLight,
  },
  pickerRowText: {
    fontSize: 16,
    color: Colors.text,
  },
  pickerRowTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  // Stash
  stashSection: {
    marginTop: 16,
    marginBottom: 4,
  },
  stashHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    marginLeft: 4,
  },
  stashQuantityRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  stashQuantityInput: {
    flex: 1,
  },
  stashUnitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 6,
  },
  stashUnitDisplay: {
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  stashUnitText: {
    fontSize: 15,
    color: Colors.text,
  },
  // Stash picker button
  stashPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    height: 48,
    marginBottom: 12,
    gap: 8,
  },
  stashPickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  stashModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  searchRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    fontSize: 15,
    color: Colors.text,
  },
  // Favorites picker
  favoritesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    height: 52,
    marginBottom: 12,
    gap: 8,
  },
  favoritesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  favoritesEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  favoritesEmptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  favoritesEmptyHint: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  favoriteBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 12,
  },
  favoriteBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  favoriteDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
