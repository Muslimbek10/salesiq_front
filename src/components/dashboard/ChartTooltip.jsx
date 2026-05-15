/**
 * Shared custom tooltip used across all Recharts components.
 */
import { formatCurrency, formatNumber } from '@/utils/formatters';

/**
 * Format a period string "2025-04-01" → "Apr '25"
 */
export function fmtPeriod(period) {
  if (!period) return '';
  const str = String(period).slice(0, 7); // "2025-04"
  const [y, m] = str.split('-').map(Number);
  if (!y || !m) return period;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m - 1]} '${String(y).slice(2)}`;
}

/**
 * Currency-formatted Recharts tooltip.
 *
 * Usage:
 *   <Tooltip content={<CurrencyTooltip />} />
 */
export function CurrencyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-xl text-xs min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-500">{entry.name}</span>
          </div>
          <span className="font-semibold text-gray-900">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Number-formatted Recharts tooltip (for counts, units, etc.).
 */
export function NumberTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-xl text-xs min-w-[140px]">
      <p className="font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-500">{entry.name}</span>
          </div>
          <span className="font-semibold text-gray-900">
            {formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Skeleton block for chart loading state */
export function ChartSkeleton({ height = 260 }) {
  return (
    <div
      className="w-full animate-pulse rounded-lg bg-gray-100"
      style={{ height }}
    />
  );
}
