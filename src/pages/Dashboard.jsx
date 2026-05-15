/**
 * Dashboard page
 * ==============
 * Orchestrates all dashboard data fetching and renders:
 *   FilterBar → KPI Cards → Charts (2 rows) → Intelligence panel → Forecast
 */
import { useState, useCallback } from 'react';
import { useNavigate }           from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, TrendingUp, ShoppingCart,
  Package, BarChart3, Percent,
} from 'lucide-react';

import { getDashboardKPIs, getSalesTrend, getBranchAnalytics,
         getProductAnalytics, getCategoryAnalytics }    from '@/api/analytics';
import { getRecommendations, generateRecommendations }  from '@/api/recommendations';
import { getAlerts, generateAlerts }                    from '@/api/alerts';
import { getForecastHistory }                           from '@/api/forecasting';

import { KPICard }                  from '@/components/shared/KPICard';
import { FilterBar }                from '@/components/dashboard/FilterBar';
import { RevenueChart }             from '@/components/dashboard/RevenueChart';
import { BranchChart }              from '@/components/dashboard/BranchChart';
import { TopProductsChart }         from '@/components/dashboard/TopProductsChart';
import { CategoryChart }            from '@/components/dashboard/CategoryChart';
import { RecommendationsPreview }   from '@/components/dashboard/RecommendationsPreview';
import { AlertsPreview }            from '@/components/dashboard/AlertsPreview';
import { ForecastWidget }           from '@/components/dashboard/ForecastWidget';
import { Alert }                    from '@/components/ui/Alert';
import { useDocumentTitle }         from '@/hooks/useDocumentTitle';
import { useToast }                 from '@/hooks/useToast';
import {
  formatCurrencyCompact, formatNumber, formatPercent,
  daysAgoISO, todayISO,
} from '@/utils/formatters';

// ── Default date range: last 12 months ───────────────────────────────────────
const DEFAULTS = { dateFrom: daysAgoISO(365), dateTo: todayISO() };

