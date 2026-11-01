import { CalendarCheck } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { formatDate } from './ShoppingDaySettings';

/** Muistuttaa milloin on seuraava kauppareissu, jotta listaa täydennetään ajoissa. */
export function NextShoppingBanner() {
  const { data } = useSettings();
  if (!data) return null;

  const days = data.days_until_next_shopping;
  const today = days === 0;
  const label = today
    ? 'Kauppapäivä on tänään'
    : days === 1
      ? 'Kauppapäivä on huomenna'
      : `Seuraava kauppapäivä ${formatDate(data.next_shopping_date)}, ${days} päivän päästä`;

  return (
    <div
      className={
        today
          ? 'rounded-2xl px-4 py-3 flex items-center gap-2.5 text-sm bg-forest-600 text-cream-50'
          : 'rounded-2xl px-4 py-3 flex items-center gap-2.5 text-sm bg-cream-100 text-ink-700'
      }
    >
      <CalendarCheck className="w-4 h-4 shrink-0" />
      <span>{label}.</span>
      {!today && (
        <span className="text-ink-500 hidden sm:inline">
          Täydennä lista siihen mennessä, niin yksi reissu riittää.
        </span>
      )}
    </div>
  );
}
