import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Inline growth badge — used in tables and cards.
 *
 * <StatBadge value={12.3} />   →  green  +12.30%  ↑
 * <StatBadge value={-5.1} />   →  red    -5.10%   ↓
 * <StatBadge value={0} />      →  gray   0.00%    →
 * <StatBadge value={null} />   →  "—"
 */
export function StatBadge({ value }) {
  if (value == null || Number.isNaN(Number(value))) {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  const n     = Number(value);
  const sign  = n > 0 ? '+' : '';
  const label = `${sign}${n.toFixed(2)}%`;

  const Icon    = n > 0 ? TrendingUp : n < 0 ? TrendingDown : Minus;
  const classes = n > 0
    ? 'bg-emerald-50 text-emerald-700'
    : n < 0
    ? 'bg-red-50 text-red-600'
    : 'bg-gray-100 text-gray-500';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        classes,
      )}
    >
      <Icon size={11} className="shrink-0" />
      {label}
    </span>
  );
}
