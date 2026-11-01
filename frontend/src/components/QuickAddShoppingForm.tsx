import { useState } from 'react';
import {
  CATEGORY_LABELS,
  PANTRY_CATEGORIES,
  STORE_LABELS,
  STORES,
  type PantryCategory,
  type PantryUnit,
  type StoreId,
} from '../types';
import { QuantityInput } from './QuantityInput';
import { cn } from '../lib/cn';

interface Props {
  onSubmit: (v: {
    name: string;
    quantity_to_buy: number;
    unit: PantryUnit;
    category: PantryCategory;
    store: StoreId | null;
  }) => void;
}

export function QuickAddShoppingForm({ onSubmit }: Props) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState<PantryUnit>('kpl');
  const [category, setCategory] = useState<PantryCategory>('muu');
  const [store, setStore] = useState<StoreId | ''>('');

  return (
    <form
      id="shopping-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({
          name: name.trim(),
          quantity_to_buy: qty,
          unit,
          category,
          store: store || null,
        });
      }}
      className="space-y-5"
    >
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Nimi</span>
        <input
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="esim. Suklaa"
          className="input mt-1.5"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Määrä</span>
          <div className="mt-1.5">
            <QuantityInput
              value={qty}
              unit={unit}
              onValueChange={setQty}
              onUnitChange={setUnit}
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Kauppa</span>
          <select
            value={store}
            onChange={(e) => setStore(e.target.value as StoreId | '')}
            className="input mt-1.5"
          >
            <option value="">Ei valittu</option>
            {STORES.map((s) => (
              <option key={s} value={s}>{STORE_LABELS[s]}</option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Kategoria</span>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {PANTRY_CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'chip ring-1',
                category === c
                  ? 'bg-forest-600 text-cream-50 ring-forest-700'
                  : 'bg-cream-100 text-ink-700 ring-cream-200',
              )}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
