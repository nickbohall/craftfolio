export const Colors = {
  // Backgrounds
  background: '#FAF8F5',      // cream — app background
  surface: '#FFFFFF',          // white — cards and surfaces
  surfaceElevated: '#F5F2EE', // slightly darker cream — input backgrounds

  // Brand
  primary: '#7C6B9E',          // dark purple — buttons, links, active states
  primaryLight: '#C3B1E1',     // light lavender — badges, fills, accents
  primaryUltraLight: '#EDE8F5', // very light lavender — selected states, subtle fills

  // Text
  text: '#2D2D2D',             // near black — primary text
  textSecondary: '#6B6B6B',    // medium gray — secondary text
  textTertiary: '#9E9E9E',     // light gray — hints, placeholders

  // Borders
  border: '#E2DDD8',           // warm gray — card borders
  borderStrong: '#C8C2BB',     // stronger border — inputs on focus

  // Semantic
  success: '#5A9E7C',          // muted green — completed status
  warning: '#C4795A',          // muted terracotta — in progress accent
  error: '#C4574A',            // muted red — delete, errors

  // Aliases for backwards compatibility
  white: '#FFFFFF',
  gray: '#9E9E9E',
} as const;
