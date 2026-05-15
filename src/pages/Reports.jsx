/**
 * Reports page — tabbed structured reports
 * Tabs: Daily | Monthly | Yearly | Branch | Product
 *
 * API field mapping (actual API response keys):
 *   daily   → data.series        [{date, revenue, cost, profit, transactions, units}]
 *   monthly → data.series        [{month, revenue, cost, profit, gross_margin_pct, transactions, units, cumulative_revenue, cumulative_profit}]
 *             data.totals        {revenue, cost, profit, gross_margin_pct, transactions, units_sold}
 *   yearly  → data.years         [{year, revenue, cost, profit, gross_margin_pct, transactions, units, revenue_growth}]
 *   branch  → data.branches      [{branch_id, branch_name, location, revenue, cost, profit, gross_margin_pct, transactions, units, revenue_share_pct}]
 *   product → data.top_products  [{product_id, product_name, sku, category, revenue, cost, profit, margin_pct, transactions, units}]
 *             data.bottom_products
 */
import { useState, useMemo } from 'react';
import { useQuery }          from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  FileText, Download, Calendar, TrendingUp, TrendingDown,
  Building2, Package, BarChart2, DollarSign, ShoppingCart,
  Layers, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import clsx from 'clsx';

import {
  getDailyReport, getMonthlyReport, getYearlyReport,
  getBranchReport, getProductReport,
} from '@/api/reports';

import { PageHeader }    from '@/components/layout/PageHeader';
import { Button }        from '@/components/ui/Button';
import { Input }         from '@/components/ui/Input';
import { Card }          from '@/components/ui/Card';
import { EmptyState }    from '@/components/ui/EmptyState';
import { Spinner }       from '@/components/ui/Spinner';
import { Alert }         from '@/components/ui/Alert';
import { Select }        from '@/components/ui/Select';
import { CurrencyTooltip, ChartSkeleton, fmtPeriod } from '@/components/dashboard/ChartTooltip';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  formatCurrencyCompact, formatNumber, formatDate,
  daysAgoISO, todayISO,
} from '@/utils/formatters';

const PALETTE = ['#4F46E5','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316'];

const TABS = [
  { id: 'daily',   label: 'Daily',   icon: Calendar   },
  { id: 'monthly', label: 'Monthly', icon: TrendingUp  },
  { id: 'yearly',  label: 'Yearly',  icon: BarChart2   },
  { id: 'branch',  label: 'Branch',  icon: Building2   },
  { id: 'product', label: 'Product', icon: Package     },
];

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color = 'indigo', trend }) {
  const colors = {
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  icon: 'text-indigo-400'  },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-400' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   icon: 'text-amber-400'   },
    sky:     { bg: 'bg-sky-50',     text: 'text-sky-600',     icon: 'text-sky-400'     },
    red:     { bg: 'bg-red-50',     text: 'text-red-600',     icon: 'text-red-400'     },
  };
  const c = colors[color] ?? colors.indigo;
  return (
    <div className={clsx('rounded-xl p-4 flex flex-col gap-1', c.bg)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={15} className={c.icon} />}
      </div>
      <div className={clsx('text-xl font-bold', c.text)}>{value}</div>
      {(sub || trend != null) && (
        <div className="flex items-center gap-1">
          {trend != null && (trend >= 0
            ? <ArrowUpRight size={12} className="text-emerald-500" />
            : <ArrowDownRight size={12} className="text-red-400" />
          )}
          <span className="text-xs text-gray-400">{sub}</span>
        </div>
      )}
    </div>
  );
}

// ── Toggle buttons ─────────────────────────────────────────────────────────────
function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            value === o.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Shared table ───────────────────────────────────────────────────────────────
function ReportTable({ headers, rows, renderRow, emptyMessage = 'No data for the selected period' }) {
  if (!rows.length) return <EmptyState icon={FileText} title="No data" message={emptyMessage} />;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>{headers.map((h) => (
            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row, i) => renderRow(row, i))}
        </tbody>
      </table>
    </div>
  );
}

