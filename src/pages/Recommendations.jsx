/**
 * Recommendations page
 * Full list of AI-generated business recommendations with
 * priority filtering, dismiss / reactivate actions, and on-demand generation.
 */
import { useState }                              from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lightbulb, RefreshCw, CheckCircle, XCircle,
  RotateCcw, TrendingUp, Package, AlertTriangle, Users, BarChart2,
} from 'lucide-react';
import clsx from 'clsx';

import {
  getRecommendations, generateRecommendations,
  dismissRecommendation, reactivateRecommendation,
} from '@/api/recommendations';

import { PageHeader }    from '@/components/layout/PageHeader';
import { Button }        from '@/components/ui/Button';
import { Select }        from '@/components/ui/Select';
import { Card }          from '@/components/ui/Card';
import { Badge }         from '@/components/ui/Badge';
import { EmptyState }    from '@/components/ui/EmptyState';
import { Spinner }       from '@/components/ui/Spinner';
import { Alert }         from '@/components/ui/Alert';
import { Pagination }    from '@/components/ui/Pagination';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast }         from '@/hooks/useToast';
import { formatDate }       from '@/utils/formatters';
import { parseApiError }    from '@/utils/api';

const PAGE_SIZE = 20;

// ── Config ─────────────────────────────────────────────────────────────────────
const PRIORITY_VARIANT = { High: 'danger', Medium: 'warning', Low: 'info' };
const PRIORITY_DOT     = { High: 'bg-red-500', Medium: 'bg-amber-500', Low: 'bg-blue-500' };

const TYPE_CONFIG = {
  restock:              { icon: Package,     label: 'Restock',          color: 'text-amber-600' },
  promote:              { icon: TrendingUp,  label: 'Promote',          color: 'text-indigo-600' },
  discount:             { icon: BarChart2,   label: 'Discount',         color: 'text-emerald-600' },
  investigate:          { icon: AlertTriangle,label: 'Investigate',     color: 'text-red-600' },
  expand:               { icon: Users,       label: 'Expand',           color: 'text-violet-600' },
  operational:          { icon: CheckCircle, label: 'Operational',      color: 'text-sky-600' },
};

function getTypeConfig(type) {
  return TYPE_CONFIG[type] ?? { icon: Lightbulb, label: type, color: 'text-gray-500' };
}

