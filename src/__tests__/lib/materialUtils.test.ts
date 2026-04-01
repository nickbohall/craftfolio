import { getMaterialDisplayName } from '../../lib/materialUtils';

describe('getMaterialDisplayName', () => {
  // Brand + name combinations
  it('returns "Brand — Name" when both are set', () => {
    expect(getMaterialDisplayName({ brand: 'Cascade', name: '220 Superwash' }))
      .toBe('Cascade — 220 Superwash');
  });

  it('returns brand only when name is null', () => {
    expect(getMaterialDisplayName({ brand: 'Cascade', name: null }))
      .toBe('Cascade');
  });

  it('returns name only when brand is null', () => {
    expect(getMaterialDisplayName({ brand: null, name: '220 Superwash' }))
      .toBe('220 Superwash');
  });

  // Needle/hook fallbacks — the known bug area
  describe('needle/hook materials without brand or name', () => {
    it('returns type + material + size for a fully described needle', () => {
      expect(getMaterialDisplayName({
        material_type: 'needle',
        needle_type: 'Circular',
        needle_material: 'bamboo',
        needle_size_mm: 4.0,
      })).toBe('Bamboo Circular — 4mm');
    });

    it('returns type + size when material is not set', () => {
      expect(getMaterialDisplayName({
        material_type: 'needle',
        needle_type: 'DPN',
        needle_size_mm: 3.5,
      })).toBe('DPN — 3.5mm');
    });

    it('returns material + type when size is not set', () => {
      expect(getMaterialDisplayName({
        material_type: 'needle',
        needle_type: 'Straight',
        needle_material: 'metal',
      })).toBe('Metal Straight');
    });

    it('returns capitalized needle_type when only type is set', () => {
      expect(getMaterialDisplayName({
        material_type: 'needle',
        needle_type: 'Interchangeable',
      })).toBe('Interchangeable');
    });

    it('falls back to "Needle" when needle_type is null', () => {
      expect(getMaterialDisplayName({
        material_type: 'needle',
      })).toBe('Needle');
    });

    it('returns "Hook" for a bare hook material', () => {
      expect(getMaterialDisplayName({
        material_type: 'hook',
      })).toBe('Hook');
    });

    it('returns hook with size', () => {
      expect(getMaterialDisplayName({
        material_type: 'hook',
        needle_size_mm: 5.0,
      })).toBe('Hook — 5mm');
    });
  });

  // Other material types without brand/name
  it('returns capitalized material_type for yarn with no brand/name', () => {
    expect(getMaterialDisplayName({ material_type: 'yarn' })).toBe('Yarn');
  });

  it('returns capitalized material_type for fabric', () => {
    expect(getMaterialDisplayName({ material_type: 'fabric' })).toBe('Fabric');
  });

  it('returns "Material" when nothing is set', () => {
    expect(getMaterialDisplayName({})).toBe('Material');
  });

  it('returns "Material" when all fields are null', () => {
    expect(getMaterialDisplayName({
      brand: null,
      name: null,
      material_type: null,
      needle_type: null,
      needle_material: null,
      needle_size_mm: null,
    })).toBe('Material');
  });

  // Edge cases
  it('prefers brand+name over needle details', () => {
    expect(getMaterialDisplayName({
      brand: 'ChiaoGoo',
      name: 'Red Lace',
      material_type: 'needle',
      needle_type: 'Circular',
      needle_size_mm: 4.0,
    })).toBe('ChiaoGoo — Red Lace');
  });

  it('handles empty strings as falsy', () => {
    expect(getMaterialDisplayName({ brand: '', name: '' })).toBe('Material');
  });
});
