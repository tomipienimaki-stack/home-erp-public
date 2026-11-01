import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS, type PantryCategory } from '../types';
import { cn } from '../lib/cn';

interface Props {
  category: PantryCategory;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export function CategoryBadge({ category, size = 'sm', showIcon = true }: Props) {
  const c = CATEGORY_COLORS[category];
  const Icon = CATEGORY_ICONS[category];
  return (
    <span
      className={cn(
        'chip ring-1',
        c.bg,
        c.text,
        c.ring,
        size === 'md' && 'text-sm px-3 py-1.5',
      )}
    >
      {showIcon && <Icon className={cn('w-3.5 h-3.5', size === 'md' && 'w-4 h-4')} />}
      {CATEGORY_LABELS[category]}
    </span>
  );
}
