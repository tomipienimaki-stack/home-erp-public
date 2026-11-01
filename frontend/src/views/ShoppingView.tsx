import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ListChecks,
  Plus,
  ShoppingBasket,
  Store,
  Trash2,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  STORE_LABELS,
  type ShoppingListItem,
  type StoreId,
} from '../types';
import { ShoppingRow } from '../components/ShoppingRow';
import { Modal } from '../components/Modal';
import { NextShoppingBanner } from '../components/NextShoppingBanner';
import { QuickAddShoppingForm } from '../components/QuickAddShoppingForm';
import {
  useClearBought,
  useCreateShoppingItem,
  useDeleteShoppingItem,
  useMarkBought,
  useUpdateShoppingItem,
  useShoppingList,
} from '../hooks/useShopping';
import { cn } from '../lib/cn';
import { groupByStoreOrder } from '../lib/shopping-order';

type Tab = 'list' | 'shop';

export default function ShoppingView() {
  const { data: items = [], isLoading } = useShoppingList();
  const create = useCreateShoppingItem();
  const markBought = useMarkBought();
  const del = useDeleteShoppingItem();
  const clearBought = useClearBought();
  const updateItem = useUpdateShoppingItem();
  const checkItems = items.filter((i) => i.check_first);
  const buyItems = items.filter((i) => !i.check_first);

  const [tab, setTab] = useState<Tab>('list');
  const [adding, setAdding] = useState(false);
  const [progress, setProgress] = useState({ bought: 0, total: 0 });

  // Reset session progress when full list size changes meaningfully
  const sessionTotal = useMemo(() => items.length + progress.bought, [items.length, progress.bought]);
  const sessionPct = sessionTotal > 0 ? Math.round((progress.bought / sessionTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <Hero
        pending={items.length}
        autoCount={items.filter((i) => i.source !== 'manual').length}
        onAdd={() => setAdding(true)}
        progressPct={sessionPct}
        progressBought={progress.bought}
        progressTotal={sessionTotal}
      />

      <NextShoppingBanner />

      <Tabs value={tab} onChange={setTab} />

      {checkItems.length > 0 && (
        <CheckFirst
          items={checkItems}
          onHave={(id) => del.mutate(id)}
          onBuy={(id) => updateItem.mutate({ id, body: { check_first: false } })}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card h-14 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty onAdd={() => setAdding(true)} />
      ) : tab === 'list' ? (
        <ListView
          items={buyItems}
          onBought={(id) => {
            markBought.mutate({ id });
            setProgress((p) => ({ ...p, bought: p.bought + 1 }));
          }}
          onDelete={(id) => del.mutate(id)}
          onClearBought={() => clearBought.mutate()}
        />
      ) : (
        <ShopView
          items={buyItems}
          onBought={(id) => {
            markBought.mutate({ id });
            setProgress((p) => ({ ...p, bought: p.bought + 1 }));
          }}
          onDelete={(id) => del.mutate(id)}
        />
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Lisää ostoslistalle"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setAdding(false)}>Peruuta</button>
            <button form="shopping-form" type="submit" className="btn-primary">Lisää</button>
          </>
        }
      >
        <QuickAddShoppingForm
          onSubmit={(v) =>
            create.mutate(v, { onSuccess: () => setAdding(false) })
          }
        />
      </Modal>
    </div>
  );
}

function Hero({
  pending,
  autoCount,
  onAdd,
  progressPct,
  progressBought,
  progressTotal,
}: {
  pending: number;
  autoCount: number;
  onAdd: () => void;
  progressPct: number;
  progressBought: number;
  progressTotal: number;
}) {
  return (
    <section className="card relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-gradient-to-br from-terracotta-400/30 to-sun-400/30 blur-3xl"
      />
      <div className="relative p-6 sm:p-8 grid sm:grid-cols-[1fr_auto] gap-6 items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-terracotta-600">Ostokset</p>
          <h1 className="font-display text-3xl sm:text-4xl text-forest-700 leading-tight">
            {pending > 0 ? `${pending} tuotetta odottaa` : 'Lista on tyhjä'}
          </h1>
          <p className="text-ink-500 mt-2">
            {autoCount > 0
              ? `${autoCount} näistä lisätty automaattisesti varaston rajojen alittuessa.`
              : 'Lisää itse mitä tarvitset — tai anna varaston täydentää listaa puolestasi.'}
          </p>

          {progressTotal > 0 && (
            <div className="mt-5 max-w-md">
              <div className="flex items-center justify-between text-xs text-ink-500 mb-1.5">
                <span>Edistyminen</span>
                <span className="font-semibold text-forest-700">
                  {progressBought}/{progressTotal}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-cream-200/70 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-forest-400 to-forest-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                />
              </div>
            </div>
          )}
        </div>
        <button onClick={onAdd} className="btn-accent self-start sm:self-center">
          <Plus className="w-4 h-4" />
          Lisää
        </button>
      </div>
    </section>
  );
}

function Tabs({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="inline-flex card p-1 gap-1 shadow-soft">
      <TabButton active={value === 'list'} onClick={() => onChange('list')}>
        <ListChecks className="w-4 h-4" /> Lista
      </TabButton>
      <TabButton active={value === 'shop'} onClick={() => onChange('shop')}>
        <ShoppingBasket className="w-4 h-4" /> Kauppa-näkymä
      </TabButton>
    </div>
  );
}

function TabButton({
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
        'px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition',
        active ? 'bg-forest-600 text-cream-50' : 'text-ink-700 hover:bg-cream-100',
      )}
    >
      {children}
    </button>
  );
}

