import { Store } from 'lucide-react';
import { STORE_LABELS, type StoreId } from '../types';

export function StoreBadge({ store }: { store: StoreId | string | null | undefined }) {
  if (!store) {
    return (
      <span className="chip bg-cream-100 text-ink-500 ring-1 ring-cream-200">
        <Store className="w-3.5 h-3.5" /> Ei kauppaa
      </span>
    );
  }
  const label = STORE_LABELS[store as StoreId] ?? store;
  return (
    <span className="chip bg-forest-50 text-forest-600 ring-1 ring-forest-100">
      <Store className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
