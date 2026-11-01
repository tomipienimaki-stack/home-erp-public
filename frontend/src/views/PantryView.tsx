import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { IngredientsAPI } from '../lib/api';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import {
  CATEGORY_LABELS,
  PANTRY_CATEGORIES,
  type PantryCategory,
  type PantryItem,
} from '../types';
import { PantryCard } from '../components/PantryCard';
import { Modal } from '../components/Modal';
import { PantryForm, type PantryFormValues } from '../components/PantryForm';
import {
  useConsumePantryItem,
  useCreatePantryItem,
  useDeletePantryItem,
  usePantry,
  useUpdatePantryItem,
} from '../hooks/usePantry';
import { cn, itemLevel } from '../lib/cn';

type Filter = 'all' | PantryCategory;

export default function PantryView() {
  const { data: items = [], isLoading } = usePantry();
  const create = useCreatePantryItem();
  const update = useUpdatePantryItem();
  const qc = useQueryClient();
  const consume = useConsumePantryItem();
  const del = useDeletePantryItem();

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PantryItem | null>(null);

  const filtered = useMemo(() => {
    return items
      .filter((i) => filter === 'all' || i.ingredient?.category === filter)
      .filter((i) =>
        (i.ingredient?.name ?? '').toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => {
        const aLow = itemLevel(a) !== 'ok';
        const bLow = itemLevel(b) !== 'ok';
        if (aLow !== bLow) return aLow ? -1 : 1;
        const byUse = (b.recipe_count ?? 0) - (a.recipe_count ?? 0);
        if (byUse !== 0) return byUse;
        return (a.ingredient?.name ?? '').localeCompare(b.ingredient?.name ?? '');
      });
  }, [items, filter, search]);

  const stats = useMemo(() => {
    const total = items.length;
    const low = items.filter((i) => {
      const l = itemLevel(i);
      return l === 'low';
    }).length;
    const out = items.filter((i) => itemLevel(i) === 'out').length;
    return { total, low, out };
  }, [items]);

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of items) {
      const c = i.ingredient?.category ?? 'muu';
      m[c] = (m[c] ?? 0) + 1;
    }
    return m;
  }, [items]);

  return (
    <div className="space-y-6">
      <Hero stats={stats} onAdd={() => setCreating(true)} />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hae varastosta…"
            className="input pl-10"
          />
        </div>
      </div>

      <CategoryFilters
        value={filter}
        onChange={setFilter}
        totals={categoryCounts}
        totalAll={items.length}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-52 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty onAdd={() => setCreating(true)} />
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => (
              <PantryCard
                key={item.id}
                item={item}
                onAdjust={(delta) => {
                  if (delta < 0) {
                    consume.mutate({ id: item.id, amount: Math.abs(delta) });
                  } else {
                    update.mutate({
                      id: item.id,
                      body: { current_quantity: Number(item.current_quantity) + delta },
                    });
                  }
                }}
                onEdit={() => setEditing(item)}
                onToggleRestock={() =>
                  IngredientsAPI.update(item.ingredient_id, {
                    restock_override: item.restock_mode === 'ydin' ? 'tarvittaessa' : 'ydin',
                  }).then(() => qc.invalidateQueries())
                }
                onSetStatus={(stock_status) =>
                  update.mutate({ id: item.id, body: { stock_status } })
                }
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Uusi varastotuote"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setCreating(false)}>
              Peruuta
            </button>
            <button form="pantry-form" type="submit" className="btn-primary">
              Lisää
            </button>
          </>
        }
      >
        <PantryForm
          onSubmit={(v) => {
            create.mutate(toCreateBody(v), { onSuccess: () => setCreating(false) });
          }}
        />
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.ingredient?.name ?? ''}
        footer={
          <>
            <button
              className="btn-ghost text-terracotta-500 hover:bg-terracotta-50"
              onClick={() => {
                if (editing && confirm(`Poistetaanko "${editing.ingredient?.name ?? 'tuote'}"?`)) {
                  del.mutate(editing.id);
                  setEditing(null);
                }
              }}
            >
              <Trash2 className="w-4 h-4" /> Poista
            </button>
            <div className="flex-1" />
            <button className="btn-ghost" onClick={() => setEditing(null)}>Peruuta</button>
            <button form="pantry-form" type="submit" className="btn-primary">Tallenna</button>
          </>
        }
      >
        {editing && (
          <PantryForm
            initial={editing}
            onSubmit={(v) => {
              update.mutate(
                { id: editing.id, body: toUpdateBody(v) },
                { onSuccess: () => setEditing(null) },
              );
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function toCreateBody(v: PantryFormValues) {
  return {
    name: v.name.trim(),
    category: v.category,
    current_quantity: v.current_quantity,
    unit: v.unit,
    min_threshold: v.min_threshold,
    preferred_store: v.preferred_store || null,
    notes: v.notes.trim() || null,
    daily_consumption: v.daily_consumption,
  };
}
function toUpdateBody(v: PantryFormValues): Partial<PantryItem> {
  return {
    current_quantity: v.current_quantity,
    unit: v.unit,
    min_threshold: v.min_threshold,
    preferred_store: v.preferred_store || null,
    notes: v.notes.trim() || null,
    daily_consumption: v.daily_consumption,
  };
}

function Hero({
  stats,
  onAdd,
}: {
  stats: { total: number; low: number; out: number };
  onAdd: () => void;
}) {
  return (
    <section className="card relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-forest-400/30 to-terracotta-400/30 blur-3xl"
      />
      <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-forest-600">Varasto</p>
          <h1 className="font-display text-3xl sm:text-4xl text-forest-700 leading-tight">
            Mitä kotoa löytyy juuri nyt
          </h1>
          <p className="text-ink-500 mt-2 max-w-md">
            Pidä silmällä mikä on vähissä — alle rajan menneet hyppäävät automaattisesti ostoslistalle.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:max-w-sm">
          <Stat n={stats.total} label="Tuotetta" tint="forest" />
          <Stat n={stats.low}   label="Vähissä"  tint="sun" />
          <Stat n={stats.out}   label="Loppu"    tint="terracotta" />
        </div>
        <button onClick={onAdd} className="btn-accent self-start sm:self-center">
          <Plus className="w-4 h-4" />
          Lisää tuote
        </button>
      </div>
    </section>
  );
}

function Stat({
  n,
  label,
  tint,
}: {
  n: number;
  label: string;
  tint: 'forest' | 'sun' | 'terracotta';
}) {
  const colors =
    tint === 'forest'
      ? 'bg-forest-50 text-forest-700'
      : tint === 'sun'
      ? 'bg-sun-100 text-yellow-800'
      : 'bg-terracotta-50 text-terracotta-600';
  return (
    <div className={cn('rounded-xl2 px-3 py-2 text-center', colors)}>
      <div className="font-display text-2xl leading-none">{n}</div>
      <div className="text-[10px] uppercase tracking-wider mt-1 opacity-70">{label}</div>
    </div>
  );
}

function CategoryFilters({
  value,
  onChange,
  totals,
  totalAll,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
  totals: Record<string, number>;
  totalAll: number;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      <FilterChip active={value === 'all'} onClick={() => onChange('all')}>
        Kaikki <span className="opacity-60 ml-1">{totalAll}</span>
      </FilterChip>
      {PANTRY_CATEGORIES.map((c) =>
        totals[c] ? (
          <FilterChip key={c} active={value === c} onClick={() => onChange(c)}>
            {CATEGORY_LABELS[c]} <span className="opacity-60 ml-1">{totals[c]}</span>
          </FilterChip>
        ) : null,
      )}
    </div>
  );
}

function FilterChip({
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
        'chip whitespace-nowrap ring-1 px-3 py-1.5 transition',
        active
          ? 'bg-forest-600 text-cream-50 ring-forest-700'
          : 'bg-cream-100 text-ink-700 ring-cream-200 hover:bg-cream-200',
      )}
    >
      {children}
    </button>
  );
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="card p-10 text-center">
      <div className="mx-auto w-12 h-12 grid place-items-center rounded-2xl bg-forest-50 text-forest-600 mb-3">
        <Sparkles className="w-5 h-5" />
      </div>
      <h3 className="font-display text-xl text-forest-700">Varasto on tyhjä</h3>
      <p className="text-ink-500 mt-1">Lisää ensimmäinen tuote aloittaaksesi.</p>
      <button onClick={onAdd} className="btn-primary mt-5">
        <Plus className="w-4 h-4" /> Lisää tuote
      </button>
    </div>
  );
}
