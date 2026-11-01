import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ShoppingRow } from './ShoppingRow';
import type { ShoppingListItem } from '../types';

const item = {
  id: '1',
  name: 'Maito',
  category: 'maitotuotteet',
  quantity_to_buy: 1,
  unit: 'l',
  store: null,
  note: null,
  source: 'manual',
} as unknown as ShoppingListItem;

function checkButtonClasses(compact: boolean): string[] {
  const html = renderToStaticMarkup(
    createElement(ShoppingRow, { item, onBought: () => {}, onDelete: () => {}, compact }),
  );
  const m = html.match(/<button[^>]*class="([^"]*)"[^>]*aria-label="Merkitse ostetuksi"/);
  expect(m).not.toBeNull();
  return m![1].split(/\s+/);
}

describe('ShoppingRow', () => {
  it.each([
    ['compact', true],
    ['normaali', false],
  ])('REQ-M03-5: rastituspainike on w-11 h-11 (%s)', (_name, compact) => {
    const cls = checkButtonClasses(compact);
    expect(cls).toContain('w-11');
    expect(cls).toContain('h-11');
  });
});
