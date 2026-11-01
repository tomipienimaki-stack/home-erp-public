import { useState } from 'react';
import {
  CATEGORY_LABELS,
  PANTRY_CATEGORIES,
  STORE_LABELS,
  STORES,
  type PantryCategory,
  type PantryItem,
  type PantryUnit,
  type StoreId,
} from '../types';
import { QuantityInput } from './QuantityInput';
import { cn } from '../lib/cn';

export interface PantryFormValues {
  name: string;
  category: PantryCategory;
  current_quantity: number;
  unit: PantryUnit;
  min_threshold: number;
  preferred_store: StoreId | '';
  notes: string;
  daily_consumption: number;
}

interface Props {
  initial?: Partial<PantryItem>;
  initialName?: string;
  initialCategory?: PantryCategory;
  onSubmit: (values: PantryFormValues) => void;
  submitLabel?: string;
  lockName?: boolean;
}

export function PantryForm({
  initial,
  initialName,
  initialCategory,
  onSubmit,
  submitLabel = 'Tallenna',
  lockName = false,
}: Props) {
  const [values, setValues] = useState<PantryFormValues>({
    name: initialName ?? initial?.ingredient?.name ?? '',
    category: initialCategory ?? (initial?.ingredient?.category as PantryCategory) ?? 'muu',
    current_quantity: Number(initial?.current_quantity ?? 0),
    unit: (initial?.unit as PantryUnit) ?? 'kpl',
    min_threshold: Number(initial?.min_threshold ?? 1),
    preferred_store: (initial?.preferred_store as StoreId) ?? '',
    notes: initial?.notes ?? '',
    daily_consumption: Number(initial?.daily_consumption ?? 0),
  });

  return (
    <form
      id="pantry-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!values.name.trim()) return;
        onSubmit(values);
      }}
      className="space-y-5"
    >
      <Field label="Nimi">
        <input
          autoFocus={!lockName}
          required
          disabled={lockName}
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          placeholder="esim. Maito"
          className="input disabled:bg-cream-100 disabled:cursor-not-allowed"
        />
      </Field>

      <Field label="Kategoria">
        <div className="flex flex-wrap gap-1.5">
          {PANTRY_CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setValues({ ...values, category: c })}
              className={cn(
                'chip ring-1',
                values.category === c
                  ? 'bg-forest-600 text-cream-50 ring-forest-700'
                  : 'bg-cream-100 text-ink-700 ring-cream-200',
              )}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Määrä">
          <QuantityInput
            value={values.current_quantity}
            unit={values.unit}
            onValueChange={(v) => setValues({ ...values, current_quantity: v })}
            onUnitChange={(u) => setValues({ ...values, unit: u })}
          />
        </Field>
        <Field label="Min-raja">
          <QuantityInput
            value={values.min_threshold}
            unit={values.unit}
            onValueChange={(v) => setValues({ ...values, min_threshold: v })}
          />
        </Field>
      </div>

      <Field label="Päivittäinen kulutus (valinnainen)">
        <div className="flex gap-2 items-center">
          <input
            type="number"
            step="0.1"
            min={0}
            value={values.daily_consumption}
            onChange={(e) => setValues({ ...values, daily_consumption: Number(e.target.value) })}
            className="input flex-1"
            placeholder="0"
          />
          <span className="text-sm text-ink-500 whitespace-nowrap">{values.unit} / päivä</span>
        </div>
        <p className="text-[11px] text-ink-500 mt-1.5">
          Asetuksessa varastosaldo vähenee automaattisesti joka aamu. Esim. leipä 2 viipale = ~0.04 pkt/päivä.
        </p>
      </Field>

      <Field label="Mieluinen kauppa (valinnainen)">
        <select
          value={values.preferred_store}
          onChange={(e) => setValues({ ...values, preferred_store: e.target.value as StoreId | '' })}
          className="input"
        >
          <option value="">Ei valittu</option>
          {STORES.map((s) => (
            <option key={s} value={s}>{STORE_LABELS[s]}</option>
          ))}
        </select>
      </Field>

      <Field label="Muistiinpanot (valinnainen)">
        <textarea
          rows={2}
          value={values.notes}
          onChange={(e) => setValues({ ...values, notes: e.target.value })}
          className="input resize-none"
        />
      </Field>

      <button type="submit" className="hidden">{submitLabel}</button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
