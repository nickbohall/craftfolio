type MaterialLike = {
  brand?: string | null;
  name?: string | null;
  material_type?: string | null;
  needle_type?: string | null;
  needle_material?: string | null;
  needle_size_mm?: number | null;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function getMaterialDisplayName(material: MaterialLike): string {
  if (material.brand && material.name) return `${material.brand} — ${material.name}`;
  if (material.brand) return material.brand;
  if (material.name) return material.name;

  const type = material.material_type;
  if (type === 'needle' || type === 'hook') {
    const needleType = material.needle_type ?? capitalize(type);
    const mat = material.needle_material ? `${capitalize(material.needle_material)} ` : '';
    const size = material.needle_size_mm ? ` — ${material.needle_size_mm}mm` : '';

    if (material.needle_material || material.needle_size_mm) {
      return `${mat}${needleType}${size}`;
    }
    return needleType;
  }

  if (type) return capitalize(type);
  return 'Material';
}
