import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  CATEGORY_LABELS,
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  PANTRY_CATEGORIES,
  PANTRY_UNITS,
  type MealType,
  type PantryCategory,
  type PantryUnit,
  type RecipeWithIngredients,
} from '../types';
import { cn } from '../lib/cn';

export interface RecipeFormValues {
  name: string;
  description: string;
  servings: number;
  prep_time_min: number | '';
  cook_time_min: number | '';
  meal_type: MealType;
  instructions: string;
  tags: string[];
  ingredients: {
    name: string;
    quantity: number;
    unit: PantryUnit;
    category: PantryCategory;
    notes: string;
  }[];
}

interface Props {
  initial?: Partial<RecipeFormValues>;
  onSubmit: (values: RecipeFormValues) => void;
}

const blankIngredient = () => ({
  name: '',
  quantity: 1,
  unit: 'kpl' as PantryUnit,
  category: 'muu' as PantryCategory,
  notes: '',
});

export function RecipeForm({ initial, onSubmit }: Props) {
  const [v, setV] = useState<RecipeFormValues>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    servings: initial?.servings ?? 2,
    prep_time_min: initial?.prep_time_min ?? '',
    cook_time_min: initial?.cook_time_min ?? '',
    meal_type: initial?.meal_type ?? 'paivallinen',
    instructions: initial?.instructions ?? '',
    tags: initial?.tags ?? [],
    ingredients: initial?.ingredients?.length ? initial.ingredients : [blankIngredient()],
  });
  const [tagInput, setTagInput] = useState('');

  const setI = (idx: number, patch: Partial<RecipeFormValues['ingredients'][number]>) =>
    setV((s) => ({
      ...s,
      ingredients: s.ingredients.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || v.tags.includes(t)) return;
    setV({ ...v, tags: [...v.tags, t] });
    setTagInput('');
  };

  return (
    <form
      id="recipe-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.name.trim()) return;
        const cleaned: RecipeFormValues = {
          ...v,
          ingredients: v.ingredients.filter((i) => i.name.trim() && i.quantity > 0),
        };
        onSubmit(cleaned);
      }}
      className="space-y-5"
    >
      <Field label="Nimi">
        <input
          autoFocus
          required
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
          className="input"
          placeholder="esim. Lohikeitto"
        />
      </Field>

      <Field label="Kuvaus (valinnainen)">
        <input
          value={v.description}
          onChange={(e) => setV({ ...v, description: e.target.value })}
          className="input"
          placeholder="lyhyt kuvaus reseptistä"
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Annokset">
          <input
            type="number"
            min={1}
            value={v.servings}
            onChange={(e) => setV({ ...v, servings: Number(e.target.value) })}
            className="input"
          />
        </Field>
        <Field label="Esivalmistelu (min)">
          <input
            type="number"
            min={0}
            value={v.prep_time_min}
            onChange={(e) =>
              setV({ ...v, prep_time_min: e.target.value === '' ? '' : Number(e.target.value) })
            }
            className="input"
          />
        </Field>
        <Field label="Kypsennys (min)">
          <input
            type="number"
            min={0}
            value={v.cook_time_min}
            onChange={(e) =>
              setV({ ...v, cook_time_min: e.target.value === '' ? '' : Number(e.target.value) })
            }
            className="input"
          />
        </Field>
      </div>

      <Field label="Ateriatyyppi">
        <div className="flex flex-wrap gap-1.5">
          {MEAL_TYPES.map((mt) => (
            <button
              type="button"
              key={mt}
              onClick={() => setV({ ...v, meal_type: mt })}
              className={cn(
                'chip ring-1',
                v.meal_type === mt
                  ? 'bg-forest-600 text-cream-50 ring-forest-700'
                  : 'bg-cream-100 text-ink-700 ring-cream-200',
              )}
            >
              {MEAL_TYPE_LABELS[mt]}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Tagit">
        <div className="flex flex-wrap items-center gap-1.5">
          {v.tags.map((t) => (
            <span
              key={t}
              className="chip bg-forest-50 text-forest-600 ring-1 ring-forest-100"
            >
              {t}
              <button
                type="button"
                onClick={() => setV({ ...v, tags: v.tags.filter((x) => x !== t) })}
                className="hover:text-terracotta-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="lisää tagi…"
            className="input !w-32 !py-1.5 !text-xs"
          />
        </div>
      </Field>

      <Field label="Ainekset">
        <div className="space-y-2">
          {v.ingredients.map((ing, i) => (
            <div key={i} className="flex flex-wrap gap-1.5 items-center">
              <input
                value={ing.quantity}
                onChange={(e) => setI(i, { quantity: Number(e.target.value) })}
                type="number"
                step="0.1"
                min={0}
                className="input !w-20 !py-2 text-sm"
              />
              <select
                value={ing.unit}
                onChange={(e) => setI(i, { unit: e.target.value as PantryUnit })}
                className="input !w-20 !py-2 text-sm"
              >
                {PANTRY_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <input
                value={ing.name}
                onChange={(e) => setI(i, { name: e.target.value })}
                placeholder="raaka-aineen nimi"
                className="input flex-1 min-w-[150px] !py-2 text-sm"
              />
              <select
                value={ing.category}
                onChange={(e) => setI(i, { category: e.target.value as PantryCategory })}
                className="input !w-44 !py-2 text-sm"
              >
                {PANTRY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setV({ ...v, ingredients: v.ingredients.filter((_, idx) => idx !== i) })
                }
                className="btn-ghost !p-2 text-terracotta-500"
                aria-label="Poista"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setV({ ...v, ingredients: [...v.ingredients, blankIngredient()] })}
            className="btn-soft text-sm"
          >
            <Plus className="w-4 h-4" /> Lisää aines
          </button>
        </div>
      </Field>

      <Field label="Ohjeet">
        <textarea
          rows={6}
          value={v.instructions}
          onChange={(e) => setV({ ...v, instructions: e.target.value })}
          placeholder="Numeroidut askeleet, markdown sallittu…"
          className="input resize-y"
        />
      </Field>
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

export function recipeToFormValues(r: RecipeWithIngredients): RecipeFormValues {
  return {
    name: r.name,
    description: r.description ?? '',
    servings: r.servings,
    prep_time_min: r.prep_time_min ?? '',
    cook_time_min: r.cook_time_min ?? '',
    meal_type: r.meal_type,
    instructions: r.instructions ?? '',
    tags: r.tags ?? [],
    ingredients: r.ingredients.map((ri) => ({
      name: ri.ingredient?.name ?? '',
      quantity: Number(ri.quantity),
      unit: ri.unit,
      category: ri.ingredient?.category ?? 'muu',
      notes: ri.notes ?? '',
    })),
  };
}

export function formValuesToApiBody(v: RecipeFormValues) {
  return {
    name: v.name.trim(),
    description: v.description.trim() || null,
    servings: v.servings,
    prep_time_min: v.prep_time_min === '' ? null : v.prep_time_min,
    cook_time_min: v.cook_time_min === '' ? null : v.cook_time_min,
    meal_type: v.meal_type,
    instructions: v.instructions.trim() || null,
    tags: v.tags,
    ingredients: v.ingredients
      .filter((i) => i.name.trim() && i.quantity > 0)
      .map((i) => ({
        name: i.name.trim(),
        quantity: i.quantity,
        unit: i.unit,
        notes: i.notes.trim() || null,
      })),
  };
}
