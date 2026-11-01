import { describe, expect, it } from 'vitest';
import { PANTRY_CATEGORIES, type PantryCategory } from '../types';
import { STORE_ORDER, groupByStoreOrder } from './shopping-order';

const item = (id: string, category: PantryCategory) => ({ id, category });

describe('shopping-order', () => {
  it('REQ-M03-6: STORE_ORDER sisältää jokaisen kategorian täsmälleen kerran', () => {
    expect([...STORE_ORDER].sort()).toEqual([...PANTRY_CATEGORIES].sort());
    expect(new Set(STORE_ORDER).size).toBe(STORE_ORDER.length);
  });

  it('REQ-M03-6: kiertojärjestys alkaa kasviksista ja päättyy kategoriaan muu', () => {
    expect(STORE_ORDER[0]).toBe('kasvikset_ja_hedelmat');
    expect(STORE_ORDER[STORE_ORDER.length - 1]).toBe('muu');
  });

  it('REQ-M03-6: ryhmät tulevat kiertojärjestyksessä', () => {
    const out = groupByStoreOrder([
      item('a', 'muu'),
      item('b', 'juomat'),
      item('c', 'kasvikset_ja_hedelmat'),
      item('d', 'maitotuotteet'),
    ]);
    expect(out.map((g) => g.category)).toEqual(['kasvikset_ja_hedelmat', 'maitotuotteet', 'juomat', 'muu']);
  });

  it('REQ-M03-6: tyhjiä ryhmiä ei palauteta', () => {
    expect(groupByStoreOrder([])).toEqual([]);
    expect(groupByStoreOrder([item('a', 'pakasteet')])).toHaveLength(1);
  });

  it('REQ-M03-6: ryhmän sisäinen järjestys säilyy', () => {
    const out = groupByStoreOrder([
      item('1', 'juomat'),
      item('2', 'lihat_ja_kala'),
      item('3', 'juomat'),
      item('4', 'juomat'),
    ]);
    expect(out.find((g) => g.category === 'juomat')!.items.map((i) => i.id)).toEqual(['1', '3', '4']);
  });
});