// ============================================================
// List View — flat list
// ============================================================
function ListView({
  items,
  onBought,
  onDelete,
  onClearBought,
}: {
  items: ShoppingListItem[];
  onBought: (id: string) => void;
  onDelete: (id: string) => void;
  onClearBought: () => void;
}) {
  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <ShoppingRow
            key={item.id}
            item={item}
            onBought={() => onBought(item.id)}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </AnimatePresence>
      <div className="pt-3">
        <button onClick={onClearBought} className="btn-ghost text-ink-500 text-sm">
          <Trash2 className="w-4 h-4" /> Tyhjennä ostetut
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Shop View — grouped by store, then category
// ============================================================
function ShopView({
  items,
  onBought,
  onDelete,
}: {
  items: ShoppingListItem[];
  onBought: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const byStore = new Map<string, ShoppingListItem[]>();
    for (const i of items) {
      const k = i.store ?? '__nostore__';
      if (!byStore.has(k)) byStore.set(k, []);
      byStore.get(k)!.push(i);
    }
    return Array.from(byStore.entries()).map(([store, list]) => {
      return { store, groups: groupByStoreOrder(list) };
    });
  }, [items]);

  return (
    <div className="space-y-5">
      {grouped.map(({ store, groups }) => (
        <section key={store} className="card overflow-hidden">
          <header className="px-5 py-3 flex items-center gap-2 bg-forest-50/80 border-b border-cream-200">
            <Store className="w-4 h-4 text-forest-600" />
            <h3 className="font-display text-lg text-forest-700">
              {store === '__nostore__'
                ? 'Ei kauppaa'
                : STORE_LABELS[store as StoreId] ?? store}
            </h3>
            <span className="ml-auto chip bg-white text-ink-500 ring-1 ring-cream-200">
              {groups.reduce((s, g) => s + g.items.length, 0)} tuotetta
            </span>
          </header>
          <div className="p-3 space-y-4">
            {groups.map(({ category: cat, items: list }) => (
              <div key={cat}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500 px-2 mb-1.5">
                  {CATEGORY_LABELS[cat]}
                </h4>
                <div className="space-y-1.5">
                  <AnimatePresence mode="popLayout">
                    {list.map((item) => (
                      <ShoppingRow
                        key={item.id}
                        item={item}
                        onBought={() => onBought(item.id)}
                        onDelete={() => onDelete(item.id)}
                        compact
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ============================================================
// Tarkista ennen kauppaa — tarkistettavat raaka-aineet
// ============================================================
function CheckFirst({
  items,
  onHave,
  onBuy,
}: {
  items: ShoppingListItem[];
  onHave: (id: string) => void;
  onBuy: (id: string) => void;
}) {
  return (
    <section className="card overflow-hidden">
      <header className="px-5 py-3 flex items-center gap-2 bg-sun-100/70 border-b border-cream-200">
        <ListChecks className="w-4 h-4 text-ink-700" />
        <h3 className="font-display text-lg text-ink-700">Tarkista ennen kauppaa</h3>
        <span className="ml-auto chip bg-white text-ink-500 ring-1 ring-cream-200">
          {items.length} tuotetta
        </span>
      </header>
      <ul className="divide-y divide-cream-200">
        {items.map((i) => (
          <li key={i.id} className="px-5 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">
                {i.name} <span className="text-ink-500 font-normal">{Number(i.quantity_to_buy)} {i.unit}</span>
              </div>
              {i.note && <div className="text-xs text-ink-500 truncate">{i.note}</div>}
            </div>
            <button className="btn-ghost text-sm" onClick={() => onHave(i.id)}>Kotona</button>
            <button className="btn-soft text-sm" onClick={() => onBuy(i.id)}>Osta</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="card p-10 text-center">
      <div className="mx-auto w-12 h-12 grid place-items-center rounded-2xl bg-terracotta-50 text-terracotta-500 mb-3">
        <ShoppingBasket className="w-5 h-5" />
      </div>
      <h3 className="font-display text-xl text-forest-700">Lista on tyhjä</h3>
      <p className="text-ink-500 mt-1">
        Hyvää työtä — kaikki on kotona. Lisää tarvittaessa uutta.
      </p>
      <button onClick={onAdd} className="btn-primary mt-5">
        <Plus className="w-4 h-4" /> Lisää ostoslistalle
      </button>
    </div>
  );
}
