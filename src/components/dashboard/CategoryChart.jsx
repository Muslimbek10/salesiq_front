import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card }       from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tag }        from 'lucide-react';
import { formatCurrencyCompact, formatPercent } from '@/utils/formatters';
import { ChartSkeleton } from './ChartTooltip';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

function CategoryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-xl text-xs min-w-[160px]">
      <p className="font-semibold text-gray-800 mb-2">{d.category_name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Revenue</span>
          <span className="font-semibold">{formatCurrencyCompact(d.total_revenue)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Share</span>
          <span className="font-semibold">{formatPercent(d.revenue_share_pct, 1)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Margin</span>
          <span className="font-semibold">{formatPercent(d.gross_margin_pct, 1)}</span>
        </div>
      </div>
    </div>
  );
}

/** Custom legend rendered below the chart */
function CategoryLegend({ categories }) {
  return (
    <div className="flex flex-col gap-1.5 mt-3">
      {categories.map((cat, i) => (
        <div key={cat.category_id} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-gray-600 truncate max-w-[110px]">{cat.category_name}</span>
          </div>
          <div className="flex items-center gap-3 text-right">
            <span className="text-gray-400">{formatPercent(cat.revenue_share_pct, 1)}</span>
            <span className="font-semibold text-gray-800 w-16 text-right">
              {formatCurrencyCompact(cat.total_revenue)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Donut chart showing revenue share by category.
 *
 * @param {object[]} categories — from getCategoryAnalytics().categories
 */
export function CategoryChart({ categories = [], loading }) {
  return (
    <Card className="flex flex-col">
      <Card.Header
        title="Revenue by Category"
        subtitle="Share of total revenue"
      />
      <Card.Body className="pt-2">
        {loading ? (
          <ChartSkeleton height={260} />
        ) : categories.length === 0 ? (
          <EmptyState icon={Tag} title="No category data" />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="total_revenue"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {categories.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CategoryTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <CategoryLegend categories={categories} />
          </>
        )}
      </Card.Body>
    </Card>
  );
}
