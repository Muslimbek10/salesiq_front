import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const colorMap = {
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  iconBg: 'bg-indigo-100' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   iconBg: 'bg-amber-100' },
  rose:    { bg: 'bg-rose-50',    icon: 'text-rose-600',    iconBg: 'bg-rose-100' },
  sky:     { bg: 'bg-sky-50',     icon: 'text-sky-600',     iconBg: 'bg-sky-100' },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  iconBg: 'bg-violet-100' },
};

/**
 * Dashboard KPI card.
 *
 * @param {string}  title
 * @param {string}  value       — formatted string e.g. "$1,234.56"
 * @param {number}  [change]    — percentage change vs previous period
 * @param {string}  [period]    — label e.g. "vs last month"
 * @param {React.ComponentType} icon   — lucide icon component
 * @param {'indigo'|'emerald'|'amber'|'rose'|'sky'|'violet'} [color='indigo']
 * @param {boolean} [loading]
 */
export function KPICard({
  title,
  value,
  change,
  period = 'vs previous period',
  icon: Icon,
  color  = 'indigo',
  loading = false,
}) {
  const palette = colorMap[color] ?? colorMap.indigo;

  const TrendIcon =
    change == null  ? null     :
    change  > 0     ? TrendingUp   :
    change  < 0     ? TrendingDown :
                      Minus;

  const trendColor =
    change == null  ? 'text-gray-400' :
    change  > 0     ? 'text-emerald-600' :
    change  < 0     ? 'text-red-500'  :
                      'text-gray-400';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Top row: icon + title */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {Icon && (
          <span
            className={clsx(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              palette.iconBg,
            )}
          >
            <Icon size={18} className={palette.icon} />
          </span>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <div className="h-8 w-32 animate-pulse rounded-md bg-gray-100" />
      ) : (
        <p className="text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      )}

      {/* Change badge */}
      {change != null && !loading && (
        <div className="flex items-center gap-1.5">
          {TrendIcon && (
            <TrendIcon size={14} className={clsx('shrink-0', trendColor)} />
          )}
          <span className={clsx('text-xs font-semibold', trendColor)}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">{period}</span>
        </div>
      )}
      {change == null && !loading && period && (
        <p className="text-xs text-gray-400">{period}</p>
      )}
    </div>
  );
}
