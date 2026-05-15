/**
 * Alerts page
 * Full list of system alerts with priority/type filtering,
 * dismiss action, and on-demand scan (generate).
 */
import { useState }                              from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, RefreshCw, XCircle, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

import { getAlerts, generateAlerts, dismissAlert } from '@/api/alerts';

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
import { formatDateTime }   from '@/utils/formatters';
import { parseApiError }    from '@/utils/api';

const PAGE_SIZE = 25;

const PRIORITY_VARIANT = { High: 'danger', Medium: 'warning', Low: 'info' };
const PRIORITY_DOT     = { High: 'bg-red-500', Medium: 'bg-amber-500', Low: 'bg-blue-500' };
const PRIORITY_BG      = { High: 'bg-red-50/60', Medium: 'bg-amber-50/60', Low: 'bg-blue-50/40' };

const ALERT_TYPE_LABELS = {
  low_stock:               'Low Stock',
  declining_sales:         'Declining Sales',
  branch_underperformance: 'Branch Underperformance',
  sales_drop:              'Sales Drop',
  forecast_risk:           'Forecast Risk',
  high_demand:             'High Demand',
};

// ── Priority summary bar ───────────────────────────────────────────────────────
function PrioritySummary({ data }) {
  const recs  = data?.results ?? [];
  const total = data?.count   ?? 0;
  const high  = recs.filter((a) => a.priority_level === 'High').length;
  const med   = recs.filter((a) => a.priority_level === 'Medium').length;
  const low   = recs.filter((a) => a.priority_level === 'Low').length;

  return (
    <div className="grid grid-cols-4 gap-4">
      {[
        { label: 'Total Active', value: total, dotClass: 'bg-gray-400',   textClass: 'text-gray-900' },
        { label: 'High',         value: high,  dotClass: 'bg-red-500',    textClass: 'text-red-600'  },
        { label: 'Medium',       value: med,   dotClass: 'bg-amber-500',  textClass: 'text-amber-600'},
        { label: 'Low',          value: low,   dotClass: 'bg-blue-500',   textClass: 'text-blue-600' },
      ].map((s) => (
        <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className={clsx('w-2 h-2 rounded-full', s.dotClass)} />
            <span className="text-xs text-gray-400">{s.label}</span>
          </div>
          <p className={clsx('text-3xl font-bold', s.textClass)}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Alert row ─────────────────────────────────────────────────────────────────
function AlertRow({ alert, onDismiss, dismissing }) {
  const dotColor = PRIORITY_DOT[alert.priority_level] ?? 'bg-gray-400';
  const rowBg    = PRIORITY_BG[alert.priority_level]  ?? '';
  const typeLabel = ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type;

  return (
    <div className={clsx('flex items-start gap-4 px-5 py-4 border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50', rowBg)}>
      {/* Priority dot */}
      <div className="flex-shrink-0 mt-1">
        <span className={clsx('block h-2.5 w-2.5 rounded-full', dotColor)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <Badge variant={PRIORITY_VARIANT[alert.priority_level] ?? 'default'}>
            {alert.priority_level}
          </Badge>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {typeLabel}
          </span>
          {alert.related_entity_name && (
            <span className="text-xs font-semibold text-gray-700 truncate max-w-[160px]">
              {alert.related_entity_name}
            </span>
          )}
          <span className="ml-auto text-[10px] text-gray-400 shrink-0">
            {formatDateTime(alert.created_at)}
          </span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{alert.alert_message}</p>
      </div>

      {alert.is_active && (
        <button
          onClick={() => onDismiss(alert.id)}
          disabled={dismissing}
          className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40 mt-0.5"
          title="Dismiss alert"
        >
          {dismissing ? <Spinner size="xs" /> : <XCircle size={15} />}
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Alerts() {
  useDocumentTitle('Alerts');
  const { toast }   = useToast();
  const queryClient = useQueryClient();

  const [page,     setPage]     = useState(1);
  const [priority, setPriority] = useState('');
  const [type,     setType]     = useState('');
  const [status,   setStatus]   = useState('true');

  const params = {
    page, page_size: PAGE_SIZE,
    ...(priority && { priority_level: priority }),
    ...(type     && { alert_type: type }),
    ...(status   && { is_active: status }),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['alerts', params],
    queryFn:  () => getAlerts(params),
    keepPreviousData: true,
    staleTime: 30_000,
  });

  const alerts     = data?.results     ?? [];
  const totalPages = data?.total_pages ?? 1;
  const count      = data?.count       ?? 0;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['alert-counts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
  }

  const generateMut = useMutation({
    mutationFn: generateAlerts,
    onSuccess: (d) => {
      toast.success(`Scan complete — ${d.total_created ?? 0} new alert(s) found.`);
      invalidate();
    },
    onError: (e) => toast.error(parseApiError(e)),
  });

  const [dismissingId, setDismissingId] = useState(null);
  const dismissMut = useMutation({
    mutationFn: (id) => { setDismissingId(id); return dismissAlert(id); },
    onSuccess: () => { toast.success('Alert dismissed.'); setDismissingId(null); invalidate(); },
    onError: (e) => { toast.error(parseApiError(e)); setDismissingId(null); },
  });

  function resetFilters() { setPriority(''); setType(''); setStatus('true'); setPage(1); }
  const hasFilters = priority || type || status !== 'true';

  const typeOptions = Object.entries(ALERT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        subtitle="System-generated business alerts"
        action={
          <Button
            leftIcon={<ShieldAlert size={15} />}
            onClick={() => generateMut.mutate()}
            loading={generateMut.isPending}
          >
            Run Scan
          </Button>
        }
      />

      {generateMut.isError && <Alert type="error" title="Scan failed">{parseApiError(generateMut.error)}</Alert>}
      {isError             && <Alert type="error" title="Failed to load alerts" />}

      <PrioritySummary data={data} />

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
            options={[
              { value: '', label: 'All priorities' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' },
            ]}
            className="w-40"
          />
          <Select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All types' }, ...typeOptions]}
            className="w-52"
          />
          {hasFilters && (
            <button onClick={resetFilters} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              Reset filters
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">{count} alert{count !== 1 ? 's' : ''}</span>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={status === 'true' ? 'No active alerts' : 'No alerts found'}
            message={hasFilters ? 'Try adjusting filters.' : 'Run a scan to check for new issues.'}
            action={!hasFilters && (
              <Button onClick={() => generateMut.mutate()} loading={generateMut.isPending} leftIcon={<RefreshCw size={14} />}>
                Run Scan
              </Button>
            )}
          />
        ) : (
          <>
            {alerts.map((a) => (
              <AlertRow
                key={a.id}
                alert={a}
                onDismiss={(id) => dismissMut.mutate(id)}
                dismissing={dismissingId === a.id && dismissMut.isPending}
              />
            ))}
            <div className="px-5 border-t border-gray-100">
              <Pagination page={page} totalPages={totalPages} count={count} pageSize={PAGE_SIZE} onPage={setPage} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
