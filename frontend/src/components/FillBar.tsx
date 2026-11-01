import { motion } from 'framer-motion';
import { cn } from '../lib/cn';

interface Props {
  /** Current value */
  value: number;
  /** Min threshold — anything <= this is "low" */
  threshold: number;
  /** Display height */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Visual stock level. Scales 0..2x threshold = 0..100%, so threshold sits at 50%.
 * Color shifts from terracotta (out) → sun (low) → forest (ok).
 */
export function FillBar({ value, threshold, size = 'md' }: Props) {
  const safeMax = threshold > 0 ? threshold * 2 : Math.max(value, 1);
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));

  const level: 'out' | 'low' | 'ok' =
    value <= 0 ? 'out' : value <= threshold ? 'low' : 'ok';

  const barColor =
    level === 'ok'
      ? 'from-forest-400 to-forest-600'
      : level === 'low'
      ? 'from-sun-400 to-sun-500'
      : 'from-terracotta-400 to-terracotta-600';

  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' } as const;

  // threshold marker position
  const markerPct = (threshold / safeMax) * 100;

  return (
    <div className={cn('relative w-full rounded-full bg-cream-200/70 overflow-hidden', heights[size])}>
      <motion.div
        className={cn('h-full bg-gradient-to-r rounded-full', barColor)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 200, damping: 28 }}
      />
      {threshold > 0 && (
        <div
          aria-hidden
          className="absolute top-0 bottom-0 w-px bg-ink-700/30"
          style={{ left: `${markerPct}%` }}
        />
      )}
    </div>
  );
}
