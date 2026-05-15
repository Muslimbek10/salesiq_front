/**
 * Forecasting page — redesigned for clarity
 *
 * Layout:
 *   1. Latest Forecast hero  — big numbers + line chart, always visible
 *   2. Run a Forecast panel  — configure & run with plain-English hints
 *   3. Previous Forecasts    — compact history cards
 */
import { useState, useMemo }                        from 'react';
import { useQuery, useMutation, useQueryClient }    from '@tanstack/react-query';
import {
  ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import {
  Play, TrendingUp, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, RefreshCw, Info,
  Calendar, BarChart2, Cpu, Zap, Brain,
  ArrowRight, Clock,
} from 'lucide-react';
import clsx from 'clsx';

import { runForecast, getForecastHistory, getForecast } from '@/api/forecasting';
import { getBranches }  from '@/api/branches';
import { getProducts }  from '@/api/products';

import { PageHeader }    from '@/components/layout/PageHeader';
import { Button }        from '@/components/ui/Button';
import { Select }        from '@/components/ui/Select';
import { Card }          from '@/components/ui/Card';
import { Spinner }       from '@/components/ui/Spinner';
import { Alert }         from '@/components/ui/Alert';
import { Pagination }    from '@/components/ui/Pagination';
import { EmptyState }    from '@/components/ui/EmptyState';
import { ChartSkeleton, fmtPeriod } from '@/components/dashboard/ChartTooltip';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast }         from '@/hooks/useToast';
import {
  formatCurrencyCompact, formatCurrency, formatDate,
} from '@/utils/formatters';
import { parseApiError } from '@/utils/api';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

const MODELS = {
  moving_average: {
    label: 'Moving Average',
    icon:  BarChart2,
    color: 'indigo',
    description: 'Averages your recent sales to smooth out noise. Best when revenue is relatively stable.',
  },
  linear_regression: {
    label: 'Linear Regression',
    icon:  TrendingUp,
    color: 'emerald',
    description: 'Fits a straight trend line through your data. Great when revenue is steadily growing or declining.',
  },
  random_forest: {
    label: 'Random Forest',
    icon:  Brain,
    color: 'violet',
    description: 'Machine-learning model that detects complex seasonal patterns. Needs at least 12 months of history.',
  },
  arima: {
    label: 'ARIMA',
    icon:  Zap,
    color: 'amber',
    description: 'Advanced time-series model that handles trends and seasonality together. Most powerful with rich history.',
  },
};

const TARGET_OPTIONS = [
  { value: 'overall', label: 'All Sales (company-wide)' },
  { value: 'branch',  label: 'One specific branch' },
  { value: 'product', label: 'One specific product' },
];

const HORIZON_OPTIONS = [
  { value: 1,  label: '1 month ahead'  },
  { value: 3,  label: '3 months ahead' },
  { value: 6,  label: '6 months ahead' },
  { value: 12, label: '12 months ahead' },
];

const TRAINING_OPTIONS = [
  { value: 6,  label: 'Last 6 months'  },
  { value: 12, label: 'Last 12 months' },
  { value: 18, label: 'Last 18 months' },
  { value: 24, label: 'Last 24 months' },
];

// accuracy_label → human explanation
const ACCURACY = {
  Excellent: {
    color:   'emerald',
    icon:    CheckCircle,
    heading: 'Excellent accuracy',
    detail:  'The model closely matched real sales during training. Predictions are highly reliable.',
  },
  Good: {
    color:   'emerald',
    icon:    CheckCircle,
    heading: 'Good accuracy',
    detail:  'The model matched real sales well. You can use these predictions with confidence.',
  },
  Fair: {
    color:   'amber',
    icon:    AlertTriangle,
    heading: 'Fair accuracy',
    detail:  'The model partially matched real sales. Use predictions as a rough guide, not a certainty.',
  },
  Poor: {
    color:   'red',
    icon:    AlertTriangle,
    heading: 'Low accuracy',
    detail:  'The model struggled to fit your data — possibly due to outlier transactions. Treat predictions with caution.',
  },
  Low: {
    color:   'red',
    icon:    AlertTriangle,
    heading: 'Low accuracy',
    detail:  'The model struggled to fit your data — possibly due to outlier transactions. Treat predictions with caution.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

function AccuracyBadge({ label, size = 'sm' }) {
  const cfg = ACCURACY[label] ?? ACCURACY.Fair;
  const Icon = cfg.icon;
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50   text-amber-700   border-amber-200',
    red:     'bg-red-50     text-red-600     border-red-200',
  };
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 border rounded-full font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      colors[cfg.color],
    )}>
      <Icon size={size === 'sm' ? 11 : 14} />
      {cfg.heading}
    </span>
  );
}

