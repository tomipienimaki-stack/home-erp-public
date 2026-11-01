import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChefHat,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sandwich,
  Search,
  ShoppingCart,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  useAddEntry,
  useBatchSuggestions,
  useMealPlanWeek,
  useDeleteEntry,
  useGenerateMealPlan,
  useGenerateShoppingList,
  useMarkCooked,
} from '../hooks/useMealPlan';
import { useRecipes } from '../hooks/useRecipes';
import { Modal } from '../components/Modal';
import {
  DAY_LABELS_LONG,
  PLAN_MEAL_TYPES,
  type MealPlanEntry,
  type PlanMealType,
  type Recipe,
} from '../types';
import { cn } from '../lib/cn';

export default function MealPlanView() {
  const [week, setWeek] = useState<string | null>(null);
  const { data: plan, isLoading } = useMealPlanWeek(week);
  const generate = useGenerateMealPlan();
  const generateShoppingList = useGenerateShoppingList();
  const addEntry = useAddEntry();
  const deleteEntry = useDeleteEntry();
  const markCooked = useMarkCooked();

  const [picker, setPicker] = useState<{ day: number; meal: PlanMealType } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data: batchData } = useBatchSuggestions(plan?.id ?? null);

  const entryGrid = useMemo(() => {
    const grid: Record<string, MealPlanEntry | undefined> = {};
    for (const e of plan?.entries ?? []) {
      grid[`${e.day_of_week}:${e.meal_type}`] = e;
    }
    return grid;
  }, [plan]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      <Hero
        weekStart={plan?.week_start}
        onPrevWeek={() => plan && setWeek(addDays(plan.week_start, -7))}
        onNextWeek={() => plan && setWeek(addDays(plan.week_start, 7))}
        onThisWeek={() => setWeek(null)}
        aiGenerated={!!plan?.ai_generated}
        isGenerating={generate.isPending}
        isMakingList={generateShoppingList.isPending}
        onGenerate={() =>
          generate.mutate(
            { meal_types: ['paivallinen'] },
            {
              onSuccess: (res) =>
                flash(`Suunnitelma valmis — ${res.inserted} ateriaa lisätty.`),
              onError: (e) => flash(`Virhe: ${(e as Error).message}`),
            },
          )
        }
        onGenerateShoppingList={() => {
          if (!plan?.id) return;
          generateShoppingList.mutate(plan.id, {
            onSuccess: (r) => flash(`Ostoslistalle lisätty ${r.created} tuotetta.`),
          });
        }}
      />

      {isLoading ? (
        <div className="card h-72 animate-pulse" />
      ) : (
        <section className="card overflow-x-auto p-3 sm:p-5">
          <div className="grid grid-cols-[80px_repeat(7,minmax(140px,1fr))] gap-2 min-w-[920px]">
            <div />
            {Array.from({ length: 7 }).map((_, i) => {
              const d = plan ? new Date(`${plan.week_start}T00:00:00`) : null;
              if (d) d.setDate(d.getDate() + i);
              const iso = d ? ((d.getDay() + 6) % 7) : i;
              return (
                <div key={i} className="text-center py-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                    {DAY_LABELS_LONG[iso]}
                  </div>
                  {d && (
                    <div className="text-[11px] text-ink-400">
                      {d.getDate()}.{d.getMonth() + 1}.
                    </div>
                  )}
                </div>
              );
            })}

            {PLAN_MEAL_TYPES.map((mt) => (
              <RowFragment key={mt}>
                <div className="text-xs font-semibold uppercase tracking-wider text-forest-600 py-3 self-center">
                  {mt === 'lounas' ? 'Lounas' : 'Päivällinen'}
                </div>
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const day = dayIdx + 1;
                  const entry = entryGrid[`${day}:${mt}`];
                  return (
                    <Cell
                      key={`${day}:${mt}`}
                      entry={entry}
                      mealType={mt}
                      onPick={() => setPicker({ day, meal: mt })}
                      onCook={() => {
                        if (!plan?.id || !entry) return;
                        markCooked.mutate(
                          { id: plan.id, entryId: entry.id },
                          { onSuccess: () => flash('Merkitty valmistetuksi — varasto päivitetty.') },
                        );
                      }}
                      onDelete={() => {
                        if (!plan?.id || !entry) return;
                        deleteEntry.mutate({ id: plan.id, entryId: entry.id });
                      }}
                    />
                  );
                })}
              </RowFragment>
            ))}
          </div>
        </section>
      )}

      {batchData?.suggestions && batchData.suggestions.length > 0 && (
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-terracotta-500" />
            <h3 className="font-display text-lg text-forest-700">Batch-vihjeet</h3>
          </div>
          <ul className="space-y-2 text-sm">
            {batchData.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="chip bg-terracotta-50 text-terracotta-600 ring-1 ring-terracotta-100 mt-0.5">
                  {s.kind === 'shared_ingredient' ? 'Yhteinen' : s.kind}
                </span>
                <span className="text-ink-700">{s.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 card px-4 py-2.5 text-sm shadow-soft"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <RecipePicker
        open={!!picker}
        onClose={() => setPicker(null)}
        onPick={(recipe) => {
          if (!plan?.id || !picker) return;
          addEntry.mutate({
            id: plan.id,
            body: {
              day_of_week: picker.day,
              meal_type: picker.meal,
              recipe_id: recipe.id,
              servings: recipe.servings,
            },
          });
          setPicker(null);
        }}
      />
    </div>
  );
}

function RowFragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Cell({
  entry,
  mealType,
  onPick,
  onCook,
  onDelete,
}: {
  entry: MealPlanEntry | undefined;
  mealType: PlanMealType;
  onPick: () => void;
  onCook: () => void;
  onDelete: () => void;
}) {
  if (!entry || !entry.recipe) {
    // Tyhjä ruutu ei ole puuttuva suunnitelma vaan leipäilta.
    return (
      <button
        onClick={onPick}
        className="group rounded-2xl border-2 border-dashed border-cream-200 hover:border-forest-400 hover:bg-cream-100/50 transition py-4 text-ink-400 text-sm flex items-center justify-center gap-1"
      >
        {mealType === 'paivallinen' ? (
          <>
            <span className="flex group-hover:hidden items-center gap-1.5">
              <Sandwich className="w-4 h-4" /> Leipäilta
            </span>
            <span className="hidden group-hover:flex items-center gap-1">
              <Plus className="w-4 h-4" /> Lisää
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1">
            <Plus className="w-4 h-4" /> Lisää
          </span>
        )}
      </button>
    );
  }
  return (
    <motion.div
      layout
      className={cn(
        'rounded-2xl p-3 flex flex-col gap-1.5 group relative',
        entry.cooked
          ? 'bg-forest-50/80 ring-1 ring-forest-100'
          : 'bg-white ring-1 ring-cream-200 shadow-sm',
      )}
    >
      <div className="text-sm font-medium leading-snug line-clamp-2 text-ink-900">
        {entry.recipe.name}
      </div>
      <div className="text-[10px] text-ink-500 uppercase tracking-widest">
        {entry.servings} ann.
      </div>
      <div className="mt-auto flex items-center gap-1 pt-1">
        {entry.cooked ? (
          <span className="chip bg-forest-600 text-cream-50 !px-1.5 !py-0.5">
            <Check className="w-3 h-3" /> Valmis
          </span>
        ) : (
          <button
            onClick={onCook}
            className="chip bg-cream-100 hover:bg-forest-50 hover:text-forest-600 ring-1 ring-cream-200"
          >
            <ChefHat className="w-3 h-3" /> Tein
          </button>
        )}
        <button
          onClick={onDelete}
          className="ml-auto opacity-0 group-hover:opacity-100 text-xs text-terracotta-500 hover:underline transition"
        >
          Poista
        </button>
      </div>
    </motion.div>
  );
}

function RecipePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (recipe: Recipe) => void;
}) {
  const { data: recipes = [] } = useRecipes();
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      recipes
        .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 50),
    [recipes, search],
  );

  return (
    <Modal open={open} onClose={onClose} title="Valitse resepti">
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hae reseptiä…"
            className="input pl-10"
            autoFocus
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto -mx-2 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="text-ink-500 text-sm py-6 text-center">
              Ei tuloksia.
            </div>
          ) : (
            filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => onPick(r)}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-cream-100 flex items-center gap-3"
              >
                <ChefHat className="w-4 h-4 text-forest-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-xs text-ink-500 truncate">
                    {r.tags.join(' · ')}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

