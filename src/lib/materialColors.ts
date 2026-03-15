import { Colors } from '../constants/colors';

// Consistent color map for material type badges across the app
export const MATERIAL_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  yarn:            { bg: '#E3F0FF', text: '#3B7DD8' },  // blue
  'thread/floss':  { bg: '#FCEEF1', text: '#C75B7A' },  // rose
  needle:          { bg: '#FEF3E2', text: '#C4795A' },  // warm orange
  fabric:          { bg: '#E8F5E9', text: '#4A8C5C' },  // green
  other:           { bg: '#F3EDF7', text: '#7C6B9E' },  // purple
};

export function getMaterialBadgeColors(materialType: string | null): { bg: string; text: string } {
  if (!materialType) return { bg: Colors.surfaceElevated, text: Colors.textSecondary };
  return MATERIAL_TYPE_COLORS[materialType] ?? { bg: Colors.surfaceElevated, text: Colors.textSecondary };
}
