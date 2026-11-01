import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/cn';
import { thresholdLevel } from '../lib/cn';

export function ThresholdIndicator({
  qty,
  min,
  withLabel = false,
  level: forced,
}: {
  qty: number;
  min: number;
  withLabel?: boolean;
  level?: 'ok' | 'low' | 'out';
}) {
  const level = forced ?? thresholdLevel(qty, min);
  if (level === 'ok') {
    return (
      <span className={cn('chip bg-forest-50 text-forest-600 ring-1 ring-forest-100')}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        {withLabel ? 'Riittävä' : ''}
      </span>
    );
  }
  if (level === 'low') {
    return (
      <span className="chip bg-sun-100 text-yellow-800 ring-1 ring-yellow-200">
        <AlertTriangle className="w-3.5 h-3.5" />
        {withLabel ? 'Vähissä' : ''}
      </span>
    );
  }
  return (
    <span className="chip bg-terracotta-50 text-terracotta-600 ring-1 ring-terracotta-100">
      <AlertCircle className="w-3.5 h-3.5" />
      {withLabel ? 'Loppu' : ''}
    </span>
  );
}