function Hero({
  weekStart,
  onPrevWeek,
  onNextWeek,
  onThisWeek,
  aiGenerated,
  isGenerating,
  isMakingList,
  onGenerate,
  onGenerateShoppingList,
}: {
  weekStart: string | undefined;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
  aiGenerated: boolean;
  isGenerating: boolean;
  isMakingList: boolean;
  onGenerate: () => void;
  onGenerateShoppingList: () => void;
}) {
  const label = weekStart
    ? `${new Date(`${weekStart}T00:00:00`).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })}–${new Date(
        `${addDays(weekStart, 6)}T00:00:00`,
      ).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })}`
    : '—';

  return (
    <section className="card relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-br from-forest-400/30 to-terracotta-400/30 blur-3xl"
      />
      <div className="relative p-6 sm:p-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrevWeek}
              aria-label="Edellinen viikko"
              className="w-7 h-7 rounded-full grid place-items-center text-forest-600 hover:bg-cream-100 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onThisWeek}
              className="text-xs font-semibold uppercase tracking-widest text-forest-600 hover:underline"
            >
              Viikko {label}
            </button>
            <button
              onClick={onNextWeek}
              aria-label="Seuraava viikko"
              className="w-7 h-7 rounded-full grid place-items-center text-forest-600 hover:bg-cream-100 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-forest-700 leading-tight">
            Aterisuunnitelma {aiGenerated && <span className="text-terracotta-500">·</span>}
            {aiGenerated && <span className="text-base text-terracotta-500 ml-1">AI</span>}
          </h1>
          <p className="text-ink-500 mt-2 max-w-md">
            Anna AI:n koota viikko valmiiksi reseptikirjastosi pohjalta, tai täytä ruudukko itse.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="btn-accent"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Luodaan…
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" /> Generoi AI:lla
              </>
            )}
          </button>
          <button
            onClick={onGenerateShoppingList}
            disabled={isMakingList}
            className="btn-primary"
          >
            {isMakingList ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Lasketaan…
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" /> Luo ostoslista
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
