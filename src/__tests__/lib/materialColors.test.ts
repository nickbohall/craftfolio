import { getMaterialBadgeColors, MATERIAL_TYPE_COLORS } from '../../lib/materialColors';

describe('getMaterialBadgeColors', () => {
  it('returns correct colors for yarn', () => {
    const colors = getMaterialBadgeColors('yarn');
    expect(colors).toEqual({ bg: '#E3F0FF', text: '#3B7DD8' });
  });

  it('returns correct colors for thread/floss', () => {
    const colors = getMaterialBadgeColors('thread/floss');
    expect(colors).toEqual({ bg: '#FCEEF1', text: '#C75B7A' });
  });

  it('returns correct colors for needle', () => {
    const colors = getMaterialBadgeColors('needle');
    expect(colors).toEqual({ bg: '#FEF3E2', text: '#C4795A' });
  });

  it('returns correct colors for fabric', () => {
    const colors = getMaterialBadgeColors('fabric');
    expect(colors).toEqual({ bg: '#E8F5E9', text: '#4A8C5C' });
  });

  it('returns correct colors for other', () => {
    const colors = getMaterialBadgeColors('other');
    expect(colors).toEqual({ bg: '#F3EDF7', text: '#7C6B9E' });
  });

  it('returns fallback colors for unknown material type', () => {
    const colors = getMaterialBadgeColors('sparkles');
    expect(colors).toEqual({ bg: '#F5F2EE', text: '#6B6B6B' });
  });

  it('returns fallback colors for null', () => {
    const colors = getMaterialBadgeColors(null);
    expect(colors).toEqual({ bg: '#F5F2EE', text: '#6B6B6B' });
  });
});

describe('MATERIAL_TYPE_COLORS', () => {
  it('has entries for all expected material types', () => {
    const expectedTypes = ['yarn', 'thread/floss', 'needle', 'fabric', 'other'];
    for (const type of expectedTypes) {
      expect(MATERIAL_TYPE_COLORS[type]).toBeDefined();
      expect(MATERIAL_TYPE_COLORS[type].bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(MATERIAL_TYPE_COLORS[type].text).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
