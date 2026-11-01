import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, Snowflake, Trash2 } from 'lucide-react';
import { FreezerAPI } from '../lib/api';
import { Modal } from '../components/Modal';
import type { FreezerItem } from '../types';

const KEY = ['freezer'];

export default function FreezerView() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: KEY, queryFn: FreezerAPI.list });
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });
  const adjust = useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) => FreezerAPI.adjust(id, delta),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: FreezerAPI.delete, onSuccess: invalidate });
  const create = useMutation({ mutationFn: FreezerAPI.create, onSuccess: invalidate });
  const [adding, setAdding] = useState(false);

  const portions = items.reduce((s, i) => s + Number(i.portions), 0);

  return (
    <div className="space-y-6">
      <section className="card p-6 sm:p-7 flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold tracking-widest text-ink-500 uppercase">Pakastin</div>
          <h2 className="font-display text-3xl text-forest-700 leading-tight">Valmiit annokset</h2>
          <p className="text-ink-500 mt-1">
            Vanhin erä ylimpänä. Ota annos pakkasesta miinuspainikkeella.
          </p>
        </div>
        <div className="chip bg-forest-50 text-forest-700 ring-1 ring-forest-100 text-base">
          {portions} annosta
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4" /> Lisää erä
        </button>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-16 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">
          <Snowflake className="w-8 h-8 mx-auto mb-2 text-forest-600" />
          Pakastimessa ei ole kirjattuja annoksia.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {items.map((i: FreezerItem) => (
              <motion.article
                key={i.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="card p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-forest-50 grid place-items-center shrink-0">
                  <Snowflake className="w-5 h-5 text-forest-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate">{i.name}</h3>
                  <div className="text-xs text-ink-500">
                    {i.portion_size ? `${i.portion_size} · ` : ''}
                    pakastettu {new Date(i.frozen_at).toLocaleDateString('fi-FI')}
                  </div>
                </div>
                <div className="font-display text-2xl text-forest-700 tabular-nums">{i.portions}</div>
                <div className="flex gap-1.5">
                  <button
                    className="btn-soft !rounded-full !w-9 !h-9 !p-0"
                    aria-label="Ota annos"
                    onClick={() => adjust.mutate({ id: i.id, delta: -1 })}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-soft !rounded-full !w-9 !h-9 !p-0"
                    aria-label="Lisää annos"
                    onClick={() => adjust.mutate({ id: i.id, delta: 1 })}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-ghost !p-2 text-ink-500"
                    aria-label="Poista erä"
                    onClick={() => remove.mutate(i.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Lisää pakastimeen"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setAdding(false)}>Peruuta</button>
            <button form="freezer-form" type="submit" className="btn-primary">Lisää</button>
          </>
        }
      >
        <form
          id="freezer-form"
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget as HTMLFormElement);
            create.mutate(
              {
                name: String(f.get('name') ?? '').trim(),
                portions: Number(f.get('portions') ?? 1),
                portion_size: String(f.get('portion_size') ?? '').trim() || undefined,
              },
              { onSuccess: () => setAdding(false) },
            );
          }}
        >
          <label className="block">
            <span className="text-sm text-ink-500">Mitä</span>
            <input name="name" required className="input w-full" placeholder="Ragù alla bolognese" />
          </label>
          <div className="flex gap-3">
            <label className="block flex-1">
              <span className="text-sm text-ink-500">Annoksia</span>
              <input name="portions" type="number" min={0} defaultValue={1} className="input w-full" />
            </label>
            <label className="block flex-1">
              <span className="text-sm text-ink-500">Annoskoko</span>
              <input name="portion_size" className="input w-full" placeholder="300 g" />
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
