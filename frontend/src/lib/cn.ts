import clsx, { type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatQuantity(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
}

export function thresholdLevel(qty: number, min: number): 'ok' | 'low' | 'out' {
  if (qty <= 0) return 'out';
  if (qty <= min) return 'low';
  if (qty <= min * 1.3) return 'low';
  return 'ok';
}

/** Tason mukainen tila: säilyvillä stock_status, muilla määrä vs. minimiraja. */
export function itemLevel(item: {
  current_quantity: number;
  min_threshold: number;
  stock_status?: 'on' | 'vahissa' | 'loppu' | null;
}): 'ok' | 'low' | 'out' {
  if (item.stock_status) {
    return item.stock_status === 'on' ? 'ok' : item.stock_status === 'vahissa' ? 'low' : 'out';
  }
  return thresholdLevel(Number(item.current_quantity), Number(item.min_threshold));
}
