import type { PantryCategory } from '../types';

// Kaupan kiertojärjestys: tuoretuotteet ensin, pakasteet ja juomat loppuun päin.
export const STORE_ORDER: readonly PantryCategory[] = [
  'kasvikset_ja_hedelmat',
  'lihat_ja_kala',
  'maitotuotteet',
  'kuivatuotteet',
  'sailykkeet',
  'mausteet_ja_oljyt',
  'pakasteet',
  'juomat',
  'hygienia_ja_siisteys',
  'taloustarvikkeet',
  'muu',
];

export function groupByStoreOrder<T extends { category: PantryCategory }>(
  items: T[],
): { category: PantryCategory; items: T[] }[] {
  return STORE_ORDER.map((category) => ({
    category,
    items: items.filter((i) => i.category === category),
  })).filter((g) => g.items.length > 0);
}