// ── CSV export ────────────────────────────────────────────────────────────────
function downloadCSV(rows, headers, filename) {
  const lines = [headers.join(','), ...rows.map((r) => Object.values(r).map((v) => `"${v ?? ''}"`).join(','))];
  const blob  = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a     = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Daily Report ──────────────────────────────────────────────────────────────
function DailyTab() {
  const [dateFrom, setDateFrom] = useState(daysAgoISO(30));
  const [dateTo,   setDateTo]   = useState(todayISO());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-daily', dateFrom, dateTo],
    queryFn:  () => getDailyReport({ date_from: dateFrom, date_to: dateTo }),
    staleTime: 5 * 60_000,
  });

  // API: { period, series: [{date, revenue, cost, profit, transactions, units}] }
  const rows      = data?.series ?? [];
  const chartData = rows.map((r) => ({ ...r, label: formatDate(r.date) }));

  const totals = useMemo(() => rows.reduce(
    (acc, r) => ({
      revenue:      acc.revenue      + (r.revenue      || 0),
      profit:       acc.profit       + (r.profit        || 0),
      transactions: acc.transactions + (r.transactions  || 0),
      units:        acc.units        + (r.units         || 0),
    }),
    { revenue: 0, profit: 0, transactions: 0, units: 0 },
  ), [rows]);

  const margin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">From</span>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">To</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
        </div>
        <Button variant="ghost" size="sm" leftIcon={<Download size={13} />}
          onClick={() => downloadCSV(rows, ['Date','Revenue','Cost','Profit','Transactions','Units'], `daily_report_${dateFrom}_${dateTo}.csv`)}>
          Export CSV
        </Button>
      </div>

      {isError && <Alert type="error" title="Failed to load daily report" />}

      {/* KPI cards */}
      {!isLoading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Total Revenue"   value={formatCurrencyCompact(totals.revenue)}      icon={DollarSign}   color="indigo"  />
          <KpiCard label="Total Profit"    value={formatCurrencyCompact(totals.profit)}        icon={TrendingUp}   color="emerald" />
          <KpiCard label="Avg Margin"      value={`${margin.toFixed(1)}%`}                     icon={Layers}       color="amber"   />
          <KpiCard label="Transactions"    value={formatNumber(totals.transactions)}            icon={ShoppingCart} color="sky"
            sub={`${formatNumber(totals.units)} units`} />
        </div>
      )}

      {isLoading ? <ChartSkeleton height={260} /> : rows.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<CurrencyTooltip />} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="revenue" name="Revenue" fill="#4F46E5" radius={[2,2,0,0]} />
            <Bar dataKey="profit"  name="Profit"  fill="#10B981" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyState icon={Calendar} title="No data" message="No sales found for the selected date range." />}

      {!isLoading && rows.length > 0 && (
        <ReportTable
          headers={['Date', 'Revenue', 'Profit', 'Cost', 'Transactions', 'Units']}
          rows={rows}
          renderRow={(r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 text-gray-700">{formatDate(r.date)}</td>
              <td className="px-4 py-2.5 font-medium">{formatCurrencyCompact(r.revenue)}</td>
              <td className="px-4 py-2.5 text-emerald-600 font-medium">{formatCurrencyCompact(r.profit)}</td>
              <td className="px-4 py-2.5 text-gray-500">{formatCurrencyCompact(r.cost)}</td>
              <td className="px-4 py-2.5">{formatNumber(r.transactions)}</td>
              <td className="px-4 py-2.5">{formatNumber(r.units)}</td>
            </tr>
          )}
        />
      )}
    </div>
  );
}

