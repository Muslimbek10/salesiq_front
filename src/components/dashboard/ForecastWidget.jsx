import { useNavigate } from 'react-router-dom';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, ArrowRight, Play, CheckCircle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { Card }             from '@/components/ui/Card';
import { Button }           from '@/components/ui/Button';
import { Badge }            from '@/components/ui/Badge';
import { Spinner }          from '@/components/ui/Spinner';
import { formatCurrencyCompact, formatNumber } from '@/utils/formatters';
import { fmtPeriod }        from './ChartTooltip';

const MODEL_LABELS = {
  moving_average:   'Moving Average',
  linear_regression: 'Linear Regression',
};

const ACCURACY_CONFIG = {
  Excellent: { variant: 'success', icon: CheckCircle },
  Good:      { variant: 'primary', icon: CheckCircle },
  Fair:      { variant: 'warning', icon: AlertTriangle },
  Poor:      { variant: 'danger',  icon: AlertTriangle },
};

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-xl text-xs min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1.5">{label}</p>
      {payload.map((e) => e.value != null && (
        <div key={e.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
            <span className="text-gray-500">{e.name}</span>
          </div>
          <span className="font-semibold text-gray-900">
            {formatCurrencyCompact(e.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Forecast summary widget — mini chart + metrics + commentary.
 *
 * @param {object|null} forecast   — latest ForecastResponseSerializer item
 * @param {boolean}     loading
 * @param {function}    onRunForecast  — navigate to forecasting page
 */
export function ForecastWidget({ forecast, loading, onRunForecast }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <Card.Header title="Revenue Forecast" />
        <Card.Body>
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (!forecast) {
    return (
      <Card>
        <Card.Header title="Revenue Forecast" subtitle="No forecast available yet" />
        <Card.Body>
          <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
              <TrendingUp size={26} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Run your first forecast</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Use Moving Average or Linear Regression to predict future revenue.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Play size={14} />}
              onClick={onRunForecast ?? (() => navigate('/forecasting'))}
            >
              Go to Forecasting
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  }

  // Build chart data from forecast_data or historical/predicted_points
  const rawData = forecast.forecast_data ?? [];
  const chartData = rawData.map((p) => ({
    label:     fmtPeriod(p.period),
    actual:    p.actual   ?? null,
    fitted:    p.fitted   ?? null,
    predicted: p.predicted ?? null,
  }));

  // Find the split point (last actual period)
  const splitLabel = chartData
    .filter((d) => d.actual != null)
    .at(-1)?.label;

  // Predicted metrics
  const predictedPoints = chartData.filter((d) => d.predicted != null);
  const nextPredicted   = predictedPoints[0]?.predicted;
  const lastActual      = chartData.filter((d) => d.actual != null).at(-1)?.actual;
  const forecastGrowth  = lastActual && nextPredicted
    ? ((nextPredicted - lastActual) / lastActual) * 100
    : null;

  const accuracyCfg = ACCURACY_CONFIG[forecast.accuracy_label] ?? ACCURACY_CONFIG.Fair;
  const AccuracyIcon = accuracyCfg.icon;

  return (
    <Card>
      <Card.Header
        title="Revenue Forecast"
        subtitle={`${MODEL_LABELS[forecast.model_name] ?? forecast.model_name} · ${forecast.forecast_period_months}-month horizon`}
        action={
          <Button
            variant="ghost"
            size="xs"
            onClick={() => navigate('/forecasting')}
            rightIcon={<ArrowRight size={12} />}
          >
            Full view
          </Button>
        }
      />

      <Card.Body>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Chart */}
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => formatCurrencyCompact(v)}
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={<ForecastTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />

                {/* Vertical reference line at forecast start */}
                {splitLabel && (
                  <ReferenceLine
                    x={splitLabel}
                    stroke="#CBD5E1"
                    strokeDasharray="4 3"
                    label={{ value: 'Forecast →', position: 'top', fontSize: 10, fill: '#94A3B8' }}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="fitted"
                  name="Fitted"
                  stroke="#CBD5E1"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="Forecast"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={{ r: 3, fill: '#F59E0B', strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Metrics panel */}
          <div className="flex flex-col gap-4 justify-center">
            {/* Accuracy */}
            <div className="flex items-center gap-2">
              <AccuracyIcon
                size={16}
                className={clsx(
                  accuracyCfg.variant === 'success' || accuracyCfg.variant === 'primary'
                    ? 'text-emerald-500'
                    : 'text-amber-500',
                )}
              />
              <span className="text-sm font-semibold text-gray-700">
                {forecast.accuracy_label} accuracy
              </span>
            </div>

            {/* Next month forecast */}
            {nextPredicted != null && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Next period forecast</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrencyCompact(nextPredicted)}
                </p>
                {forecastGrowth != null && (
                  <p className={clsx(
                    'text-xs font-semibold mt-0.5',
                    forecastGrowth >= 0 ? 'text-emerald-600' : 'text-red-500',
                  )}>
                    {forecastGrowth >= 0 ? '+' : ''}{forecastGrowth.toFixed(1)}% vs last period
                  </p>
                )}
              </div>
            )}

            {/* Error metrics */}
            <div className="grid grid-cols-2 gap-3">
              {forecast.mae != null && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">MAE</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">
                    {formatCurrencyCompact(forecast.mae)}
                  </p>
                </div>
              )}
              {forecast.rmse != null && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">RMSE</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">
                    {formatCurrencyCompact(forecast.rmse)}
                  </p>
                </div>
              )}
            </div>

            {/* Commentary */}
            {forecast.commentary && (
              <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                {forecast.commentary}
              </p>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
