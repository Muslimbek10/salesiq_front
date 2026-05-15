import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import { Card }       from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Building2 }  from 'lucide-react';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '@/utils/formatters';
import { ChartSkeleton } from './ChartTooltip';

const BRANCH_COLORS = ['#4F46E5', '#0EA5E9', '#8B5CF6', '#EC4899'];

function BranchTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-xl text-xs min-w-[180px]">
      <p className="font-semibold text-gray-800 mb-2 border-b border-gray-100 pb-1.5">{label}</p>
      <div className="space-y-1">
        <Row label="Revenue"  value={formatCurrency(d?.total_revenue)} />
        <Row label="Profit"   value={formatCurrency(d?.total_profit)} />
        <Row label="Share"    value={formatPercent(d?.revenue_share_pct)} />
        <Row label="Txns"     value={d?.total_transactions} />
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
 * Horizontal bar chart: revenue per branch.
 *
 * @param {object[]} branches
 */
export function BranchChart({ branches = [], loading }) {
  const data = branches.map((b) => ({
    ...b,
    name: b.branch_name?.replace(' Branch', '') ?? b.branch_name,
  }));

  return (
    <Card className="flex flex-col">
      <Card.Header
        title="Branch Performance"
        subtitle="Revenue share by location"
      />
      <Card.Body className="pt-2">
        {loading ? (
          <ChartSkeleton height={272} />
        ) : data.length === 0 ? (
          <EmptyState icon={Building2} title="No branch data" />
        ) : (
          <ResponsiveContainer width="100%" height={272}>
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
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                width={68}
              />
              <Tooltip content={<BranchTooltip />} cursor={{ fill: '#F8FAFC' }} />
              <Bar dataKey="total_revenue" name="Revenue" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {data.map((_, i) => (
                  <Cell key={i} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card.Body>

      {/* Revenue share legend */}
      {!loading && data.length > 0 && (
        <Card.Footer>
          <div className="flex flex-wrap gap-3">
            {data.map((b, i) => (
              <div key={b.branch_id} className="flex items-center gap-1.5 text-xs">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: BRANCH_COLORS[i % BRANCH_COLORS.length] }}
                />
                <span className="text-gray-500">{b.name}</span>
                <span className="font-semibold text-gray-700">
                  {formatPercent(b.revenue_share_pct, 1)}
                </span>
              </div>
            ))}
          </div>
        </Card.Footer>
      )}
    </Card>
  );
}