// ── Monthly Report ─────────────────────────────────────────────────────────────
function MonthlyTab() {
  const currentYear = new Date().getFullYear();
  const [year,      setYear]      = useState(String(currentYear));
  const [chartMode, setChartMode] = useState('monthly');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-monthly', year],
    queryFn:  () => getMonthlyReport({ date_from: `${year}-01-01`, date_to: `${year}-12-31` }),
    staleTime: 5 * 60_000,
  });

  // API: { period, series: [{month, revenue, cost, profit, gross_margin_pct, transactions, units, cumulative_revenue, cumulative_profit}], totals }
  const rows   = data?.series ?? [];
  const totals = data?.totals ?? {};
  const chartData = rows.map((r) => ({ ...r, label: fmtPeriod(r.month) }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select label="Year" value={year} onChange={(e) => setYear(e.target.value)}
          options={[currentYear, currentYear - 1, currentYear - 2].map((y) => ({ value: String(y), label: String(y) }))}
          className="w-32" />
        <div className="pt-5">
          <ToggleGroup
            value={chartMode}
            onChange={setChartMode}
            options={[{ value: 'monthly', label: 'Monthly' }, { value: 'cumulative', label: 'Cumulative' }]}
          />
        </div>
        <div className="pt-5 ml-auto">
          <Button variant="ghost" size="sm" leftIcon={<Download size={13} />}
            onClick={() => downloadCSV(rows, ['Month','Revenue','Cost','Profit','Margin %','Transactions','Units'], `monthly_report_${year}.csv`)}>
            Export CSV
          </Button>
        </div>
      </div>

      {isError && <Alert type="error" title="Failed to load monthly report" />}

      {/* KPI cards from totals */}
      {!isLoading && (totals.revenue > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Annual Revenue"  value={formatCurrencyCompact(totals.revenue)}                        icon={DollarSign}   color="indigo"  />
          <KpiCard label="Annual Profit"   value={formatCurrencyCompact(totals.profit)}                         icon={TrendingUp}   color="emerald" />
          <KpiCard label="Gross Margin"    value={`${(+(totals.gross_margin_pct ?? 0)).toFixed(1)}%`}            icon={Layers}       color="amber"   />
          <KpiCard label="Transactions"    value={formatNumber(totals.transactions)}                             icon={ShoppingCart} color="sky"
            sub={`${formatNumber(totals.units_sold)} units`} />
        </div>
      )}

      {isLoading ? <ChartSkeleton height={280} /> : rows.length > 0 ? (
        chartMode === 'monthly' ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#4F46E5" radius={[3,3,0,0]} />
              <Bar dataKey="profit"  name="Profit"  fill="#10B981" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradPro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="cumulative_revenue" name="Cumul. Revenue" stroke="#4F46E5" strokeWidth={2} fill="url(#gradRev)" dot={{ r: 3, fill: '#4F46E5', strokeWidth: 0 }} />
              <Area type="monotone" dataKey="cumulative_profit"  name="Cumul. Profit"  stroke="#10B981" strokeWidth={2} fill="url(#gradPro)" dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )
      ) : <EmptyState icon={TrendingUp} title="No data" message="No sales found for the selected year." />}

      {!isLoading && rows.length > 0 && (
        <ReportTable
          headers={['Month', 'Revenue', 'Profit', 'Cost', 'Margin %', 'Transactions', 'Units']}
          rows={rows}
          renderRow={(r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 font-medium text-gray-900">{fmtPeriod(r.month)}</td>
              <td className="px-4 py-2.5 font-medium">{formatCurrencyCompact(r.revenue)}</td>
              <td className="px-4 py-2.5 text-emerald-600 font-medium">{formatCurrencyCompact(r.profit)}</td>
              <td className="px-4 py-2.5 text-gray-500">{formatCurrencyCompact(r.cost)}</td>
              <td className="px-4 py-2.5">{r.gross_margin_pct != null ? `${(+r.gross_margin_pct).toFixed(1)}%` : '—'}</td>
              <td className="px-4 py-2.5">{formatNumber(r.transactions)}</td>
              <td className="px-4 py-2.5">{formatNumber(r.units)}</td>
            </tr>
          )}
        />
      )}
    </div>
  );
}

