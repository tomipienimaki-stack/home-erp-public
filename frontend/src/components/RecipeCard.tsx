import { motion } from 'framer-motion';
import { Clock, Flame, Users, Utensils } from 'lucide-react';
import { type Recipe } from '../types';
import { cn } from '../lib/cn';

interface Props {
  recipe: Recipe;
  onOpen: () => void;
}

export function RecipeCard({ recipe, onOpen }: Props) {
  const time = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0);
  return (
    <motion.button
      layout
      onClick={onOpen}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className={cn(
        'card text-left p-5 flex flex-col gap-3 hover:ring-2 hover:ring-forest-100 transition',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 grid place-items-center rounded-xl2 bg-forest-50 text-forest-600 shrink-0">
          <Utensils className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg leading-tight text-ink-900 truncate">
            {recipe.name}
          </h3>
          <p className="text-xs text-ink-500 line-clamp-1 mt-0.5">
            {recipe.description ?? '—'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {recipe.tags.slice(0, 4).map((t) => (
          <span key={t} className="chip bg-cream-100 text-ink-700 ring-1 ring-cream-200">
            {t}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-ink-500 mt-auto">
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> {recipe.servings}
        </span>
        {time > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {time} min
          </span>
        )}
        {recipe.last_cooked_at && (
          <span className="inline-flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" />
            {new Date(recipe.last_cooked_at).toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
    </motion.button>
  );
}