function ModelTag({ modelName }) {
  const m = MODELS[modelName];
  if (!m) return <span className="text-gray-600 text-sm">{modelName}</span>;
  const Icon = m.icon;
  const colors = {
    indigo: 'text-indigo-600 bg-indigo-50',
    emerald:'text-emerald-600 bg-emerald-50',
    violet: 'text-violet-600 bg-violet-50',
    amber:  'text-amber-600 bg-amber-50',
  };
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold', colors[m.color] ?? colors.indigo)}>
      <Icon size={12} />
      {m.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Latest Forecast Hero
// ─────────────────────────────────────────────────────────────────────────────

function ForecastHero({ latestId, onRunNew }) {
  const { data: forecast, isLoading, isError } = useQuery({
    queryKey: ['forecast-detail', latestId],
    queryFn:  () => getForecast(latestId),
    enabled:  !!latestId,
    staleTime: 60_000,
  });

  if (!latestId) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-8 py-12 text-center">
        <TrendingUp size={40} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-1">No forecasts yet</h3>
        <p className="text-sm text-gray-400 mb-5">
          Run your first forecast below to see predicted revenue here.
        </p>
        <Button onClick={onRunNew} leftIcon={<Play size={14} />}>
          Run First Forecast
        </Button>
      </div>
    );
  }

  if (isLoading) return <ChartSkeleton height={380} />;
  if (isError || !forecast) return <Alert type="error" title="Could not load latest forecast" />;

  // Derived values
  const forecastData = forecast.forecast_data ?? [];
  const historicalPoints = forecastData.filter((p) => p.actual != null);
  const predictedPoints  = forecastData.filter((p) => p.predicted != null);
  const lastActual = historicalPoints.at(-1)?.actual ?? 0;
  const nextPredicted = predictedPoints[0]?.predicted ?? 0;
  const totalPredicted = predictedPoints.reduce((s, p) => s + (p.predicted ?? 0), 0);
  const trendPct = lastActual > 0 ? ((nextPredicted - lastActual) / lastActual) * 100 : null;
  const acc = ACCURACY[forecast.accuracy_label] ?? ACCURACY.Fair;
  const AccIcon = acc.icon;
  const splitLabel = historicalPoints.at(-1) ? fmtPeriod(historicalPoints.at(-1).period) : null;

  // Chart data — rename fields for clarity in the legend
  const chartData = forecastData.map((p) => ({
    label:           fmtPeriod(p.period),
    'Sales History': p.actual    ?? null,
    'Model Fit':     p.fitted    ?? null,
    'Predicted':     p.predicted ?? null,
  }));

  return (
    <Card>
      {/* ── Header strip ── */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-semibold text-gray-900">Latest Revenue Forecast</h2>
            <AccuracyBadge label={forecast.accuracy_label} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <ModelTag modelName={forecast.model_name} />
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {forecast.forecast_period_months}-month horizon
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              Generated {formatDate(forecast.created_at)}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="sm" leftIcon={<Play size={13} />} onClick={onRunNew}>
          Run New Forecast
        </Button>
      </div>

      <Card.Body className="space-y-6">
        {/* ── KPI strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Next month */}
          <div className="col-span-2 sm:col-span-1 rounded-xl bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Next Month Forecast</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{formatCurrencyCompact(nextPredicted)}</p>
            {trendPct != null && (
              <p className={clsx('text-xs mt-1 font-medium', trendPct >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {trendPct >= 0 ? '▲' : '▼'} {Math.abs(trendPct).toFixed(1)}% vs last actual
              </p>
            )}
          </div>

          {/* Total over horizon */}
          <div className="rounded-xl bg-indigo-50 p-4">
            <p className="text-xs font-medium text-indigo-500 uppercase tracking-wide">
              Total ({forecast.forecast_period_months}mo)
            </p>
            <p className="text-xl font-bold text-indigo-700 mt-1">{formatCurrencyCompact(totalPredicted)}</p>
            <p className="text-xs text-indigo-400 mt-1">across all predicted months</p>
          </div>

          {/* Last actual */}
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Actual Month</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{formatCurrencyCompact(lastActual)}</p>
            <p className="text-xs text-gray-400 mt-1">{splitLabel && `as of ${splitLabel}`}</p>
          </div>

          {/* Accuracy */}
          <div className={clsx('rounded-xl p-4', acc.color === 'emerald' ? 'bg-emerald-50' : acc.color === 'amber' ? 'bg-amber-50' : 'bg-red-50')}>
            <p className={clsx('text-xs font-medium uppercase tracking-wide',
              acc.color === 'emerald' ? 'text-emerald-600' : acc.color === 'amber' ? 'text-amber-600' : 'text-red-600')}>
              Model Accuracy
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <AccIcon size={16} className={acc.color === 'emerald' ? 'text-emerald-500' : acc.color === 'amber' ? 'text-amber-500' : 'text-red-500'} />
              <p className={clsx('text-lg font-bold',
                acc.color === 'emerald' ? 'text-emerald-700' : acc.color === 'amber' ? 'text-amber-700' : 'text-red-700')}>
                {acc.heading.split(' ')[0]}
              </p>
            </div>
            <p className={clsx('text-xs mt-1 leading-tight',
              acc.color === 'emerald' ? 'text-emerald-500' : acc.color === 'amber' ? 'text-amber-500' : 'text-red-500')}>
              {acc.detail.split('.')[0]}.
            </p>
          </div>
        </div>

        {/* ── Line chart ── */}
        <div>
          {/* Legend explanation */}
          <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 h-0.5 bg-indigo-500 rounded" />
              Sales History — what actually happened
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 border-t-2 border-dashed border-gray-300" />
              Model Fit — how well it learned your data
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 border-t-2 border-dashed border-amber-400" />
              Predicted — future revenue estimate
            </span>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="gradHistory" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#4F46E5" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => formatCurrencyCompact(v)}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                width={58}
              />
              <Tooltip
                formatter={(val, name) => [formatCurrency(val), name]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
              />
              {/* Vertical dividing line between history and forecast */}
              {splitLabel && (
                <ReferenceLine
                  x={splitLabel}
                  stroke="#CBD5E1"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  label={{
                    value: 'Forecast starts →',
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: '#94A3B8',
                    dy: -6,
                    dx: 8,
                  }}
                />
              )}
              {/* History area fill */}
              <Area
                type="monotone"
                dataKey="Sales History"
                stroke="#4F46E5"
                strokeWidth={2.5}
                fill="url(#gradHistory)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#4F46E5' }}
                connectNulls={false}
              />
              {/* Model fit line */}
              <Line
                type="monotone"
                dataKey="Model Fit"
                stroke="#CBD5E1"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                connectNulls={false}
                legendType="line"
              />
              {/* Prediction line */}
              <Line
                type="monotone"
                dataKey="Predicted"
                stroke="#F59E0B"
                strokeWidth={2.5}
                strokeDasharray="7 4"
                dot={{ r: 4, fill: '#F59E0B', strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ── Predicted months breakdown ── */}
        {predictedPoints.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <ArrowRight size={14} className="text-amber-500" />
              Month-by-month forecast breakdown
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {predictedPoints.map((p, i) => {
                const delta = lastActual > 0 ? ((p.predicted - lastActual) / lastActual) * 100 : null;
                return (
                  <div key={i} className="rounded-lg border border-amber-100 bg-amber-50/60 p-3 text-center">
                    <p className="text-xs text-amber-600 font-medium">{fmtPeriod(p.period)}</p>
                    <p className="text-base font-bold text-gray-800 mt-0.5">{formatCurrencyCompact(p.predicted)}</p>
                    {delta != null && (
                      <p className={clsx('text-xs mt-0.5 font-medium', delta >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Accuracy explanation ── */}
        <div className={clsx('rounded-xl border p-4 flex gap-3',
          acc.color === 'emerald' ? 'bg-emerald-50 border-emerald-100' :
          acc.color === 'amber'   ? 'bg-amber-50 border-amber-100' :
                                    'bg-red-50 border-red-100')}>
          <AccIcon size={18} className={clsx('mt-0.5 shrink-0',
            acc.color === 'emerald' ? 'text-emerald-500' : acc.color === 'amber' ? 'text-amber-500' : 'text-red-500')} />
          <div>
            <p className={clsx('text-sm font-semibold',
              acc.color === 'emerald' ? 'text-emerald-800' : acc.color === 'amber' ? 'text-amber-800' : 'text-red-800')}>
              {acc.heading}
            </p>
            <p className={clsx('text-xs mt-0.5 leading-relaxed',
              acc.color === 'emerald' ? 'text-emerald-700' : acc.color === 'amber' ? 'text-amber-700' : 'text-red-700')}>
              {acc.detail}
              {forecast.mape != null && ` (Error rate: ${(+forecast.mape).toFixed(1)}%)`}
            </p>
            {forecast.commentary && (
              <p className="text-xs mt-2 text-gray-500 italic border-t border-gray-200 pt-2">
                {forecast.commentary}
              </p>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Run a Forecast
// ─────────────────────────────────────────────────────────────────────────────

function RunForecastPanel({ onRun, running, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [form, setForm] = useState({
    model_name:             'moving_average',
    target_type:            'overall',
    target_id:              '',
    forecast_period_months: 6,
    training_months:        12,
  });

  const { data: branchData } = useQuery({ queryKey: ['branches-all'], queryFn: () => getBranches({ page_size: 50 }), staleTime: 5 * 60_000 });
  const { data: prodData }   = useQuery({ queryKey: ['products-all'], queryFn: () => getProducts({ page_size: 200, is_active: 'true' }), staleTime: 5 * 60_000 });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const needsTarget = form.target_type !== 'overall';
  const targetOptions = form.target_type === 'branch'
    ? (branchData?.results ?? []).map((b) => ({ value: b.id, label: b.branch_name }))
    : (prodData?.results   ?? []).map((p) => ({ value: p.id, label: p.product_name }));

  function handleRun() {
    onRun({
      model_name:             form.model_name,
      target_type:            form.target_type,
      forecast_period_months: Number(form.forecast_period_months),
      months_back:            Number(form.training_months),
      ...(needsTarget && form.target_id && { target_id: Number(form.target_id) }),
    });
  }

  const selectedModel = MODELS[form.model_name];
  const ModelIcon = selectedModel?.icon ?? BarChart2;

  return (
    <Card>
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Play size={15} className="text-indigo-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">Run a New Forecast</p>
            <p className="text-xs text-gray-400">Choose a model and predict future revenue</p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && (
        <>
          <div className="border-t border-gray-100" />
          <Card.Body className="space-y-6">

            {/* Step 1 — Choose model */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Step 1 — Choose a forecasting model
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(MODELS).map(([key, m]) => {
                  const Icon = m.icon;
                  const colors = {
                    indigo: { border: 'border-indigo-400 bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', text: 'text-indigo-800' },
                    emerald:{ border: 'border-emerald-400 bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-800' },
                    violet: { border: 'border-violet-400 bg-violet-50', icon: 'bg-violet-100 text-violet-600', text: 'text-violet-800' },
                    amber:  { border: 'border-amber-400 bg-amber-50', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-800' },
                  };
                  const c = colors[m.color];
                  const isSelected = form.model_name === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setForm((f) => ({ ...f, model_name: key }))}
                      className={clsx(
                        'text-left rounded-xl border-2 p-4 transition-all',
                        isSelected ? c.border : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center mb-2', isSelected ? c.icon : 'bg-gray-100 text-gray-500')}>
                        <Icon size={15} />
                      </div>
                      <p className={clsx('text-sm font-semibold mb-1', isSelected ? c.text : 'text-gray-700')}>{m.label}</p>
                      <p className="text-xs text-gray-400 leading-relaxed">{m.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2 — Target + horizon */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Step 2 — Set target and time horizon
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Select
                    label="Forecast target"
                    value={form.target_type}
                    onChange={(e) => setForm((f) => ({ ...f, target_type: e.target.value, target_id: '' }))}
                    options={TARGET_OPTIONS}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Which sales to forecast</p>
                </div>
                {needsTarget && (
                  <div>
                    <Select
                      label={form.target_type === 'branch' ? 'Select branch' : 'Select product'}
                      value={form.target_id}
                      onChange={set('target_id')}
                      options={[{ value: '', label: `Pick a ${form.target_type}…` }, ...targetOptions]}
                    />
                  </div>
                )}
                <div>
                  <Select
                    label="How far ahead?"
                    value={form.forecast_period_months}
                    onChange={set('forecast_period_months')}
                    options={HORIZON_OPTIONS.map((h) => ({ value: h.value, label: h.label }))}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Number of months to predict</p>
                </div>
                <div>
                  <Select
                    label="Training data range"
                    value={form.training_months}
                    onChange={set('training_months')}
                    options={TRAINING_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">How much history to learn from</p>
                </div>
              </div>
            </div>

            {/* Run button */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Info size={12} />
                The model will learn from your sales history, then project the chosen number of months ahead.
              </p>
              <Button leftIcon={<Play size={14} />} onClick={handleRun} loading={running}>
                Run Forecast
              </Button>
            </div>
          </Card.Body>
        </>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Previous Forecasts
// ─────────────────────────────────────────────────────────────────────────────

function PreviousForecastCard({ forecast, isLatest }) {
  const [expanded, setExpanded] = useState(false);
  const acc = ACCURACY[forecast.accuracy_label] ?? ACCURACY.Fair;

  // Mini chart data — only available on detail fetch
  const { data: detail } = useQuery({
    queryKey: ['forecast-detail', forecast.id],
    queryFn:  () => getForecast(forecast.id),
    enabled:  expanded,
    staleTime: 60_000,
  });

  const predictedPoints = (detail?.forecast_data ?? []).filter((p) => p.predicted != null);
  const nextPredicted   = predictedPoints[0]?.predicted;

  const chartData = (detail?.forecast_data ?? []).map((p) => ({
    label:     fmtPeriod(p.period),
    'History': p.actual    ?? null,
    'Fit':     p.fitted    ?? null,
    'Forecast':p.predicted ?? null,
  }));
  const splitLabel = (detail?.forecast_data ?? []).filter((p) => p.actual != null).at(-1);

  return (
    <div className={clsx('rounded-xl border transition-all', isLatest ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-100 bg-white')}>
      {/* Card header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 rounded-xl transition-colors text-left"
      >
        {/* Model icon */}
        <div className="shrink-0">
          <ModelTag modelName={forecast.model_name} />
        </div>

        {/* Info grid */}
        <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-0.5 sm:grid-cols-4 text-sm">
          <div>
            <p className="text-[10px] text-gray-400 uppercase">Target</p>
            <p className="font-medium text-gray-800 capitalize">{forecast.forecast_target_type}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase">Horizon</p>
            <p className="font-medium text-gray-800">{forecast.forecast_period_months} months</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase">Next Month</p>
            <p className="font-semibold text-amber-600">
              {forecast.predicted_revenue != null ? formatCurrencyCompact(+forecast.predicted_revenue / forecast.forecast_period_months) : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase">Total Predicted</p>
            <p className="font-semibold text-indigo-600">
              {forecast.predicted_revenue != null ? formatCurrencyCompact(+forecast.predicted_revenue) : '—'}
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="shrink-0 flex items-center gap-3">
          <AccuracyBadge label={forecast.accuracy_label} />
          <span className="text-xs text-gray-400 hidden sm:block">{formatDate(forecast.created_at)}</span>
          {expanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </div>
      </button>

      {/* Expanded: line chart + month breakdown */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          {!detail ? (
            <div className="pt-4"><ChartSkeleton height={200} /></div>
          ) : (
            <div className="pt-4 space-y-4">
              {/* Line chart */}
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip formatter={(v, name) => [formatCurrency(v), name]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  {splitLabel && (
                    <ReferenceLine x={fmtPeriod(splitLabel.period)} stroke="#CBD5E1" strokeDasharray="4 3" />
                  )}
                  <Area type="monotone" dataKey="History"  stroke="#4F46E5" strokeWidth={2} fill="#EEF2FF" dot={false} connectNulls={false} />
                  <Line  type="monotone" dataKey="Fit"      stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="3 3" dot={false} connectNulls={false} />
                  <Line  type="monotone" dataKey="Forecast" stroke="#F59E0B" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: '#F59E0B', strokeWidth: 0 }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Predicted month cards */}
              {predictedPoints.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {predictedPoints.map((p, i) => (
                    <div key={i} className="rounded-lg bg-amber-50 border border-amber-100 p-2 text-center">
                      <p className="text-[10px] text-amber-600 font-medium">{fmtPeriod(p.period)}</p>
                      <p className="text-sm font-bold text-gray-800">{formatCurrencyCompact(p.predicted)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Accuracy note */}
              <p className="text-xs text-gray-400 italic">{acc.detail}{detail.mape != null ? ` (MAPE: ${(+detail.mape).toFixed(1)}%)` : ''}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Forecasting() {
  useDocumentTitle('Forecasting');
  const { toast }   = useToast();
  const queryClient = useQueryClient();
  const [page, setPage]               = useState(1);
  const [filterModel,  setFilterModel]  = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [formOpen,     setFormOpen]     = useState(false);

  const params = {
    page, page_size: PAGE_SIZE,
    ...(filterModel  && { model_name:  filterModel }),
    ...(filterTarget && { target_type: filterTarget }),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['forecast-history', params],
    queryFn:  () => getForecastHistory(params),
    staleTime: 30_000,
  });

  const forecasts  = data?.results     ?? [];
  const totalPages = data?.total_pages ?? 1;
  const count      = data?.count       ?? 0;
  const latestId   = forecasts[0]?.id  ?? null;
  const hasForecasts = count > 0;

  const runMutation = useMutation({
    mutationFn: runForecast,
    onSuccess: (result) => {
      toast.success(`Forecast complete — ${result.accuracy_label ?? 'results ready'}.`);
      queryClient.invalidateQueries({ queryKey: ['forecast-history'] });
      queryClient.invalidateQueries({ queryKey: ['forecast-detail'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-forecast'] });
      setFormOpen(false);
    },
    onError: (e) => toast.error(parseApiError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Forecasting"
        subtitle="Predict future sales using your historical data. Pick a model, choose a time window, and see what to expect."
        action={
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Cpu size={13} />
            {count} forecast{count !== 1 ? 's' : ''} on record
          </div>
        }
      />

      {runMutation.isError && (
        <Alert type="error" title="Forecast failed">{parseApiError(runMutation.error)}</Alert>
      )}

      {/* 1 — Latest forecast hero */}
      {isLoading
        ? <ChartSkeleton height={380} />
        : <ForecastHero latestId={latestId} onRunNew={() => setFormOpen(true)} />
      }

      {/* 2 — Run a forecast */}
      <RunForecastPanel
        onRun={(cfg) => runMutation.mutate(cfg)}
        running={runMutation.isPending}
        defaultOpen={formOpen || !hasForecasts}
      />

      {/* 3 — Previous forecasts */}
      {hasForecasts && (
        <Card>
          <Card.Header
            title="Previous Forecasts"
            subtitle="Click any row to see its full line chart"
            action={
              <div className="flex items-center gap-3">
                <select
                  value={filterModel}
                  onChange={(e) => { setFilterModel(e.target.value); setPage(1); }}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white"
                >
                  <option value="">All models</option>
                  {Object.entries(MODELS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                </select>
                <select
                  value={filterTarget}
                  onChange={(e) => { setFilterTarget(e.target.value); setPage(1); }}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white"
                >
                  <option value="">All targets</option>
                  {TARGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['forecast-history'] })}
                  className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            }
          />

          {isError && <div className="px-6 pt-4"><Alert type="error" title="Failed to load forecast history" /></div>}

          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : forecasts.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No results" message="No forecasts match the selected filters." />
          ) : (
            <div className="px-4 py-4 space-y-2">
              {forecasts.map((f, i) => (
                <PreviousForecastCard
                  key={f.id}
                  forecast={f}
                  isLatest={i === 0 && page === 1}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="px-5 border-t border-gray-100">
              <Pagination page={page} totalPages={totalPages} count={count} pageSize={PAGE_SIZE} onPage={setPage} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
