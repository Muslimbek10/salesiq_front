import { useState } from 'react';
import { RefreshCw, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { todayISO, daysAgoISO } from '@/utils/formatters';

const PRESETS = [
  { label: '30 days',  days: 30  },
  { label: '90 days',  days: 90  },
  { label: '6 months', days: 182 },
  { label: '1 year',   days: 365 },
];

/**
 * Date range filter bar with quick presets.
 *
 * @param {string}   dateFrom
 * @param {string}   dateTo
 * @param {function} onChange({ dateFrom, dateTo })
 * @param {boolean}  loading
 */
export function FilterBar({ dateFrom, dateTo, onChange, loading }) {
  const [from, setFrom] = useState(dateFrom);
  const [to,   setTo]   = useState(dateTo);

  // Which preset is currently active (if any)
  const activePreset = PRESETS.find((p) => {
    const expected = daysAgoISO(p.days);
    return from === expected && to === todayISO();
  });

  const applyPreset = (days) => {
    const f = daysAgoISO(days);
    const t = todayISO();
    setFrom(f);
    setTo(t);
    onChange({ dateFrom: f, dateTo: t });
  };

  const applyCustom = () => {
    if (from && to && from <= to) {
      onChange({ dateFrom: from, dateTo: to });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      {/* Quick presets */}
      <div className="flex items-center gap-1.5">
        <Calendar size={15} className="text-gray-400 shrink-0" />
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => applyPreset(p.days)}
            className={clsx(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activePreset?.days === p.days
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <span className="hidden h-4 w-px bg-gray-200 sm:block" />

      {/* Custom range */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date"
          value={to}
          min={from}
          max={todayISO()}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <Button
          variant="secondary"
          size="xs"
          onClick={applyCustom}
          disabled={!from || !to || from > to}
        >
          Apply
        </Button>
      </div>

      {/* Refresh indicator */}
      {loading && (
        <RefreshCw
          size={14}
          className="ml-auto animate-spin text-indigo-500 shrink-0"
        />
      )}
    </div>
  );
}
