import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card }       from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Package }    from 'lucide-react';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '@/utils/formatters';
import { ChartSkeleton } from './ChartTooltip';

function ProductTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-xl text-xs min-w-[200px]">
      <p className="font-semibold text-gray-800 mb-2 border-b border-gray-100 pb-1.5 max-w-[180px] truncate">
        {label}
      </p>
      <div className="space-y-1">
        <Row label="Revenue"  value={formatCurrency(d?.total_revenue)} />
        <Row label="Profit"   value={formatCurrency(d?.total_profit)} />
        <Row label="Category" value={d?.category_name} />
        <Row label="Units"    value={d?.total_units} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-gray-900">{value ?? '—'}</span>
    </div>
  );
}

/**
 * Horizontal bar chart: top products by revenue + profit.
 *
 * @param {object[]} products — from getProductAnalytics().top_products
 */
export function TopProductsChart({ products = [], loading }) {
  const data = products.slice(0, 8).map((p) => ({
    ...p,
    // Truncate long names for Y-axis readability
    name: p.product_name?.length > 22
      ? p.product_name.slice(0, 20) + '…'
      : p.product_name,
  }));

  return (
    <Card className="flex flex-col">
      <Card.Header
        title="Top Products"
        subtitle="By revenue this period"
      />
      <Card.Body className="pt-2">
        {loading ? (
          <ChartSkeleton height={260} />
        ) : data.length === 0 ? (
          <EmptyState icon={Package} title="No product data" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => formatCurrencyCompact(v)}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip content={<ProductTooltip />} cursor={{ fill: '#F8FAFC' }} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Bar
                dataKey="total_revenue"
                name="Revenue"
                fill="#4F46E5"
                radius={[0, 3, 3, 0]}
                maxBarSize={12}
              />
              <Bar
                dataKey="total_profit"
                name="Profit"
                fill="#10B981"
                radius={[0, 3, 3, 0]}
                maxBarSize={12}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card.Body>
    </Card>
  );
}
