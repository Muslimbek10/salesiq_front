/**
 * Analytics page
 * ===============
 * Top-level KPI summary + 6-tab deep-dive:
 *   Sales Trend | Products | Branches | Categories | Customers | Financial
 *
 * All data scoped to the user-selected date range via FilterBar.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, BarChart2, GitBranch, Tag,
  Users, DollarSign, ShoppingCart, Package,
  Percent, ArrowUp, ArrowDown,
} from 'lucide-react';
import clsx from 'clsx';

import {
  getDashboardKPIs,
  getSalesTrend,
  getProductAnalytics,
  getBranchAnalytics,
  getCategoryAnalytics,
  getCustomerAnalytics,
  getFinancialAnalytics,
} from '@/api/analytics';

import { PageHeader }  from '@/components/layout/PageHeader';
import { Card }        from '@/components/ui/Card';
import { Badge }       from '@/components/ui/Badge';
import { Alert }       from '@/components/ui/Alert';
import { Select }      from '@/components/ui/Select';
import { Spinner }     from '@/components/ui/Spinner';
import { FilterBar }   from '@/components/dashboard/FilterBar';
import {
  CurrencyTooltip, NumberTooltip, ChartSkeleton, fmtPeriod,
} from '@/components/dashboard/ChartTooltip';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  formatCurrency, formatCurrencyCompact,
  formatNumber, formatPercent,
  daysAgoISO, todayISO,
} from '@/utils/formatters';

// ── Constants ─────────────────────────────────────────────────────────────────

const PALETTE = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16',
];

const TABS = [
  { id: 'trend',      label: 'Sales Trend',  icon: TrendingUp },
  { id: 'products',   label: 'Products',     icon: BarChart2  },
  { id: 'branches',   label: 'Branches',     icon: GitBranch  },
  { id: 'categories', label: 'Categories',   icon: Tag        },
  { id: 'customers',  label: 'Customers',    icon: Users      },
  { id: 'financial',  label: 'Financial',    icon: DollarSign },
];

// ── Shared sub-components ─────────────────────────────────────────────────────

/** Small metric card used inside tabs */
function MetricCard({ label, value, sub, growth, loading }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      {loading ? (
        <div className="h-7 w-24 animate-pulse rounded-md bg-gray-100" />
      ) : (
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      )}
      {sub && !loading && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {growth != null && !loading && (
        <div className={clsx(
          'flex items-center gap-1 mt-1.5 text-xs font-semibold',
          growth >= 0 ? 'text-emerald-600' : 'text-red-500',
        )}>
          {growth >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
          {Math.abs(growth).toFixed(1)}% vs prior period
        </div>
      )}
    </div>
  );
}

/** Shared data table used across all tabs */
function DataTable({ headers, children }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {children}
        </tbody>
      </table>
    </div>
  );
}

// ── Top KPI strip (from dashboard endpoint, scoped to date range) ─────────────

