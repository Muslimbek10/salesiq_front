import { useNavigate } from 'react-router-dom';
import { Bell, ArrowRight, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { Card }       from '@/components/ui/Card';
import { Badge }      from '@/components/ui/Badge';
import { Button }     from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner }    from '@/components/ui/Spinner';
import { formatDateTime } from '@/utils/formatters';

const ALERT_TYPE_LABELS = {
  low_stock:               'Low Stock',
  declining_sales:         'Declining Sales',
  branch_underperformance: 'Branch',
  sales_drop:              'Sales Drop',
  forecast_risk:           'Forecast Risk',
  high_demand:             'High Demand',
};

const PRIORITY_VARIANT = {
  High:   'danger',
  Medium: 'warning',
  Low:    'info',
};

// Icon backgrounds per priority
const PRIORITY_BG = {
  High:   'bg-red-50',
  Medium: 'bg-amber-50',
  Low:    'bg-blue-50',
};
const PRIORITY_DOT = {
  High:   'bg-red-500',
  Medium: 'bg-amber-500',
  Low:    'bg-blue-500',
};

/**
 * @param {object[]} alerts
 * @param {number}   total
 * @param {boolean}  loading
 * @param {function} onGenerate
 * @param {boolean}  generating
 */
export function AlertsPreview({
  alerts    = [],
  total     = 0,
  loading   = false,
  onGenerate,
  generating = false,
}) {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col">
      <Card.Header
        title="Active Alerts"
        subtitle={total > 0 ? `${total} requiring attention` : 'All clear'}
        action={
          <div className="flex items-center gap-2">
            {onGenerate && (
              <Button
                variant="ghost"
                size="xs"
                onClick={onGenerate}
                loading={generating}
                leftIcon={!generating && <RefreshCw size={12} />}
                title="Re-run alert engine"
              >
                {generating ? 'Running…' : 'Scan'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/alerts')}
              rightIcon={<ArrowRight size={12} />}
            >
              View all
            </Button>
          </div>
        }
      />

      <Card.Body className="p-0 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" />
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No active alerts"
            message="Everything looks good. Run a scan to check for issues."
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </ul>
        )}
      </Card.Body>

      {!loading && alerts.length > 0 && total > alerts.length && (
        <Card.Footer>
          <button
            onClick={() => navigate('/alerts')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            +{total - alerts.length} more alerts →
          </button>
        </Card.Footer>
      )}
    </Card>
  );
}

function AlertRow({ alert }) {
  const variant   = PRIORITY_VARIANT[alert.priority_level] ?? 'default';
  const typeLabel = ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type;
  const dotColor  = PRIORITY_DOT[alert.priority_level] ?? 'bg-gray-400';

  return (
    <li className={clsx(
      'flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors',
    )}>
      {/* Priority indicator dot */}
      <div className="mt-1.5 flex-shrink-0">
        <span className={clsx('block h-2 w-2 rounded-full', dotColor)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Badge variant={variant}>{alert.priority_level}</Badge>
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
            {typeLabel}
          </span>
          {alert.related_entity_name && (
            <span className="ml-auto text-xs font-semibold text-gray-700 truncate max-w-[120px]">
              {alert.related_entity_name}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
          {alert.alert_message}
        </p>
        {alert.created_at && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            {formatDateTime(alert.created_at)}
          </p>
        )}
      </div>
    </li>
  );
}
