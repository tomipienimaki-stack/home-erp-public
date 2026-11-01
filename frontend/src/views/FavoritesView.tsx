import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ClipboardPaste,
  Loader2,
  Pencil,
  Plus,
  Repeat,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  useAddFavoriteToShopping,
  useBulkInsertFavorites,
  useCreateFavorite,
  useDeleteFavorite,
  useFavorites,
  useImportFavoritesText,
  useUpdateFavorite,
} from '../hooks/useFavorites';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FavoritesAPI } from '../lib/api';
import { Modal } from '../components/Modal';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  PANTRY_CATEGORIES,
  PANTRY_UNITS,
  STORE_LABELS,
  STORES,
  type FavoriteProduct,
  type ImportedFavoriteItem,
  type PantryCategory,
  type PantryUnit,
  type StoreId,
} from '../types';
import { cn, formatQuantity } from '../lib/cn';

type Filter = 'all' | PantryCategory;

export default function FavoritesView() {
  const { data: favs = [], isLoading } = useFavorites();
  const create = useCreateFavorite();
  const update = useUpdateFavorite();
  const del = useDeleteFavorite();
  const addToShopping = useAddFavoriteToShopping();
  const qc = useQueryClient();
  const { data: due = [] } = useQuery({ queryKey: ['favorites', 'due'], queryFn: FavoritesAPI.due });
  const addDue = useMutation({
    mutationFn: FavoritesAPI.addDueToShopping,
    onSuccess: (res) => {
      qc.invalidateQueries();
      flash(`${res.created} vakiotuotetta ostoslistalle`);
    },
  });

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<FavoriteProduct | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const filtered = useMemo(() => {
    return favs
      .filter((f) => filter === 'all' || f.category === filter)
      .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [favs, filter, search]);

  const groupedByCategory = useMemo(() => {
    const m = new Map<PantryCategory, FavoriteProduct[]>();
    for (const f of filtered) {
      const list = m.get(f.category) ?? [];
      list.push(f);
      m.set(f.category, list);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of favs) m[f.category] = (m[f.category] ?? 0) + 1;
    return m;
  }, [favs]);

  return (
    <div className="space-y-6">
      {due.length > 0 && (
        <section className="card p-5 flex flex-wrap items-center gap-3 bg-sun-100/60">
          <Repeat className="w-5 h-5 text-yellow-800 shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg text-ink-700">Vakiotuotteita erääntynyt: {due.length}</h3>
            <p className="text-sm text-ink-500 truncate">{due.map((d) => d.name).join(', ')}</p>
          </div>
          <button className="btn-primary" onClick={() => addDue.mutate()} disabled={addDue.isPending}>
            Lisää ostoslistalle
          </button>
        </section>
      )}

      <Hero
        count={favs.length}
        onImport={() => setImporting(true)}
        onAdd={() => setAdding(true)}
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hae suosikeista…"
            className="input pl-10"
          />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          Kaikki <span className="opacity-60 ml-1">{favs.length}</span>
        </Chip>
        {PANTRY_CATEGORIES.map((c) =>
          categoryCounts[c] ? (
            <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
              {CATEGORY_LABELS[c]} <span className="opacity-60 ml-1">{categoryCounts[c]}</span>
            </Chip>
          ) : null,
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-14 animate-pulse" />
          ))}
        </div>
      ) : favs.length === 0 ? (
        <Empty onImport={() => setImporting(true)} onAdd={() => setAdding(true)} />
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {groupedByCategory.map(([cat, items]) => {
              const colors = CATEGORY_COLORS[cat];
              const Icon = CATEGORY_ICONS[cat];
              return (
                <section key={cat}>
                  <header className="flex items-center gap-2 mb-2 px-1">
                    <div className={cn('w-7 h-7 grid place-items-center rounded-xl', colors.bg)}>
                      <Icon className={cn('w-4 h-4', colors.text)} />
                    </div>
                    <h3 className="font-display text-lg text-forest-700">
                      {CATEGORY_LABELS[cat]}
                    </h3>
                    <span className="chip bg-cream-100 text-ink-500 ring-1 ring-cream-200">
                      {items.length}
                    </span>
                  </header>
                  <div className="space-y-1.5">
                    <AnimatePresence mode="popLayout">
                      {items.map((f) => (
                        <FavoriteRow
                          key={f.id}
                          fav={f}
                          onAddToShopping={() =>
                            addToShopping.mutate(
                              { id: f.id, quantity: 1 },
                              { onSuccess: () => flash(`"${f.name}" lisätty ostoslistalle`) },
                            )
                          }
                          onEdit={() => setEditing(f)}
                          onDelete={() => {
                            if (confirm(`Poistetaanko "${f.name}"?`)) del.mutate(f.id);
                          }}
                          onToggleStock={() =>
                            update.mutate({ id: f.id, body: { in_stock: !f.in_stock } })
                          }
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Modal
        open={importing}
        onClose={() => setImporting(false)}
        title="Tuo suosikit tekstistä"
      >
        <ImportFlow
          onClose={() => setImporting(false)}
          onSuccess={(n) => flash(`Tuotu ${n} tuotetta suosikkeihin.`)}
        />
      </Modal>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Uusi suosikki"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setAdding(false)}>Peruuta</button>
            <button form="fav-form" type="submit" className="btn-primary">Lisää</button>
          </>
        }
      >
        <FavoriteForm
          onSubmit={(body) =>
            create.mutate(body, { onSuccess: () => setAdding(false) })
          }
        />
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.name ?? ''}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditing(null)}>Peruuta</button>
            <button form="fav-form" type="submit" className="btn-primary">Tallenna</button>
          </>
        }
      >
        {editing && (
          <FavoriteForm
            initial={editing}
            onSubmit={(body) =>
              update.mutate({ id: editing.id, body }, { onSuccess: () => setEditing(null) })
            }
          />
        )}
      </Modal>

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
    </div>
  );
}

// ============================================================
// Row
// ============================================================
export function cadenceLabel(f: { cadence?: string | null; cadence_days?: number | null }): string | null {
  if (f.cadence_days != null) return f.cadence_days === 0 ? 'joka reissu' : `${f.cadence_days} pv välein`;
  switch (f.cadence) {
    case 'joka_reissu': return 'joka reissu';
    case 'viikoittain': return 'viikoittain';
    case 'kahden_viikon_valein': return '2 viikon välein';
    case 'kuukausittain': return 'kuukausittain';
    default: return null;
  }
}

function FavoriteRow({
  fav,
  onAddToShopping,
  onEdit,
  onDelete,
  onToggleStock,
}: {
  fav: FavoriteProduct;
  onAddToShopping: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStock: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className={cn(
        'group card flex items-center gap-3 px-3 sm:px-4 py-2.5',
        !fav.in_stock && 'opacity-60',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium truncate">{fav.name}</h4>
          {!fav.in_stock && (
            <span className="chip bg-terracotta-50 text-terracotta-600 ring-1 ring-terracotta-100 !px-1.5 !py-0.5">
              Ei valikoimassa
            </span>
          )}
          {cadenceLabel(fav) && (
            <span
              title={
                fav.last_bought_at
                  ? `Ostettu viimeksi ${new Date(fav.last_bought_at).toLocaleDateString('fi-FI')}`
                  : 'Ei vielä kertaakaan kuitattu ostetuksi'
              }
              className="chip bg-sun-100 text-yellow-800 ring-1 ring-yellow-200 !px-1.5 !py-0.5"
            >
              <Repeat className="w-3 h-3" /> {cadenceLabel(fav)}
            </span>
          )}
        </div>
        <div className="text-xs text-ink-500 truncate">
          {STORE_LABELS[fav.store]}
          {fav.package_size != null && fav.package_unit
            ? ` · ${formatQuantity(Number(fav.package_size))} ${fav.package_unit}`
            : ''}
          {fav.approx_price != null ? ` · ${Number(fav.approx_price).toFixed(2)} €` : ''}
        </div>
      </div>
      <button
        onClick={onAddToShopping}
        title="Lisää ostoslistalle"
        className="chip bg-forest-50 text-forest-600 hover:bg-forest-600 hover:text-cream-50 ring-1 ring-forest-100 transition"
      >
        <ShoppingCart className="w-3.5 h-3.5" />
      </button>
      <button onClick={onToggleStock} title="Vaihda saatavuus" className="btn-ghost !p-1.5">
        <Check className={cn('w-4 h-4', fav.in_stock ? 'text-forest-500' : 'text-ink-500/50')} />
      </button>
      <button onClick={onEdit} title="Muokkaa" className="btn-ghost !p-1.5">
        <Pencil className="w-4 h-4 text-ink-500" />
      </button>
      <button onClick={onDelete} title="Poista" className="btn-ghost !p-1.5 opacity-0 group-hover:opacity-100 transition">
        <Trash2 className="w-4 h-4 text-terracotta-500" />
      </button>
    </motion.div>
  );
}

// ============================================================
// Import flow (paste text → Claude parses → preview → bulk insert)
// ============================================================
function ImportFlow({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (n: number) => void;
}) {
  const importMut = useImportFavoritesText();
  const bulkInsert = useBulkInsertFavorites();

  const [text, setText] = useState('');
  const [store, setStore] = useState<StoreId>('k-market');
  const [parsed, setParsed] = useState<ImportedFavoriteItem[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  if (!parsed) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-500">
          Liitä raaka teksti esim. S-Kaupan, K-Marketin tai Lidlin suosikit-sivulta. Claude poimii tuotteet automaattisesti.
        </p>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Oletuskauppa</span>
          <select
            value={store}
            onChange={(e) => setStore(e.target.value as StoreId)}
            className="input mt-1.5"
          >
            {STORES.map((s) => (
              <option key={s} value={s}>{STORE_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Teksti</span>
          <textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Liitä tähän tuotelistaus…"
            className="input mt-1.5 font-mono text-xs"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Peruuta</button>
          <button
            disabled={text.length < 20 || importMut.isPending}
            onClick={() =>
              importMut.mutate(
                { text, default_store: store },
                {
                  onSuccess: (r) => {
                    setParsed(r.items);
                    setSelected(new Set(r.items.map((_, i) => i)));
                  },
                },
              )
            }
            className="btn-primary"
          >
            {importMut.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Jäsentää…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Jäsennä</>
            )}
          </button>
        </div>
        {importMut.isError && (
          <div className="card p-3 bg-terracotta-50 ring-1 ring-terracotta-100 text-terracotta-600 text-sm">
            {(importMut.error as Error)?.message}
          </div>
        )}
      </div>
    );
  }

  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-500">
        Claude poimi {parsed.length} tuotetta. Valitse mitkä viedään suosikkeihin.
      </p>
      <div className="flex gap-2 text-xs">
        <button onClick={() => setSelected(new Set(parsed.map((_, i) => i)))} className="btn-soft !py-1">
          Valitse kaikki
        </button>
        <button onClick={() => setSelected(new Set())} className="btn-soft !py-1">
          Tyhjennä valinta
        </button>
        <span className="ml-auto self-center text-ink-500">{selected.size} / {parsed.length} valittu</span>
      </div>
      <div className="max-h-[400px] overflow-y-auto -mx-2 space-y-1">
        {parsed.map((item, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition',
              selected.has(i) ? 'bg-forest-50 ring-1 ring-forest-100' : 'hover:bg-cream-100',
            )}
          >
            <div className={cn(
              'shrink-0 w-5 h-5 rounded-md grid place-items-center border-2',
              selected.has(i)
                ? 'bg-forest-600 border-forest-600 text-cream-50'
                : 'border-cream-200',
            )}>
              {selected.has(i) && <Check className="w-3 h-3" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{item.name}</div>
              <div className="text-xs text-ink-500 truncate">
                {STORE_LABELS[item.store as StoreId] ?? item.store}
                {' · '}
                {CATEGORY_LABELS[item.category as PantryCategory] ?? item.category}
                {item.approx_price != null ? ` · ${Number(item.approx_price).toFixed(2)} €` : ''}
                {!item.in_stock ? ' · Ei valikoimassa' : ''}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-cream-200">
        <button className="btn-ghost" onClick={() => setParsed(null)}>Takaisin</button>
        <div className="flex-1" />
        <button className="btn-ghost" onClick={onClose}>Peruuta</button>
        <button
          disabled={selected.size === 0 || bulkInsert.isPending}
          onClick={() => {
            const items = parsed.filter((_, i) => selected.has(i));
            bulkInsert.mutate(items, {
              onSuccess: (r) => {
                onSuccess(r.inserted);
                onClose();
              },
            });
          }}
          className="btn-primary"
        >
          {bulkInsert.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Tallennetaan…</>
          ) : (
            <>Tallenna {selected.size}</>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Edit / Add form
// ============================================================
function FavoriteForm({
  initial,
  onSubmit,
}: {
  initial?: FavoriteProduct;
  onSubmit: (body: Partial<FavoriteProduct> & { name: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [store, setStore] = useState<StoreId>(initial?.store ?? 'k-market');
  const [category, setCategory] = useState<PantryCategory>(initial?.category ?? 'muu');
  const [packageSize, setPackageSize] = useState<number | ''>(initial?.package_size ?? '');
  const [packageUnit, setPackageUnit] = useState<PantryUnit | ''>(initial?.package_unit ?? '');
  const [price, setPrice] = useState<number | ''>(initial?.approx_price ?? '');
  const [inStock, setInStock] = useState(initial?.in_stock ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  return (
    <form
      id="fav-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({
          name: name.trim(),
          store,
          category,
          package_size: packageSize === '' ? null : Number(packageSize),
          package_unit: packageUnit === '' ? null : packageUnit,
          approx_price: price === '' ? null : Number(price),
          in_stock: inStock,
          notes: notes.trim() || null,
        });
      }}
      className="space-y-5"
    >
      <Field label="Nimi">
        <input
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="esim. Maito 1 L"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kauppa">
          <select
            value={store}
            onChange={(e) => setStore(e.target.value as StoreId)}
            className="input"
          >
            {STORES.map((s) => (
              <option key={s} value={s}>{STORE_LABELS[s]}</option>
            ))}
          </select>
        </Field>
        <Field label="Kategoria">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as PantryCategory)}
            className="input"
          >
            {PANTRY_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Koko">
          <input
            type="number"
            step="0.1"
            min={0}
            value={packageSize}
            onChange={(e) => setPackageSize(e.target.value === '' ? '' : Number(e.target.value))}
            className="input"
          />
        </Field>
        <Field label="Yksikkö">
          <select
            value={packageUnit}
            onChange={(e) => setPackageUnit(e.target.value as PantryUnit | '')}
            className="input"
          >
            <option value="">—</option>
            {PANTRY_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label="Hinta €">
          <input
            type="number"
            step="0.01"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
            className="input"
          />
        </Field>
      </div>
      <Field label="Muistiinpano">
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="valinnainen"
          className="input"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => setInStock(e.target.checked)}
          className="w-4 h-4 accent-forest-600"
        />
        Saatavilla kaupassa
      </label>
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

// ============================================================
// Hero + Empty
// ============================================================
function Hero({
  count,
  onImport,
  onAdd,
}: {
  count: number;
  onImport: () => void;
  onAdd: () => void;
}) {
  return (
    <section className="card relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-20 -left-16 w-64 h-64 rounded-full bg-gradient-to-br from-terracotta-400/30 to-sun-400/30 blur-3xl"
      />
      <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:items-end sm:justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-terracotta-600">Suosikit</p>
          <h1 className="font-display text-3xl sm:text-4xl text-forest-700 leading-tight">
            Mitä yleensä ostat
          </h1>
          <p className="text-ink-500 mt-2 max-w-md">
            {count > 0
              ? `${count} suosikkituotetta. Lisää yhdellä klikkauksella ostoslistalle kun tarvitset.`
              : 'Lisää usein ostettavia tuotteita käsin tai tuo kaupan suosikit-sivulta tekstinä.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onImport} className="btn-soft">
            <ClipboardPaste className="w-4 h-4" /> Tuo tekstistä
          </button>
          <button onClick={onAdd} className="btn-accent">
            <Plus className="w-4 h-4" /> Uusi suosikki
          </button>
        </div>
      </div>
    </section>
  );
}

function Empty({ onImport, onAdd }: { onImport: () => void; onAdd: () => void }) {
  return (
    <div className="card p-10 text-center">
      <div className="mx-auto w-12 h-12 grid place-items-center rounded-2xl bg-terracotta-50 text-terracotta-500 mb-3">
        <ShoppingCart className="w-5 h-5" />
      </div>
      <h3 className="font-display text-xl text-forest-700">Ei suosikkeja vielä</h3>
      <p className="text-ink-500 mt-1">Lisää käsin tai liitä kaupan suosikit-sivu.</p>
      <div className="flex justify-center gap-2 mt-5">
        <button onClick={onImport} className="btn-soft">
          <ClipboardPaste className="w-4 h-4" /> Tuo tekstistä
        </button>
        <button onClick={onAdd} className="btn-primary">
          <Plus className="w-4 h-4" /> Lisää käsin
        </button>
      </div>
    </div>
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
