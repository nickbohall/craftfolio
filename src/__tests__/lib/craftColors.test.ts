import { getCraftTypeColor } from '../../lib/craftColors';

describe('getCraftTypeColor', () => {
  it('returns a hex color string for a known craft', () => {
    const color = getCraftTypeColor('Knitting');
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('returns consistent color for the same craft name', () => {
    const first = getCraftTypeColor('Crochet');
    const second = getCraftTypeColor('Crochet');
    expect(first).toBe(second);
  });

  it('returns different colors for different craft names', () => {
    const knitting = getCraftTypeColor('Knitting');
    const resin = getCraftTypeColor('Resin');
    // Not guaranteed but extremely likely with hash distribution
    expect(knitting).not.toBe(resin);
  });

  it('handles custom/unknown craft types without crashing', () => {
    const color = getCraftTypeColor('Underwater Basket Weaving');
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('handles empty string', () => {
    const color = getCraftTypeColor('');
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