function KPIStrip({ params }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-kpis', params],
    queryFn:  () => getDashboardKPIs(params),
    staleTime: 2 * 60_000,
  });

  const kpis = data?.kpis ?? {};

  const cards = [
    {
      label: 'Total Revenue',
      value: formatCurrencyCompact(kpis.total_revenue?.value),
      growth: kpis.total_revenue?.growth,
      icon: DollarSign,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
    {
      label: 'Total Profit',
      value: formatCurrencyCompact(kpis.total_profit?.value),
      growth: kpis.total_profit?.growth,
      icon: TrendingUp,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Gross Margin',
      value: formatPercent(kpis.gross_margin_pct?.value),
      growth: kpis.gross_margin_pct?.growth,
      icon: Percent,
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
    },
    {
      label: 'Transactions',
      value: formatNumber(kpis.total_transactions?.value),
      growth: kpis.total_transactions?.growth,
      icon: ShoppingCart,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
    },
    {
      label: 'Units Sold',
      value: formatNumber(kpis.total_units_sold?.value),
      growth: kpis.total_units_sold?.growth,
      icon: Package,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map(({ label, value, growth, icon: Icon, iconBg, iconColor }) => (
        <div
          key={label}
          className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <span className={clsx('flex h-9 w-9 items-center justify-center rounded-lg', iconBg)}>
              <Icon size={18} className={iconColor} />
            </span>
          </div>

          {isLoading ? (
            <div className="h-8 w-28 animate-pulse rounded-md bg-gray-100" />
          ) : (
            <p className="text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          )}

          {growth != null && !isLoading && (
            <div className={clsx(
              'flex items-center gap-1.5 text-xs font-semibold',
              growth >= 0 ? 'text-emerald-600' : 'text-red-500',
            )}>
              {growth >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
              <span className="font-normal text-gray-400">vs prev period</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Tab: Sales Trend ──────────────────────────────────────────────────────────

function TrendTab({ params }) {
  const [granularity, setGranularity] = useState('monthly');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-trend', params, granularity],
    queryFn:  () => getSalesTrend({ ...params, granularity }),
    staleTime: 2 * 60_000,
  });

  const series = (data?.series ?? []).map((r) => ({ ...r, label: fmtPeriod(r.period) }));

  return (
    <div className="space-y-8">
      {isError && <Alert type="error" title="Failed to load trend data" />}

      {/* Revenue / Profit / Cost */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Revenue, Profit & Cost</h3>
          <Select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            className="w-32"
            options={[
              { value: 'daily',   label: 'Daily'   },
              { value: 'weekly',  label: 'Weekly'  },
              { value: 'monthly', label: 'Monthly' },
            ]}
          />
        </div>
        {isLoading ? <ChartSkeleton height={300} /> : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tGradRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="tGradPro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => formatCurrencyCompact(v)}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false} tickLine={false} width={56}
              />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#4F46E5" strokeWidth={2}
                fill="url(#tGradRev)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="profit"  name="Profit"  stroke="#10B981" strokeWidth={2}
                fill="url(#tGradPro)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="cost"    name="Cost"    stroke="#94A3B8" strokeWidth={1.5}
                fill="none" strokeDasharray="4 3" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Transactions & Units */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Transactions & Units Sold</h3>
        {isLoading ? <ChartSkeleton height={220} /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<NumberTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="transactions" name="Transactions" fill="#4F46E5" radius={[3, 3, 0, 0]} />
              <Bar dataKey="units"        name="Units Sold"   fill="#10B981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ── Tab: Products ─────────────────────────────────────────────────────────────

function ProductsTab({ params }) {
  const [metric, setMetric] = useState('revenue');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-products', params, metric],
    queryFn:  () => getProductAnalytics({ ...params, metric, limit: 15 }),
    staleTime: 2 * 60_000,
  });

  const products = (data?.top_products ?? [])
    .map((p) => ({
      ...p,
      value: metric === 'units'
        ? (p.total_units ?? 0)
        : metric === 'profit'
          ? (p.total_profit ?? 0)
          : (p.total_revenue ?? 0),
    }))
    .sort((a, b) => b.value - a.value);

  const metricLabel = { revenue: 'Revenue', profit: 'Profit', units: 'Units Sold' }[metric];

  return (
    <div className="space-y-6">
      {isError && <Alert type="error" title="Failed to load product analytics" />}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Top Products by {metricLabel}</h3>
        <Select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          className="w-36"
          options={[
            { value: 'revenue', label: 'Revenue'    },
            { value: 'profit',  label: 'Profit'     },
            { value: 'units',   label: 'Units Sold' },
          ]}
        />
      </div>

      {isLoading ? <ChartSkeleton height={380} /> : (
        <ResponsiveContainer
          width="100%"
          height={Math.max(280, products.length * 34 + 40)}
        >
          <BarChart
            layout="vertical"
            data={products}
            margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
            barSize={14}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={metric === 'units' ? formatNumber : formatCurrencyCompact}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="product_name"
              tick={{ fontSize: 11, fill: '#374151' }}
              axisLine={false} tickLine={false}
              width={150}
            />
            <Tooltip
              formatter={(v) => metric === 'units' ? formatNumber(v) : formatCurrency(v)}
            />
            <Bar dataKey="value" name={metricLabel} radius={[0, 3, 3, 0]}>
              {products.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {!isLoading && products.length > 0 && (
        <DataTable headers={['Product', 'Category', 'Revenue', 'Profit', 'Units', 'Margin']}>
          {products.map((p) => (
            <tr key={p.product_name} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2.5 font-medium text-gray-900">{p.product_name}</td>
              <td className="px-4 py-2.5 text-gray-500">{p.category_name ?? '—'}</td>
              <td className="px-4 py-2.5 font-medium">{formatCurrencyCompact(p.total_revenue)}</td>
              <td className="px-4 py-2.5 text-emerald-600 font-medium">{formatCurrencyCompact(p.total_profit)}</td>
              <td className="px-4 py-2.5">{formatNumber(p.total_units)}</td>
              <td className="px-4 py-2.5">
                {p.margin_pct != null
                  ? <span className="text-emerald-600 font-medium">{(+p.margin_pct).toFixed(1)}%</span>
                  : '—'}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

// ── Tab: Branches ─────────────────────────────────────────────────────────────

function BranchesTab({ params }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-branches', params],
    queryFn:  () => getBranchAnalytics(params),
    staleTime: 2 * 60_000,
  });

  const branches = data?.branches ?? [];

  return (
    <div className="space-y-6">
      {isError && <Alert type="error" title="Failed to load branch analytics" />}

      {/* Branch KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-100 mb-3" />
                <div className="h-7 w-20 animate-pulse rounded bg-gray-100" />
              </div>
            ))
          : branches.map((b) => (
              <MetricCard
                key={b.branch_id}
                label={b.branch_name}
                value={formatCurrencyCompact(b.total_revenue)}
                sub={`${formatNumber(b.total_transactions)} transactions · ${formatCurrencyCompact(b.total_profit)} profit`}
              />
            ))}
      </div>

      {/* Revenue + Profit grouped bar */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue vs Profit by Branch</h3>
        {isLoading ? <ChartSkeleton height={280} /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={branches} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="branch_name" tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Bar dataKey="total_revenue" name="Revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total_profit"  name="Profit"  fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!isLoading && branches.length > 0 && (
        <DataTable headers={['Branch', 'Revenue', 'Profit', 'Margin', 'Transactions', 'Revenue Share']}>
          {branches.map((b) => (
            <tr key={b.branch_id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2.5 font-medium text-gray-900">{b.branch_name}</td>
              <td className="px-4 py-2.5 font-medium">{formatCurrencyCompact(b.total_revenue)}</td>
              <td className="px-4 py-2.5 text-emerald-600 font-medium">{formatCurrencyCompact(b.total_profit)}</td>
              <td className="px-4 py-2.5">
                {b.gross_margin_pct != null
                  ? <span className="text-emerald-600 font-medium">{(+b.gross_margin_pct).toFixed(1)}%</span>
                  : '—'}
              </td>
              <td className="px-4 py-2.5">{formatNumber(b.total_transactions)}</td>
              <td className="px-4 py-2.5">
                {b.revenue_share_pct != null && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${Math.min(100, b.revenue_share_pct)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700">
                      {(+b.revenue_share_pct).toFixed(1)}%
                    </span>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

// ── Tab: Categories ───────────────────────────────────────────────────────────

function CategoriesTab({ params }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-categories', params],
    queryFn:  () => getCategoryAnalytics(params),
    staleTime: 2 * 60_000,
  });

  const categories = data?.categories ?? [];
  const pieData    = categories.map((c) => ({ name: c.category_name, value: c.total_revenue ?? 0 }));

  return (
    <div className="space-y-6">
      {isError && <Alert type="error" title="Failed to load category analytics" />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Donut chart */}
        {isLoading ? <ChartSkeleton height={320} /> : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                outerRadius={120} innerRadius={55}
                dataKey="value"
                paddingAngle={3}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrencyCompact(v)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Stacked bar legend */}
        {isLoading ? <ChartSkeleton height={320} /> : (
          <div className="flex flex-col justify-center space-y-4">
            {categories.map((c, i) => (
              <div key={c.category_name} className="flex items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {c.category_name}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 ml-2 shrink-0">
                      {formatCurrencyCompact(c.total_revenue)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, c.revenue_share_pct ?? 0)}%`,
                        backgroundColor: PALETTE[i % PALETTE.length],
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(c.revenue_share_pct ?? 0).toFixed(1)}% of revenue
                    {c.gross_margin_pct != null && ` · ${(+c.gross_margin_pct).toFixed(1)}% margin`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Customers ────────────────────────────────────────────────────────────

function CustomersTab({ params }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-customers', params],
    queryFn:  () => getCustomerAnalytics(params),
    staleTime: 2 * 60_000,
  });

  const segments = data?.segments ?? [];
  const TYPE_VARIANT = {
    VIP:       'warning',
    Corporate: 'primary',
    Wholesale: 'info',
    Retail:    'default',
  };

  return (
    <div className="space-y-6">
      {isError && <Alert type="error" title="Failed to load customer analytics" />}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total Customers"  value={formatNumber(data?.total_customers)}        loading={isLoading} />
        <MetricCard label="New Customers"    value={formatNumber(data?.new_customers)}           loading={isLoading} />
        <MetricCard label="Repeat Rate"      value={formatPercent(data?.repeat_rate)}            loading={isLoading} />
        <MetricCard label="Avg Order Value"  value={formatCurrencyCompact(data?.avg_order_value)} loading={isLoading} />
      </div>

      {/* Spend by segment */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Total Spend by Customer Segment</h3>
        {isLoading ? <ChartSkeleton height={260} /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={segments} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={44}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="customer_type" tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CurrencyTooltip />} />
              <Bar dataKey="total_spent" name="Total Spent" radius={[4, 4, 0, 0]}>
                {segments.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!isLoading && segments.length > 0 && (
        <DataTable headers={['Segment', 'Customers', 'Total Spent', 'Avg Order', 'Avg Purchases']}>
          {segments.map((s) => (
            <tr key={s.customer_type} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2.5">
                <Badge variant={TYPE_VARIANT[s.customer_type] ?? 'default'}>{s.customer_type}</Badge>
              </td>
              <td className="px-4 py-2.5 font-medium">{formatNumber(s.count)}</td>
              <td className="px-4 py-2.5 font-medium">{formatCurrencyCompact(s.total_spent)}</td>
              <td className="px-4 py-2.5">{formatCurrencyCompact(s.avg_order)}</td>
              <td className="px-4 py-2.5">
                {s.avg_purchases != null ? (+s.avg_purchases).toFixed(1) : '—'}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

// ── Tab: Financial ────────────────────────────────────────────────────────────

function FinancialTab({ params }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-financial', params],
    queryFn:  () => getFinancialAnalytics(params),
    staleTime: 2 * 60_000,
  });

  const summary = data?.summary ?? {};
  const monthly = (data?.monthly ?? []).map((m) => ({ ...m, label: fmtPeriod(m.period) }));

  return (
    <div className="space-y-8">
      {isError && <Alert type="error" title="Failed to load financial analytics" />}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total Revenue" value={formatCurrencyCompact(summary.total_revenue)} loading={isLoading} />
        <MetricCard label="Total Cost"    value={formatCurrencyCompact(summary.total_cost)}    loading={isLoading} />
        <MetricCard label="Gross Profit"  value={formatCurrencyCompact(summary.total_profit)}  loading={isLoading} />
        <MetricCard label="Gross Margin"  value={formatPercent(summary.gross_margin_pct)}      loading={isLoading} />
      </div>

      {/* Margin trend */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Gross Margin %</h3>
        {isLoading ? <ChartSkeleton height={240} /> : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `${(+v).toFixed(0)}%`}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false} tickLine={false}
                width={44}
                domain={['auto', 'auto']}
              />
              <Tooltip formatter={(v) => [`${(+v).toFixed(2)}%`, 'Gross Margin']} />
              <ReferenceLine y={0} stroke="#E2E8F0" />
              <Line
                type="monotone" dataKey="margin_pct" name="Gross Margin %"
                stroke="#10B981" strokeWidth={2}
                dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Revenue / Cost / Profit bars */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue vs Cost vs Profit</h3>
        {isLoading ? <ChartSkeleton height={240} /> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#4F46E5" radius={[3, 3, 0, 0]} />
              <Bar dataKey="cost"    name="Cost"    fill="#F59E0B" radius={[3, 3, 0, 0]} />
              <Bar dataKey="profit"  name="Profit"  fill="#10B981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Analytics() {
  useDocumentTitle('Analytics');

  const [activeTab, setActiveTab] = useState('trend');
  const [dates, setDates] = useState({
    dateFrom: daysAgoISO(365),
    dateTo:   todayISO(),
  });

  const params = { date_from: dates.dateFrom, date_to: dates.dateTo };

  const tabContent = {
    trend:      <TrendTab      params={params} />,
    products:   <ProductsTab   params={params} />,
    branches:   <BranchesTab   params={params} />,
    categories: <CategoriesTab params={params} />,
    customers:  <CustomersTab  params={params} />,
    financial:  <FinancialTab  params={params} />,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Deep-dive sales and financial analytics for the selected period"
      />

      {/* Date range filter */}
      <FilterBar
        dateFrom={dates.dateFrom}
        dateTo={dates.dateTo}
        onChange={setDates}
      />

      {/* KPI summary strip */}
      <KPIStrip params={params} />

      {/* Tabbed analytics card */}
      <Card>
        {/* Tab bar */}
        <div className="overflow-x-auto border-b border-gray-100">
          <nav className="flex -mb-px gap-1 px-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={clsx(
                  'flex items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-medium',
                  'whitespace-nowrap transition-colors duration-150',
                  activeTab === id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <Card.Body className="pt-6">
          {tabContent[activeTab]}
        </Card.Body>
      </Card>
    </div>
  );
}
