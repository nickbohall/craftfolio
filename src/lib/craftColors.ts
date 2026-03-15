// Curated palette for craft type dots — warm, muted, on-brand
const CRAFT_PALETTE = [
  '#3B7DD8', // blue (knitting, crochet — yarn crafts)
  '#C75B7A', // rose (embroidery, cross stitch — thread crafts)
  '#C4795A', // terracotta (sewing, quilting)
  '#4A8C5C', // green (macramé, weaving)
  '#7C6B9E', // purple (resin, jewelry)
  '#D4A03C', // gold (candle making, scrapbooking)
  '#5A8F9E', // teal (felting)
  '#B07050', // warm brown (leatherwork)
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCraftTypeColor(craftName: string): string {
  return CRAFT_PALETTE[hashString(craftName) % CRAFT_PALETTE.length];
}
