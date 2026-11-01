import { motion } from 'framer-motion';
import { Clock, Minus, Pencil, Plus } from 'lucide-react';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type PantryItem,
} from '../types';
import { cn, formatQuantity, itemLevel } from '../lib/cn';
import { FillBar } from './FillBar';
import { ThresholdIndicator } from './ThresholdIndicator';
import { StoreBadge } from './StoreBadge';

interface Props {
  item: PantryItem;
  onAdjust: (delta: number) => void;
  onEdit: () => void;
  onSetStatus?: (status: 'on' | 'vahissa' | 'loppu') => void;
  onToggleRestock?: () => void;
}

export function PantryCard({ item, onAdjust, onEdit, onSetStatus, onToggleRestock }: Props) {
  const cat = item.ingredient?.category ?? 'muu';
  const name = item.ingredient?.name ?? 'Tuote';
  const colors = CATEGORY_COLORS[cat];
  const Icon = CATEGORY_ICONS[cat];
  const level = itemLevel(item);
  const daily = Number(item.daily_consumption);
  const daysLeft = daily > 0 ? Math.floor(Number(item.current_quantity) / daily) : null;
  const borderTint =
    level === 'out'
      ? 'border-terracotta-100 ring-terracotta-100'
      : level === 'low'
      ? 'border-sun-100 ring-sun-100'
      : 'border-cream-200/70 ring-transparent';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      whileHover={{ y: -2 }}
      className={cn(
        'card relative overflow-hidden p-5 flex flex-col gap-4 ring-2',
        borderTint,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-11 h-11 grid place-items-center rounded-xl2 shrink-0', colors.bg)}>
            <Icon className={cn('w-5 h-5', colors.text)} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg leading-tight text-ink-900 truncate">
              {name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <ThresholdIndicator
                qty={Number(item.current_quantity)}
                min={Number(item.min_threshold)}
                level={level}
                withLabel
              />
              {item.preferred_store && <StoreBadge store={item.preferred_store} />}
              {item.ingredient?.tier === 'sailyva' && (
                <button
                  onClick={onToggleRestock}
                  title="Vaihda ydinvaraston ja tarvittaessa ostettavan välillä"
                  className={cn(
                    'chip ring-1',
                    item.restock_mode === 'ydin'
                      ? 'bg-forest-50 text-forest-700 ring-forest-100'
                      : 'bg-cream-100 text-ink-500 ring-cream-200',
                  )}
                >
                  {item.restock_mode === 'ydin' ? 'Ydin' : 'Tarvittaessa'} · {item.recipe_count ?? 0} res.
                </button>
              )}
            </div>
          </div>
        </div>
        <button onClick={onEdit} className="btn-ghost !p-2" aria-label="Muokkaa">
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {item.stock_status ? (
        <>
      <div className="flex gap-1.5 pt-1">
        {(['on', 'vahissa', 'loppu'] as const).map((st) => (
          <button
            key={st}
            onClick={() => onSetStatus?.(st)}
            className={cn(
              'chip flex-1 justify-center ring-1',
              item.stock_status === st
                ? st === 'on'
                  ? 'bg-forest-600 text-white ring-forest-600'
                  : st === 'vahissa'
                  ? 'bg-sun-100 text-yellow-800 ring-yellow-300'
                  : 'bg-terracotta-500 text-white ring-terracotta-500'
                : 'bg-cream-100 text-ink-500 ring-cream-200',
            )}
          >
            {st === 'on' ? 'On' : st === 'vahissa' ? 'Vähissä' : 'Loppu'}
          </button>
        ))}
      </div>
        </>
      ) : (
        <>
      <div className="flex items-end gap-2">
        <div className="font-display text-4xl tracking-tight text-forest-700 leading-none">
          {formatQuantity(Number(item.current_quantity))}
        </div>
        <div className="text-sm text-ink-500 mb-1">{item.unit}</div>
        <div className="ml-auto text-xs text-ink-500 mb-1">
          raja {formatQuantity(Number(item.min_threshold))} {item.unit}
        </div>
      </div>

      {daysLeft != null && (
        <div
          className={cn(
            'chip self-start ring-1',
            daysLeft <= 2
              ? 'bg-terracotta-50 text-terracotta-600 ring-terracotta-100'
              : daysLeft <= 5
              ? 'bg-sun-100 text-yellow-800 ring-yellow-200'
              : 'bg-forest-50 text-forest-600 ring-forest-100',
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          Loppuu n. {daysLeft} pv
        </div>
      )}

      <FillBar
        value={Number(item.current_quantity)}
        threshold={Number(item.min_threshold)}
      />

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onAdjust(-1)}
          className="btn-soft !rounded-full !w-10 !h-10 !p-0"
          aria-label="Vähennä"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => onAdjust(1)}
          className="btn-primary !rounded-full !w-10 !h-10 !p-0"
          aria-label="Lisää"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="ml-auto flex gap-1.5">
          <SmallStep onClick={() => onAdjust(-0.5)} label="−½" />
          <SmallStep onClick={() => onAdjust(0.5)} label="+½" />
        </div>
      </div>
      {item.best_before && (
        <div className="chip self-start bg-terracotta-50 text-terracotta-600 ring-1 ring-terracotta-100">
          <Clock className="w-3.5 h-3.5" />
          Parasta ennen {new Date(item.best_before).toLocaleDateString('fi-FI')}
        </div>
      )}
        </>
      )}
    </motion.article>
  );
}

function SmallStep({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="chip bg-cream-100 hover:bg-cream-200 text-ink-700">
      {label}
    </button>
  );
}