// ── KPI card config (field → display) ────────────────────────────────────────
function buildKPICards(kpis = {}, loading) {
  return [
    {
      title: 'Total Revenue',
      value: formatCurrencyCompact(kpis.total_revenue?.value),
      change: kpis.total_revenue?.growth,
      icon:  DollarSign,
      color: 'indigo',
    },
    {
      title: 'Total Profit',
      value: formatCurrencyCompact(kpis.total_profit?.value),
      change: kpis.total_profit?.growth,
      icon:  TrendingUp,
      color: 'emerald',
    },
    {
      title: 'Gross Margin',
      value: formatPercent(kpis.gross_margin_pct?.value),
      change: kpis.gross_margin_pct?.growth,
      icon:  Percent,
      color: 'sky',
    },
    {
      title: 'Transactions',
      value: formatNumber(kpis.total_transactions?.value),
      change: kpis.total_transactions?.growth,
      icon:  ShoppingCart,
      color: 'violet',
    },
    {
      title: 'Units Sold',
      value: formatNumber(kpis.total_units_sold?.value),
      change: kpis.total_units_sold?.growth,
      icon:  Package,
      color: 'amber',
    },
    {
      title: 'Avg Order Value',
      value: formatCurrencyCompact(kpis.avg_order_value?.value),
      change: kpis.avg_order_value?.growth,
      icon:  BarChart3,
      color: 'rose',
    },
  ].map((card) => ({ ...card, loading }));
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { toast }     = useToast();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();

  const [dates, setDates] = useState(DEFAULTS);
  const params = { date_from: dates.dateFrom, date_to: dates.dateTo };

  // ── Data queries ────────────────────────────────────────────────────────────
  const kpiQuery = useQuery({
    queryKey: ['dashboard-kpis', dates],
    queryFn:  () => getDashboardKPIs(params),
    staleTime: 2 * 60_000,
  });

  const trendQuery = useQuery({
    queryKey: ['dashboard-trend', dates],
    queryFn:  () => getSalesTrend({ ...params, granularity: 'monthly' }),
    staleTime: 2 * 60_000,
  });

  const branchQuery = useQuery({
    queryKey: ['dashboard-branches', dates],
    queryFn:  () => getBranchAnalytics(params),
    staleTime: 2 * 60_000,
  });

  const productQuery = useQuery({
    queryKey: ['dashboard-products', dates],
    queryFn:  () => getProductAnalytics({ ...params, limit: 8 }),
    staleTime: 2 * 60_000,
  });

  const categoryQuery = useQuery({
    queryKey: ['dashboard-categories', dates],
    queryFn:  () => getCategoryAnalytics(params),
    staleTime: 2 * 60_000,
  });

  const recQuery = useQuery({
    queryKey: ['dashboard-recs'],
    queryFn:  () => getRecommendations({ is_active: true, page_size: 5 }),
    staleTime: 60_000,
  });

  const alertQuery = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn:  () => getAlerts({ is_active: true, page_size: 5 }),
    staleTime: 60_000,
  });

  const forecastQuery = useQuery({
    queryKey: ['dashboard-forecast'],
    queryFn:  () => getForecastHistory({ target_type: 'overall', page_size: 1 }),
    staleTime: 5 * 60_000,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const genRecsMutation = useMutation({
    mutationFn: () => generateRecommendations(),
    onSuccess: (data) => {
      toast.success(`Generated ${data.total_created ?? 0} recommendation(s).`);
      queryClient.invalidateQueries({ queryKey: ['dashboard-recs'] });
    },
    onError: () => toast.error('Failed to generate recommendations.'),
  });

  const genAlertsMutation = useMutation({
    mutationFn: () => generateAlerts(),
    onSuccess: (data) => {
      toast.success(`Scanned: ${data.total_created ?? 0} new alert(s).`);
      queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-counts'] });
    },
    onError: () => toast.error('Failed to scan alerts.'),
  });

  const handleDateChange = useCallback((d) => setDates(d), []);

  // ── Any fatal error ─────────────────────────────────────────────────────────
  const hasError = kpiQuery.isError || trendQuery.isError;

  // ── Data extraction ─────────────────────────────────────────────────────────
  const kpis          = kpiQuery.data?.kpis ?? {};
  const trendSeries   = trendQuery.data?.series ?? [];
  const branches      = branchQuery.data?.branches ?? [];
  const topProducts   = productQuery.data?.top_products ?? [];
  const categories    = categoryQuery.data?.categories ?? [];
  const recommendations = recQuery.data?.results ?? [];
  const recsTotal       = recQuery.data?.count ?? 0;
  const alerts          = alertQuery.data?.results ?? [];
  const alertsTotal     = alertQuery.data?.count ?? 0;
  const latestForecast  = forecastQuery.data?.results?.[0] ?? null;

  const anyLoading =
    kpiQuery.isLoading || trendQuery.isLoading ||
    branchQuery.isLoading || productQuery.isLoading || categoryQuery.isLoading;

  const kpiCards = buildKPICards(kpis, kpiQuery.isLoading);

  return (
    <div className="space-y-6">

      {/* ── Filters ── */}
      <FilterBar
        dateFrom={dates.dateFrom}
        dateTo={dates.dateTo}
        onChange={handleDateChange}
        loading={anyLoading}
      />

      {/* ── Error banner ── */}
      {hasError && (
        <Alert type="error" title="Failed to load dashboard data">
          Verify the backend is running on port 8000 and the database is seeded.
        </Alert>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map((card) => (
          <KPICard key={card.title} {...card} />
        ))}
      </div>

      {/* ── Row 1: Revenue trend (2/3) + Branch performance (1/3) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart
            series={trendSeries}
            loading={trendQuery.isLoading}
          />
        </div>
        <div>
          <BranchChart
            branches={branches}
            loading={branchQuery.isLoading}
          />
        </div>
      </div>

      {/* ── Row 2: Top products (1/2) + Category donut (1/2) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopProductsChart
          products={topProducts}
          loading={productQuery.isLoading}
        />
        <CategoryChart
          categories={categories}
          loading={categoryQuery.isLoading}
        />
      </div>

      {/* ── Row 3: Recommendations + Alerts ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecommendationsPreview
          recommendations={recommendations}
          total={recsTotal}
          loading={recQuery.isLoading}
          onGenerate={() => genRecsMutation.mutate()}
          generating={genRecsMutation.isPending}
        />
        <AlertsPreview
          alerts={alerts}
          total={alertsTotal}
          loading={alertQuery.isLoading}
          onGenerate={() => genAlertsMutation.mutate()}
          generating={genAlertsMutation.isPending}
        />
      </div>

      {/* ── Row 4: Forecast widget (full width) ── */}
      <ForecastWidget
        forecast={latestForecast}
        loading={forecastQuery.isLoading}
        onRunForecast={() => navigate('/forecasting')}
      />

      {/* ── Period footnote ── */}
      <p className="text-right text-xs text-gray-400">
        Showing data for {dates.dateFrom} — {dates.dateTo}
      </p>
    </div>
  );
}
