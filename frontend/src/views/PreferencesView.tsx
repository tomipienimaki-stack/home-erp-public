import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, ShieldAlert, ShieldX, Trash2, Plus } from 'lucide-react';
import {
  useCreatePreference,
  useDeletePreference,
  usePreferences,
} from '../hooks/usePreferences';
import { useIngredients } from '../hooks/useIngredients';
import { Modal } from '../components/Modal';
import { ShoppingDaySettings } from '../components/ShoppingDaySettings';
import {
  CATEGORY_LABELS,
  PANTRY_CATEGORIES,
  PREFERENCE_LABELS,
  PREFERENCE_TYPES,
  type PantryCategory,
  type PreferenceType,
} from '../types';
import { cn } from '../lib/cn';

const TYPE_META: Record<PreferenceType, { color: string; bg: string; icon: any }> = {
  avoid: { color: 'text-terracotta-600', bg: 'bg-terracotta-50', icon: ShieldX },
  prefer: { color: 'text-forest-600', bg: 'bg-forest-50', icon: Heart },
  allergy: { color: 'text-rose-600', bg: 'bg-rose-50', icon: ShieldAlert },
};

export default function PreferencesView() {
  const { data: prefs = [], isLoading } = usePreferences();
  const create = useCreatePreference();
  const del = useDeletePreference();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <ShoppingDaySettings />

      <section className="card relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-terracotta-400/30 to-forest-400/30 blur-3xl"
        />
        <div className="relative p-6 sm:p-8 flex gap-6 items-end">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-forest-600">
              Mieltymykset
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-forest-700 leading-tight">
              Mitä syöt ja mitä et
            </h1>
            <p className="text-ink-500 mt-2 max-w-md">
              AI ottaa nämä huomioon ehdottaessaan viikon ruokalistaa.
            </p>
          </div>
          <button onClick={() => setAdding(true)} className="btn-accent self-start sm:self-center">
            <Plus className="w-4 h-4" /> Lisää
          </button>
        </div>
      </section>

      {PREFERENCE_TYPES.map((t) => {
        const subset = prefs.filter((p) => p.type === t);
        if (subset.length === 0 && !isLoading) return null;
        const meta = TYPE_META[t];
        const Icon = meta.icon;
        return (
          <section key={t}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className={cn('w-7 h-7 rounded-xl grid place-items-center', meta.bg)}>
                <Icon className={cn('w-4 h-4', meta.color)} />
              </div>
              <h2 className={cn('font-display text-lg', meta.color)}>
                {PREFERENCE_LABELS[t]}
              </h2>
              <span className="chip bg-cream-100 text-ink-500 ring-1 ring-cream-200">
                {subset.length}
              </span>
            </div>
            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {subset.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    className="card flex items-center gap-3 px-4 py-3"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {p.ingredient?.name ??
                          (p.category ? CATEGORY_LABELS[p.category] : 'Tuntematon')}
                      </div>
                      {p.notes && <div className="text-xs text-ink-500">{p.notes}</div>}
                    </div>
                    <button
                      onClick={() => del.mutate(p.id)}
                      className="btn-ghost !p-2 text-terracotta-500"
                      aria-label="Poista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        );
      })}

      {!isLoading && prefs.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-ink-500">
            Ei mieltymyksiä vielä. Lisää esim. "Vältä sianliha" tai "Allergia maitotuotteille".
          </p>
        </div>
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Uusi mieltymys"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setAdding(false)}>Peruuta</button>
            <button form="pref-form" type="submit" className="btn-primary">Tallenna</button>
          </>
        }
      >
        <PreferenceForm
          onSubmit={(body) =>
            create.mutate(body, { onSuccess: () => setAdding(false) })
          }
        />
      </Modal>
    </div>
  );
}

function PreferenceForm({
  onSubmit,
}: {
  onSubmit: (body: {
    type: PreferenceType;
    ingredient_id?: string;
    category?: PantryCategory;
    notes?: string;
  }) => void;
}) {
  const [type, setType] = useState<PreferenceType>('avoid');
  const [mode, setMode] = useState<'ingredient' | 'category'>('ingredient');
  const [ingredientId, setIngredientId] = useState('');
  const [category, setCategory] = useState<PantryCategory>('muu');
  const [notes, setNotes] = useState('');

  const { data: ingredients = [] } = useIngredients();

  return (
    <form
      id="pref-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          type,
          ingredient_id: mode === 'ingredient' && ingredientId ? ingredientId : undefined,
          category: mode === 'category' ? category : undefined,
          notes: notes.trim() || undefined,
        });
      }}
      className="space-y-5"
    >
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Tyyppi</span>
        <div className="flex gap-1.5 mt-1.5">
          {PREFERENCE_TYPES.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'chip ring-1 px-3 py-1.5',
                type === t ? 'bg-forest-600 text-cream-50 ring-forest-700' : 'bg-cream-100 ring-cream-200',
              )}
            >
              {PREFERENCE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Kohde</span>
        <div className="flex gap-1.5 mt-1.5">
          <button
            type="button"
            onClick={() => setMode('ingredient')}
            className={cn(
              'chip ring-1 px-3',
              mode === 'ingredient' ? 'bg-forest-600 text-cream-50 ring-forest-700' : 'bg-cream-100 ring-cream-200',
            )}
          >
            Raaka-aine
          </button>
          <button
            type="button"
            onClick={() => setMode('category')}
            className={cn(
              'chip ring-1 px-3',
              mode === 'category' ? 'bg-forest-600 text-cream-50 ring-forest-700' : 'bg-cream-100 ring-cream-200',
            )}
          >
            Kategoria
          </button>
        </div>
      </div>
      {mode === 'ingredient' ? (
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Raaka-aine</span>
          <select
            value={ingredientId}
            onChange={(e) => setIngredientId(e.target.value)}
            className="input mt-1.5"
            required
          >
            <option value="">Valitse…</option>
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Kategoria</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as PantryCategory)}
            className="input mt-1.5"
          >
            {PANTRY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Muistiinpano (valinnainen)</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="esim. ei sopivaa makua"
          className="input mt-1.5"
        />
      </label>
    </form>
  );
}
