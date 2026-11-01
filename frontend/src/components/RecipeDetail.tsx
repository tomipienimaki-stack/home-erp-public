import { useState } from 'react';
import { AlertCircle, CheckCircle2, Minus, Plus, Trash2 } from 'lucide-react';
import { useRecipeAvailability } from '../hooks/useRecipes';
import { useDeleteRecipe } from '../hooks/useRecipes';
import { MEAL_TYPE_LABELS } from '../types';
import { cn, formatQuantity } from '../lib/cn';

interface Props {
  id: string;
  onClose: () => void;
}

/** Vain säilyvillä on oikeaa saldoa; muilla "varastossa 0" olisi harhaanjohtava. */
function tracksStock(tier?: string): boolean {
  return tier === 'sailyva';
}

export function RecipeDetail({ id, onClose }: Props) {
  const { data, isLoading } = useRecipeAvailability(id);
  const del = useDeleteRecipe();
  const [servings, setServings] = useState<number | null>(null);

  if (isLoading || !data) {
    return <div className="py-12 text-center text-ink-500">Ladataan…</div>;
  }

  const { recipe, ingredients } = data;
  const base = recipe.servings || 1;
  const target = servings ?? base;
  const factor = target / base;

  const tracked = ingredients.filter((i) => tracksStock(i.ingredient?.tier));
  const missing = tracked.filter((i) => !i.sufficient);

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-widest text-forest-600">
            {MEAL_TYPE_LABELS[recipe.meal_type]}
          </div>
          <h1 className="font-display text-2xl text-forest-700">{recipe.name}</h1>
          {recipe.description && (
            <p className="text-ink-500 mt-1 text-sm">{recipe.description}</p>
          )}
        </div>
      </header>

      <div className="flex gap-3 text-sm items-stretch">
        <div className="card !shadow-none px-3 py-2 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-ink-500">Annokset</div>
          <div className="flex items-center gap-2 mt-0.5">
            <button
              onClick={() => setServings(Math.max(1, target - 1))}
              aria-label="Vähennä annoksia"
              className="w-7 h-7 rounded-full grid place-items-center bg-cream-100 text-ink-700 hover:bg-cream-200 transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-display text-lg text-forest-700 w-6 text-center">{target}</span>
            <button
              onClick={() => setServings(target + 1)}
              aria-label="Lisää annoksia"
              className="w-7 h-7 rounded-full grid place-items-center bg-cream-100 text-ink-700 hover:bg-cream-200 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {recipe.prep_time_min ? <Stat label="Esivalmistelu" value={`${recipe.prep_time_min} min`} /> : null}
        {recipe.cook_time_min ? <Stat label="Kypsennys" value={`${recipe.cook_time_min} min`} /> : null}
      </div>

      {factor !== 1 && (
        <p className="text-xs text-terracotta-600">
          Määrät on skaalattu {formatQuantity(factor)}-kertaisiksi. Ohjeen tekstissä lukevat määrät
          ovat alkuperäisen {base} annoksen mukaan.
        </p>
      )}

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Ainekset
          </h3>
          {tracked.length > 0 && (
            <span
              className={cn(
                'chip ring-1',
                missing.length === 0
                  ? 'bg-forest-50 text-forest-600 ring-forest-100'
                  : 'bg-sun-100 text-yellow-800 ring-yellow-200',
              )}
            >
              {missing.length === 0 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Säilyvät kunnossa
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  {missing.length} säilyvää puuttuu
                </>
              )}
            </span>
          )}
        </div>
        <ul className="divide-y divide-cream-200 rounded-2xl ring-1 ring-cream-200 overflow-hidden">
          {ingredients.map((ri) => {
            const short = tracksStock(ri.ingredient?.tier) && !ri.sufficient;
            return (
              <li key={ri.id} className="flex items-baseline gap-3 px-3 py-2.5 bg-white">
                <span className="font-display text-base text-forest-700 tabular-nums min-w-[5.5rem] shrink-0">
                  {formatQuantity(Number(ri.quantity) * factor)} {ri.unit}
                </span>
                <span className="flex-1 min-w-0 text-sm text-ink-700">
                  {ri.ingredient?.name}
                  {ri.notes && <span className="text-ink-500"> ({ri.notes})</span>}
                </span>
                {short && (
                  <span className="chip bg-sun-100 text-yellow-800 ring-1 ring-yellow-200 shrink-0">
                    vähissä
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {recipe.instructions && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">
            Ohje
          </h3>
          <div className="prose prose-sm text-ink-700 whitespace-pre-wrap leading-relaxed">
            {recipe.instructions}
          </div>
        </section>
      )}

      <div className="pt-2 border-t border-cream-200 flex">
        <button
          onClick={() => {
            if (confirm(`Poistetaanko "${recipe.name}"?`)) {
              del.mutate(recipe.id, { onSuccess: onClose });
            }
          }}
          className="btn-ghost text-terracotta-500 hover:bg-terracotta-50"
        >
          <Trash2 className="w-4 h-4" /> Poista resepti
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card !shadow-none px-3 py-2 flex-1">
      <div className="text-[10px] uppercase tracking-widest text-ink-500">{label}</div>
      <div className="font-display text-lg text-forest-700">{value}</div>
    </div>
  );
}
