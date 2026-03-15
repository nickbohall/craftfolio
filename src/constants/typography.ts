import { TextStyle } from 'react-native';

export const Typography: Record<string, TextStyle> = {
  screenTitle: { fontSize: 28, fontWeight: '700', color: '#2D2D2D' },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.8, color: '#6B6B6B', textTransform: 'uppercase' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#2D2D2D' },
  cardSubtitle: { fontSize: 13, fontWeight: '400', color: '#6B6B6B' },
  body: { fontSize: 15, fontWeight: '400', color: '#2D2D2D' },
};