// ── Yearly Report ──────────────────────────────────────────────────────────────
function YearlyTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-yearly'],
    queryFn:  getYearlyReport,
    staleTime: 10 * 60_000,
  });
  // API: { years: [{year, revenue, cost, profit, gross_margin_pct, transactions, units, revenue_growth}] }
  const rows = data?.years ?? [];

  const latest = rows.length > 0 ? rows[rows.length - 1] : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" leftIcon={<Download size={13} />}
          onClick={() => downloadCSV(rows, ['Year','Revenue','Cost','Profit','Margin %','Transactions','Units','YoY Growth %'], 'yearly_report.csv')}>
          Export CSV
        </Button>
      </div>

      {isError && <Alert type="error" title="Failed to load yearly report" />}

      {!isLoading && latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label={`${latest.year} Revenue`} value={formatCurrencyCompact(latest.revenue)}                      icon={DollarSign}   color="indigo"  />
          <KpiCard label={`${latest.year} Profit`}  value={formatCurrencyCompact(latest.profit)}                        icon={TrendingUp}   color="emerald" />
          <KpiCard label="Gross Margin"              value={`${(+(latest.gross_margin_pct ?? 0)).toFixed(1)}%`}          icon={Layers}       color="amber"   />
          <KpiCard label="YoY Revenue Growth"
            value={latest.revenue_growth != null ? `${(+latest.revenue_growth) >= 0 ? '+' : ''}${(+latest.revenue_growth).toFixed(1)}%` : 'N/A'}
            icon={latest.revenue_growth != null && +latest.revenue_growth >= 0 ? ArrowUpRight : ArrowDownRight}
            color={latest.revenue_growth != null && +latest.revenue_growth >= 0 ? 'emerald' : 'red'}
            trend={latest.revenue_growth}
            sub="vs previous year" />
        </div>
      )}

      {isLoading ? <ChartSkeleton height={280} /> : rows.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={60} />
            <Tooltip content={<CurrencyTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="revenue" name="Revenue" fill="#4F46E5" radius={[4,4,0,0]} />
            <Bar dataKey="profit"  name="Profit"  fill="#10B981" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyState icon={BarChart2} title="No data" message="No yearly data available." />}

      {!isLoading && rows.length > 0 && (
        <ReportTable
          headers={['Year', 'Revenue', 'Profit', 'Margin %', 'Transactions', 'Units', 'YoY Growth']}
          rows={rows}
          renderRow={(r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 font-bold text-gray-900">{r.year}</td>
              <td className="px-4 py-2.5 font-medium">{formatCurrencyCompact(r.revenue)}</td>
              <td className="px-4 py-2.5 text-emerald-600 font-medium">{formatCurrencyCompact(r.profit)}</td>
              <td className="px-4 py-2.5">{r.gross_margin_pct != null ? `${(+r.gross_margin_pct).toFixed(1)}%` : '—'}</td>
              <td className="px-4 py-2.5">{formatNumber(r.transactions)}</td>
              <td className="px-4 py-2.5">{formatNumber(r.units)}</td>
              <td className="px-4 py-2.5">
                {r.revenue_growth != null ? (
                  <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                    +r.revenue_growth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                    {+r.revenue_growth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {+r.revenue_growth >= 0 ? '+' : ''}{(+r.revenue_growth).toFixed(1)}%
                  </span>
                ) : <span className="text-gray-300 text-xs">First year</span>}
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}

// ── Branch Report ──────────────────────────────────────────────────────────────
function BranchTab() {
  const [dateFrom,  setDateFrom]  = useState(daysAgoISO(365));
  const [dateTo,    setDateTo]    = useState(todayISO());
  const [chartType, setChartType] = useState('bar');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-branch', dateFrom, dateTo],
    queryFn:  () => getBranchReport({ date_from: dateFrom, date_to: dateTo }),
    staleTime: 5 * 60_000,
  });
  // API: { period, branches: [{branch_id, branch_name, location, revenue, cost, profit, gross_margin_pct, transactions, units, revenue_share_pct}] }
  const rows = data?.branches ?? [];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">From</span>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">To</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
        </div>
        <ToggleGroup
          value={chartType}
          onChange={setChartType}
          options={[{ value: 'bar', label: 'Bar' }, { value: 'pie', label: 'Pie' }]}
        />
        <div className="ml-auto">
          <Button variant="ghost" size="sm" leftIcon={<Download size={13} />}
            onClick={() => downloadCSV(rows, ['Branch','Location','Revenue','Profit','Margin %','Transactions','Revenue Share %'], `branch_report_${dateFrom}_${dateTo}.csv`)}>
            Export CSV
          </Button>
        </div>
      </div>

      {isError && <Alert type="error" title="Failed to load branch report" />}

      {/* KPI cards — one per branch (up to 4) */}
      {!isLoading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {rows.slice(0, 4).map((r, i) => (
            <KpiCard key={r.branch_id} label={r.branch_name}
              value={formatCurrencyCompact(r.revenue)}
              icon={Building2}
              color={(['indigo','emerald','amber','sky'])[i % 4]}
              sub={`${(+r.revenue_share_pct).toFixed(1)}% share · ${formatNumber(r.transactions)} txn`}
            />
          ))}
        </div>
      )}

      {isLoading ? <ChartSkeleton height={260} /> : rows.length > 0 ? (
        chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="branch_name" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="revenue" name="Revenue" radius={[4,4,0,0]}>
                {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
              <Bar dataKey="profit" name="Profit" radius={[4,4,0,0]} fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={rows}
                dataKey="revenue"
                nameKey="branch_name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={55}
                paddingAngle={3}
                label={({ branch_name, revenue_share_pct }) =>
                  `${branch_name}: ${(+revenue_share_pct).toFixed(1)}%`
                }
                labelLine={true}
              >
                {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip formatter={(val) => formatCurrencyCompact(val)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )
      ) : <EmptyState icon={Building2} title="No data" message="No branch data for the selected period." />}

      {!isLoading && rows.length > 0 && (
        <ReportTable
          headers={['Branch', 'Location', 'Revenue', 'Profit', 'Margin %', 'Transactions', 'Revenue Share']}
          rows={rows}
          renderRow={(r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="font-medium text-gray-900">{r.branch_name}</span>
                </div>
              </td>
              <td className="px-4 py-2.5 text-gray-500 text-xs">{r.location}</td>
              <td className="px-4 py-2.5 font-medium">{formatCurrencyCompact(r.revenue)}</td>
              <td className="px-4 py-2.5 text-emerald-600 font-medium">{formatCurrencyCompact(r.profit)}</td>
              <td className="px-4 py-2.5">{r.gross_margin_pct != null ? `${(+r.gross_margin_pct).toFixed(1)}%` : '—'}</td>
              <td className="px-4 py-2.5">{formatNumber(r.transactions)}</td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-20">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.revenue_share_pct)}%`, background: PALETTE[i % PALETTE.length] }} />
                  </div>
                  <span className="text-xs font-medium">{(+r.revenue_share_pct).toFixed(1)}%</span>
                </div>
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}

// ── Product Report ─────────────────────────────────────────────────────────────
function ProductTab() {
  const [dateFrom, setDateFrom] = useState(daysAgoISO(365));
  const [dateTo,   setDateTo]   = useState(todayISO());
  const [limit,    setLimit]    = useState(20);
  const [view,     setView]     = useState('top');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-product', dateFrom, dateTo, limit],
    queryFn:  () => getProductReport({ date_from: dateFrom, date_to: dateTo, limit }),
    staleTime: 5 * 60_000,
  });

  // API: { period, top_products: [...], bottom_products: [...] }
  // items: { product_id, product_name, sku, category, revenue, cost, profit, margin_pct, transactions, units }
  const topRows    = data?.top_products    ?? [];
  const bottomRows = data?.bottom_products ?? [];
  const rows       = view === 'top' ? topRows : bottomRows;

  const chartData = topRows.slice(0, 10).map((r) => ({
    name:    r.product_name.length > 14 ? r.product_name.slice(0, 14) + '…' : r.product_name,
    revenue: r.revenue,
    profit:  r.profit,
  }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">From</span>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">To</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
        </div>
        <Select value={limit} onChange={(e) => setLimit(Number(e.target.value))}
          options={[10, 20, 50].map((n) => ({ value: n, label: `Top ${n}` }))}
          className="w-28" />
        <Button variant="ghost" size="sm" leftIcon={<Download size={13} />}
          onClick={() => downloadCSV(rows, ['Product','SKU','Category','Revenue','Profit','Units','Margin %'], `product_report_${view}_${dateFrom}_${dateTo}.csv`)}>
          Export CSV
        </Button>
      </div>

      {isError && <Alert type="error" title="Failed to load product report" />}

      {/* Top / Bottom toggle */}
      <div className="flex gap-2">
        <button onClick={() => setView('top')}
          className={clsx('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            view === 'top' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
          <TrendingUp size={14} /> Top Performers
        </button>
        <button onClick={() => setView('bottom')}
          className={clsx('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            view === 'bottom' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
          <TrendingDown size={14} /> Low Performers
        </button>
      </div>

      {/* Top-10 horizontal bar chart */}
      {!isLoading && view === 'top' && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 24, left: 4, bottom: 0 }} barSize={11}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={120} />
            <Tooltip content={<CurrencyTooltip />} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="revenue" name="Revenue" fill="#4F46E5" radius={[0,2,2,0]} />
            <Bar dataKey="profit"  name="Profit"  fill="#10B981" radius={[0,2,2,0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {isLoading ? <Spinner size="lg" className="mx-auto block py-8" /> : (
        <ReportTable
          headers={['#', 'Product', 'SKU', 'Category', 'Revenue', 'Profit', 'Units', 'Margin %']}
          rows={rows}
          renderRow={(r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
              <td className="px-4 py-2.5 font-medium text-gray-900">{r.product_name}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{r.sku}</td>
              <td className="px-4 py-2.5 text-gray-500">{r.category}</td>
              <td className="px-4 py-2.5 font-medium">{formatCurrencyCompact(r.revenue)}</td>
              <td className="px-4 py-2.5 text-emerald-600 font-medium">{formatCurrencyCompact(r.profit)}</td>
              <td className="px-4 py-2.5">{formatNumber(r.units)}</td>
              <td className="px-4 py-2.5">
                {r.margin_pct != null
                  ? <span className={clsx('font-medium',
                      +r.margin_pct >= 40 ? 'text-emerald-600' : +r.margin_pct >= 20 ? 'text-amber-600' : 'text-red-500')}>
                      {(+r.margin_pct).toFixed(1)}%
                    </span>
                  : '—'}
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function Reports() {
  useDocumentTitle('Reports');
  const [activeTab, setActiveTab] = useState('monthly');

  const tabContent = {
    daily:   <DailyTab   />,
    monthly: <MonthlyTab />,
    yearly:  <YearlyTab  />,
    branch:  <BranchTab  />,
    product: <ProductTab />,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Structured period and category reports with interactive charts and CSV export"
      />

      <Card>
        <div className="border-b border-gray-100 overflow-x-auto">
          <nav className="flex -mb-px px-2 gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  activeTab === id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                )}>
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </div>
        <Card.Body className="pt-6">
          {tabContent[activeTab]}
        </Card.Body>
      </Card>
    </div>
  );
}
