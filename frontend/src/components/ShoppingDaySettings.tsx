import { CalendarCheck } from 'lucide-react';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { cn } from '../lib/cn';

const DAYS = [
  { iso: 1, short: 'ma', long: 'maanantai' },
  { iso: 2, short: 'ti', long: 'tiistai' },
  { iso: 3, short: 'ke', long: 'keskiviikko' },
  { iso: 4, short: 'to', long: 'torstai' },
  { iso: 5, short: 'pe', long: 'perjantai' },
  { iso: 6, short: 'la', long: 'lauantai' },
  { iso: 7, short: 'su', long: 'sunnuntai' },
];

export function ShoppingDaySettings() {
  const { data, isLoading } = useSettings();
  const update = useUpdateSettings();
  const selected = data?.shopping_weekdays ?? [];

  function toggle(iso: number) {
    let next: number[];
    if (selected.includes(iso)) {
      if (selected.length === 1) return; // vähintään yksi kauppapäivä
      next = selected.filter((d) => d !== iso);
    } else if (selected.length >= 2) {
      // Kolmatta ei oteta: korvataan vanhin valinta.
      next = [selected[1], iso];
    } else {
      next = [...selected, iso];
    }
    update.mutate(next.sort((a, b) => a - b));
  }

  return (
    <section className="card p-6 sm:p-8 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-forest-50 text-forest-600 grid place-items-center shrink-0">
          <CalendarCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display text-xl text-forest-700 leading-tight">Kauppapäivä</h2>
          <p className="text-ink-500 text-sm mt-1 max-w-lg">
            Valitse yksi tai kaksi päivää. Vakiotuotteet erääntyvät aina valitulle päivälle,
            ja ateriaviikko alkaa ensimmäistä kauppapäivää seuraavasta päivästä.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {DAYS.map((d) => {
          const on = selected.includes(d.iso);
          const primary = selected[0] === d.iso && selected.length > 1;
          return (
            <button
              key={d.iso}
              onClick={() => toggle(d.iso)}
              disabled={isLoading || update.isPending}
              title={primary ? `${d.long} (pääkauppapäivä)` : d.long}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition capitalize',
                on
                  ? 'bg-forest-600 text-cream-50 shadow-soft'
                  : 'bg-cream-100 text-ink-700 hover:bg-cream-200',
              )}
            >
              {d.short}
              {primary && <span className="ml-1 text-cream-200 text-xs">1.</span>}
            </button>
          );
        })}
      </div>

      {data && (
        <p className="text-sm text-ink-500">
          Seuraava kauppapäivä{' '}
          <strong className="text-forest-700">
            {data.days_until_next_shopping === 0
              ? 'tänään'
              : data.days_until_next_shopping === 1
                ? 'huomenna'
                : `${data.shopping_weekday_names[0]} ${formatDate(data.next_shopping_date)}`}
          </strong>
          . Reissujen väli enintään {data.shopping_interval_days} vrk.
        </p>
      )}
    </section>
  );
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}.${m}.${y}`;
}
