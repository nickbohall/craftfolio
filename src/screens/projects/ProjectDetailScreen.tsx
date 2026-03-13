import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

type RootStackParamList = {
  ProjectDetail: { projectId: string };
  EditProject: { projectId: string };
  AddMaterial: { projectId: string; materialId?: string };
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
};

type ProjectMaterial = {
  id: string;
  quantity_used: string | null;
  materials: Material;
};

type Project = {
  id: string;
  title: string;
  made_for: string | null;
  date_completed: string | null;
  technique_notes: string | null;
  pattern_source: string | null;
  craft_types: { name: string } | null;
  project_photos: Photo[];
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ProjectDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ProjectDetail'>>();
  const { projectId } = route.params;

  const [project, setProject] = useState<Project | null>(null);
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      async function fetchData() {
        const projectRes = await (supabase
          .from('projects') as any)
          .select(
            'id, title, made_for, date_completed, technique_notes, pattern_source, craft_types(name), project_photos(id, storage_url, is_cover, sort_order)'
          )
          .eq('id', projectId)
          .single();

        const materialsRes = await (supabase
          .from('project_materials') as any)
          .select('id, quantity_used, materials(*)')
          .eq('project_id', projectId);

        if (projectRes.data) {
          const p = projectRes.data as unknown as Project;
          // Sort photos: cover first, then by sort_order
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
      }

      fetchData();
    }, [projectId])
  );

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
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

  function getMaterialTitle(mat: Material): string {
    const parts = [mat.brand, mat.name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unnamed material';
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditProject', { projectId })}
          style={styles.headerButton}
        >
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Photo carousel */}
        {photos.length > 0 ? (
          <View>
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
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>No photos</Text>
          </View>
        )}

        {/* Project info */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{project.title}</Text>
          {project.craft_types?.name && (
            <Text style={styles.craftType}>{project.craft_types.name}</Text>
          )}
          {project.made_for && (
            <Text style={styles.detail}>Made for {project.made_for}</Text>
          )}
          {project.date_completed && (
            <Text style={styles.detail}>{formatDate(project.date_completed)}</Text>
          )}
          {project.pattern_source && (
            <Text style={styles.detail}>Pattern: {project.pattern_source}</Text>
          )}
          {project.technique_notes && (
            <View style={styles.notesBlock}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{project.technique_notes}</Text>
            </View>
          )}
        </View>

        {/* Materials */}
        <View style={styles.materialsSection}>
          <Text style={styles.sectionHeader}>Materials</Text>
          {materials.length === 0 ? (
            <Text style={styles.emptyMaterials}>No materials logged</Text>
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
                  onLongPress={() => handleRemoveMaterial(pm.id)}
                >
                  {mat.material_type && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{mat.material_type}</Text>
                    </View>
                  )}
                  <Text style={styles.materialTitle}>{getMaterialTitle(mat)}</Text>
                  {mat.color_name && (
                    <Text style={styles.materialDetail}>{mat.color_name}</Text>
                  )}
                  {spec && <Text style={styles.materialDetail}>{spec}</Text>}
                  {pm.quantity_used && (
                    <Text style={styles.materialDetail}>{pm.quantity_used}</Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}

          <TouchableOpacity
            style={styles.addMaterialButton}
            onPress={() => navigation.navigate('AddMaterial', { projectId })}
          >
            <Text style={styles.addMaterialText}>+ Add Material</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  headerButton: {
    padding: 4,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  editText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  photo: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
  },
  photoPlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.5,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    color: Colors.textSecondary,
    fontSize: 16,
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
    backgroundColor: Colors.lightGray,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  craftType: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  detail: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  notesBlock: {
    marginTop: 12,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  materialsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyMaterials: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  materialCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.lavender + '33',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  materialTitle: {
    fontSize: 15,
    fontWeight: '600',
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
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  addMaterialText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
