export function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${suffix}`;
}