// ── Summary strip ──────────────────────────────────────────────────────────────
function SummaryStrip({ data }) {
  const total  = data?.count ?? 0;
  const active = (data?.results ?? []).filter((r) => r.is_active).length;
  const high   = (data?.results ?? []).filter((r) => r.priority_level === 'High').length;

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Total',       value: total,  color: 'text-gray-900' },
        { label: 'Active',      value: active, color: 'text-indigo-600' },
        { label: 'High Priority', value: high, color: 'text-red-600' },
      ].map((s) => (
        <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center">
          <p className={clsx('text-3xl font-bold', s.color)}>{s.value}</p>
          <p className="text-xs text-gray-400 mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Recommendation card ────────────────────────────────────────────────────────
function RecommendationCard({ rec, onDismiss, onReactivate, dismissing, reactivating }) {
  const cfg      = getTypeConfig(rec.recommendation_type);
  const TypeIcon = cfg.icon;
  const dotColor = PRIORITY_DOT[rec.priority_level] ?? 'bg-gray-400';

  return (
    <div className={clsx(
      'rounded-xl border bg-white p-5 shadow-sm transition-all',
      rec.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60',
    )}>
      <div className="flex items-start gap-4">
        {/* Type icon */}
        <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
          <TypeIcon size={18} className={cfg.color} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={clsx('block h-2 w-2 rounded-full shrink-0 mt-0.5', dotColor)} />
            <Badge variant={PRIORITY_VARIANT[rec.priority_level] ?? 'default'}>
              {rec.priority_level}
            </Badge>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {cfg.label}
            </span>
            {rec.related_entity_name && (
              <span className="ml-auto text-xs font-semibold text-gray-700 truncate max-w-[160px]">
                {rec.related_entity_name}
              </span>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-gray-700 leading-relaxed">{rec.recommendation_text}</p>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">
              Generated {formatDate(rec.generated_at)}
              {!rec.is_active && rec.dismissed_at && ` · Dismissed ${formatDate(rec.dismissed_at)}`}
            </span>
            <div className="flex items-center gap-2">
              {rec.is_active ? (
                <Button
                  variant="ghost"
                  size="xs"
                  leftIcon={<XCircle size={13} />}
                  onClick={() => onDismiss(rec.id)}
                  loading={dismissing}
                >
                  Dismiss
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="xs"
                  leftIcon={<RotateCcw size={13} />}
                  onClick={() => onReactivate(rec.id)}
                  loading={reactivating}
                >
                  Reactivate
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Recommendations() {
  useDocumentTitle('Recommendations');
  const { toast }   = useToast();
  const queryClient = useQueryClient();

  const [page,     setPage]     = useState(1);
  const [priority, setPriority] = useState('');
  const [type,     setType]     = useState('');
  const [status,   setStatus]   = useState('true');  // 'true' = active, 'false' = dismissed, '' = all

  const params = {
    page, page_size: PAGE_SIZE,
    ...(priority && { priority_level: priority }),
    ...(type     && { recommendation_type: type }),
    ...(status   && { is_active: status }),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['recommendations', params],
    queryFn:  () => getRecommendations(params),
    keepPreviousData: true,
    staleTime: 30_000,
  });

  const recs       = data?.results     ?? [];
  const totalPages = data?.total_pages ?? 1;
  const count      = data?.count       ?? 0;

  function invalidate() { queryClient.invalidateQueries({ queryKey: ['recommendations'] }); }

  const generateMut = useMutation({
    mutationFn: generateRecommendations,
    onSuccess: (d) => {
      toast.success(`Generated ${d.total_created ?? 0} new recommendation(s).`);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['dashboard-recs'] });
    },
    onError: (e) => toast.error(parseApiError(e)),
  });

  const [dismissingId,    setDismissingId]    = useState(null);
  const [reactivatingId,  setReactivatingId]  = useState(null);

  const dismissMut = useMutation({
    mutationFn: (id) => { setDismissingId(id); return dismissRecommendation(id); },
    onSuccess: () => { toast.success('Recommendation dismissed.'); setDismissingId(null); invalidate(); },
    onError: (e) => { toast.error(parseApiError(e)); setDismissingId(null); },
  });

  const reactivateMut = useMutation({
    mutationFn: (id) => { setReactivatingId(id); return reactivateRecommendation(id); },
    onSuccess: () => { toast.success('Recommendation reactivated.'); setReactivatingId(null); invalidate(); },
    onError: (e) => { toast.error(parseApiError(e)); setReactivatingId(null); },
  });

  function resetFilters() { setPriority(''); setType(''); setStatus('true'); setPage(1); }
  const hasFilters = priority || type || status !== 'true';

  const typeOptions = Object.entries(TYPE_CONFIG).map(([v, c]) => ({ value: v, label: c.label }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recommendations"
        subtitle="AI-generated business recommendations"
        action={
          <Button
            leftIcon={<RefreshCw size={15} />}
            onClick={() => generateMut.mutate()}
            loading={generateMut.isPending}
          >
            Generate New
          </Button>
        }
      />

      {generateMut.isError && <Alert type="error" title="Generation failed">{parseApiError(generateMut.error)}</Alert>}
      {isError             && <Alert type="error" title="Failed to load recommendations" />}

      <SummaryStrip data={data} />

      <Card>
        {/* Filters */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: 'true',  label: 'Active' },
              { value: 'false', label: 'Dismissed' },
              { value: '',      label: 'All' },
            ]}
            className="w-36"
          />
          <Select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All priorities' }, { value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' }]}
            className="w-40"
          />
          <Select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All types' }, ...typeOptions]}
            className="w-44"
          />
          {hasFilters && (
            <button onClick={resetFilters} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              Reset filters
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">{count} result{count !== 1 ? 's' : ''}</span>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : recs.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="No recommendations found"
            message={hasFilters ? 'Try adjusting filters.' : 'Click "Generate New" to run the recommendation engine.'}
            action={!hasFilters && (
              <Button onClick={() => generateMut.mutate()} loading={generateMut.isPending} leftIcon={<RefreshCw size={14} />}>
                Generate Now
              </Button>
            )}
          />
        ) : (
          <div className="p-5 space-y-4">
            {recs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                onDismiss={(id) => dismissMut.mutate(id)}
                onReactivate={(id) => reactivateMut.mutate(id)}
                dismissing={dismissingId === rec.id && dismissMut.isPending}
                reactivating={reactivatingId === rec.id && reactivateMut.isPending}
              />
            ))}
            <div className="pt-2 border-t border-gray-100">
              <Pagination page={page} totalPages={totalPages} count={count} pageSize={PAGE_SIZE} onPage={setPage} />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
