import { generateSlug } from '../../lib/slugUtils';

describe('generateSlug', () => {
  it('lowercases the name', () => {
    const slug = generateSlug('Hannah');
    expect(slug).toMatch(/^hannah-\d{4}$/);
  });

  it('replaces spaces with dashes', () => {
    const slug = generateSlug('Jane Doe');
    expect(slug).toMatch(/^jane-doe-\d{4}$/);
  });

  it('strips special characters', () => {
    const slug = generateSlug("Hannah's Crafts!");
    expect(slug).toMatch(/^hannahs-crafts-\d{4}$/);
  });

  it('handles multiple consecutive spaces', () => {
    const slug = generateSlug('Jane   Doe');
    // Multiple spaces become multiple dashes, which is acceptable
    expect(slug).toMatch(/^jane-+doe-\d{4}$/);
  });

  it('appends a 4-digit suffix', () => {
    const slug = generateSlug('Test');
    const suffix = slug.split('-').pop()!;
    expect(suffix).toMatch(/^\d{4}$/);
    const num = parseInt(suffix);
    expect(num).toBeGreaterThanOrEqual(1000);
    expect(num).toBeLessThanOrEqual(9999);
  });

  it('generates different slugs on successive calls (random suffix)', () => {
    const slugs = new Set(Array.from({ length: 20 }, () => generateSlug('Test')));
    // With 20 tries and 9000 possible suffixes, collisions are extremely unlikely
    expect(slugs.size).toBeGreaterThan(1);
  });

  it('handles empty string', () => {
    const slug = generateSlug('');
    expect(slug).toMatch(/^-\d{4}$/);
  });

  it('handles numbers in name', () => {
    const slug = generateSlug('Crafter42');
    expect(slug).toMatch(/^crafter42-\d{4}$/);
  });

  it('handles unicode characters by stripping them', () => {
    const slug = generateSlug('Häñnáh');
    // Non a-z0-9 chars get stripped
    expect(slug).toMatch(/^hnh-\d{4}$/);
  });
});
