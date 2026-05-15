import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card }            from '@/components/ui/Card';
import { EmptyState }      from '@/components/ui/EmptyState';
import { BarChart2 }       from 'lucide-react';
import { formatCurrencyCompact } from '@/utils/formatters';
import { CurrencyTooltip, ChartSkeleton, fmtPeriod } from './ChartTooltip';

const COLORS = {
  revenue: '#4F46E5',
  profit:  '#10B981',
  cost:    '#94A3B8',
};

/**
 * Monthly revenue / profit / cost area chart.
 *
 * @param {{ period, revenue, cost, profit }[]} series
 */
export function RevenueChart({ series = [], loading }) {
  const chartData = series.map((r) => ({
    ...r,
    label: fmtPeriod(r.period),
  }));

  return (
    <Card className="flex flex-col">
      <Card.Header
        title="Revenue & Profit Trend"
        subtitle="Monthly breakdown"
      />
      <Card.Body className="pt-2">
        {loading ? (
          <ChartSkeleton height={272} />
        ) : chartData.length === 0 ? (
          <EmptyState icon={BarChart2} title="No trend data" message="Adjust the date range to see data." />
        ) : (
          <ResponsiveContainer width="100%" height={272}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS.revenue} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={COLORS.revenue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS.profit} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={COLORS.profit} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS.cost} stopOpacity={0.14} />
                  <stop offset="95%" stopColor={COLORS.cost} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCurrencyCompact(v)}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                width={56}
              />

              <Tooltip content={<CurrencyTooltip />} />

              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={COLORS.revenue}
                strokeWidth={2}
                fill="url(#gradRevenue)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke={COLORS.profit}
                strokeWidth={2}
                fill="url(#gradProfit)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="cost"
                name="Cost"
                stroke={COLORS.cost}
                strokeWidth={1.5}
                fill="url(#gradCost)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                strokeDasharray="4 3"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card.Body>
    </Card>
  );
}
