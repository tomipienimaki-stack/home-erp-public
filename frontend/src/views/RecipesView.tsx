import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus, Plus, Search, Utensils } from 'lucide-react';
import {
  useCreateRecipe,
  useRecipe,
  useRecipes,
  useUpdateRecipe,
} from '../hooks/useRecipes';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeDetail } from '../components/RecipeDetail';
import {
  RecipeForm,
  formValuesToApiBody,
  recipeToFormValues,
  type RecipeFormValues,
} from '../components/RecipeForm';
import { RecipeImportFromImage } from '../components/RecipeImportFromImage';
import { Modal } from '../components/Modal';
import { MEAL_TYPE_LABELS, MEAL_TYPES, type MealType } from '../types';
import { cn } from '../lib/cn';

type Filter = 'all' | MealType;
type Mode =
  | { kind: 'create'; initial?: RecipeFormValues }
  | { kind: 'edit'; id: string }
  | { kind: 'import' }
  | null;

export default function RecipesView() {
  const { data: recipes = [], isLoading } = useRecipes();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(null);

  const filtered = useMemo(() => {
    return recipes
      .filter((r) => filter === 'all' || r.meal_type === filter)
      .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [recipes, filter, search]);

  return (
    <div className="space-y-6">
      <Hero
        count={recipes.length}
        onCreate={() => setMode({ kind: 'create' })}
        onImport={() => setMode({ kind: 'import' })}
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hae reseptiä…"
            className="input pl-10"
          />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          Kaikki <span className="opacity-60 ml-1">{recipes.length}</span>
        </Chip>
        {MEAL_TYPES.map((mt) => {
          const n = recipes.filter((r) => r.meal_type === mt).length;
          if (n === 0) return null;
          return (
            <Chip key={mt} active={filter === mt} onClick={() => setFilter(mt)}>
              {MEAL_TYPE_LABELS[mt]} <span className="opacity-60 ml-1">{n}</span>
            </Chip>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-44 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty />
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((r) => (
              <RecipeCard key={r.id} recipe={r} onOpen={() => setDetailId(r.id)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <Modal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        title="Resepti"
        footer={
          detailId ? (
            <>
              <button
                className="btn-ghost"
                onClick={() => {
                  setMode({ kind: 'edit', id: detailId });
                  setDetailId(null);
                }}
              >
                Muokkaa
              </button>
              <div className="flex-1" />
              <button className="btn-primary" onClick={() => setDetailId(null)}>
                Sulje
              </button>
            </>
          ) : null
        }
      >
        {detailId && <RecipeDetail id={detailId} onClose={() => setDetailId(null)} />}
      </Modal>

      {/* Create/Edit/Import flows share one modal */}
      <RecipeFormModal
        mode={mode}
        onClose={() => setMode(null)}
        onCreate={(values) =>
          createRecipe.mutate(formValuesToApiBody(values), {
            onSuccess: () => setMode(null),
          })
        }
        onUpdate={(id, values) =>
          updateRecipe.mutate(
            { id, body: formValuesToApiBody(values) },
            { onSuccess: () => setMode(null) },
          )
        }
      />
    </div>
  );
}

function RecipeFormModal({
  mode,
  onClose,
  onCreate,
  onUpdate,
}: {
  mode: Mode;
  onClose: () => void;
  onCreate: (values: RecipeFormValues) => void;
  onUpdate: (id: string, values: RecipeFormValues) => void;
}) {
  const editingId = mode?.kind === 'edit' ? mode.id : null;
  const { data: editing } = useRecipe(editingId);

  const [importedDraft, setImportedDraft] = useState<RecipeFormValues | null>(null);

  // close → reset import draft
  const handleClose = () => {
    setImportedDraft(null);
    onClose();
  };

  let title = '';
  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (mode?.kind === 'create') {
    title = 'Uusi resepti';
    body = (
      <RecipeForm
        onSubmit={(v) => onCreate(v)}
      />
    );
    footer = (
      <>
        <button className="btn-ghost" onClick={handleClose}>Peruuta</button>
        <button form="recipe-form" type="submit" className="btn-primary">Tallenna</button>
      </>
    );
  } else if (mode?.kind === 'edit') {
    title = 'Muokkaa reseptiä';
    body = editing ? (
      <RecipeForm
        initial={recipeToFormValues(editing)}
        onSubmit={(v) => onUpdate(editing.id, v)}
      />
    ) : (
      <div className="py-12 text-center text-ink-500">Ladataan…</div>
    );
    footer = (
      <>
        <button className="btn-ghost" onClick={handleClose}>Peruuta</button>
        <button form="recipe-form" type="submit" className="btn-primary">Tallenna</button>
      </>
    );
  } else if (mode?.kind === 'import') {
    if (!importedDraft) {
      title = 'Tuo resepti kuvasta';
      body = <RecipeImportFromImage onExtracted={(v) => setImportedDraft(v)} />;
      footer = (
        <>
          <button className="btn-ghost" onClick={handleClose}>Peruuta</button>
        </>
      );
    } else {
      title = 'Tarkista ja tallenna';
      body = (
        <div className="space-y-2">
          <div className="card !shadow-none p-3 text-xs text-ink-500 bg-forest-50/50 ring-1 ring-forest-100">
            Claude poimii tämän kuvasta — tarkista ja korjaa tarvittaessa.
          </div>
          <RecipeForm
            initial={importedDraft}
            onSubmit={(v) => onCreate(v)}
          />
        </div>
      );
      footer = (
        <>
          <button className="btn-ghost" onClick={() => setImportedDraft(null)}>
            Toinen kuva
          </button>
          <div className="flex-1" />
          <button className="btn-ghost" onClick={handleClose}>Peruuta</button>
          <button form="recipe-form" type="submit" className="btn-primary">Tallenna</button>
        </>
      );
    }
  }

  return (
    <Modal open={!!mode} onClose={handleClose} title={title} footer={footer}>
      {body}
    </Modal>
  );
}

function Hero({
  count,
  onCreate,
  onImport,
}: {
  count: number;
  onCreate: () => void;
  onImport: () => void;
}) {
  return (
    <section className="card relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-sun-400/30 to-forest-400/30 blur-3xl"
      />
      <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:items-end sm:justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-forest-600">Reseptit</p>
          <h1 className="font-display text-3xl sm:text-4xl text-forest-700 leading-tight">
            Mitä syömme tänään?
          </h1>
          <p className="text-ink-500 mt-2 max-w-md">
            {count > 0
              ? `${count} reseptiä kirjastossa. Klikkaa avataksesi ohjeen ja näe mitkä ainekset löytyvät jo varastosta.`
              : 'Ei reseptejä vielä. Aja seed tai lisää manuaalisesti.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onImport} className="btn-soft">
            <ImagePlus className="w-4 h-4" /> Tuo kuvasta
          </button>
          <button onClick={onCreate} className="btn-accent">
            <Plus className="w-4 h-4" /> Uusi resepti
          </button>
        </div>
      </div>
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'chip whitespace-nowrap ring-1 px-3 py-1.5',
        active
          ? 'bg-forest-600 text-cream-50 ring-forest-700'
          : 'bg-cream-100 text-ink-700 ring-cream-200',
      )}
    >
      {children}
    </button>
  );
}

function Empty() {
  return (
    <div className="card p-10 text-center">
      <div className="mx-auto w-12 h-12 grid place-items-center rounded-2xl bg-forest-50 text-forest-600 mb-3">
        <Utensils className="w-5 h-5" />
      </div>
      <h3 className="font-display text-xl text-forest-700">Reseptikirjasto on tyhjä</h3>
      <p className="text-ink-500 mt-1">
        Lisää reseptejä manuaalisesti tai aja:
        <code className="block mt-2 text-xs bg-cream-100 px-3 py-2 rounded-lg">
          cd backend && npm run seed:from-excel
        </code>
      </p>
    </div>
  );
}
