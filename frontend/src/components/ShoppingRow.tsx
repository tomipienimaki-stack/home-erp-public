import { motion } from 'framer-motion';
import { Check, Repeat, Trash2, Wand2 } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_ICONS, type ShoppingListItem } from '../types';
import { cn, formatQuantity } from '../lib/cn';

interface Props {
  item: ShoppingListItem;
  onBought: () => void;
  onDelete: () => void;
  compact?: boolean;
}

export function ShoppingRow({ item, onBought, onDelete, compact = false }: Props) {
  const colors = CATEGORY_COLORS[item.category];
  const Icon = CATEGORY_ICONS[item.category];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className={cn(
        'group card flex items-center gap-3 px-3 sm:px-4',
        compact ? 'py-2.5' : 'py-3.5',
      )}
    >
      <button
        onClick={onBought}
        className={cn(
          'shrink-0 rounded-full border-2 border-forest-400 text-transparent grid place-items-center transition',
          'hover:bg-forest-50 hover:text-forest-500 active:scale-95',
          'w-11 h-11',
        )}
        aria-label="Merkitse ostetuksi"
      >
        <Check className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
      </button>

      <div className={cn('shrink-0 grid place-items-center rounded-xl', colors.bg, compact ? 'w-8 h-8' : 'w-10 h-10')}>
        <Icon className={cn(colors.text, compact ? 'w-4 h-4' : 'w-5 h-5')} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h4 className={cn('font-medium truncate', compact ? 'text-sm' : 'text-base')}>
            {item.name}
          </h4>
          {item.source === 'threshold' && (
            <span
              title="Lisätty automaattisesti rajan alityttyä"
              className="chip bg-terracotta-50 text-terracotta-600 !px-1.5 !py-0.5"
            >
              <Wand2 className="w-3 h-3" />
            </span>
          )}
          {item.source === 'vakio' && (
            <span
              title="Vakiotuote, tulee ostorytmin mukaan"
              className="chip bg-sun-100 text-yellow-800 !px-1.5 !py-0.5"
            >
              <Repeat className="w-3 h-3" />
            </span>
          )}
          {item.source === 'meal_plan' && (
            <span
              title="Lisätty viikon ateriasuunnitelmasta"
              className="chip bg-forest-50 text-forest-600 !px-1.5 !py-0.5"
            >
              <Wand2 className="w-3 h-3" />
            </span>
          )}
        </div>
        <div className="text-xs text-ink-500 truncate">
          {formatQuantity(Number(item.quantity_to_buy))} {item.unit}
          {item.store ? <> · {item.store}</> : null}
          {item.note ? <> · {item.note}</> : null}
        </div>
      </div>

      <button
        onClick={onDelete}
        className="btn-ghost !p-2 opacity-0 group-hover:opacity-100 transition"
        aria-label="Poista"
      >
        <Trash2 className="w-4 h-4 text-terracotta-500" />
      </button>
    </motion.div>
  );
}
