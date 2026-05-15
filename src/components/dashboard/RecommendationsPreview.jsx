import { useNavigate } from 'react-router-dom';
import { Lightbulb, ArrowRight, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { Card }       from '@/components/ui/Card';
import { Badge }      from '@/components/ui/Badge';
import { Button }     from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner }    from '@/components/ui/Spinner';
import { formatDateTime } from '@/utils/formatters';

// Map backend type values to readable labels
const TYPE_LABELS = {
  restock:             'Restock',
  declining_sales:     'Declining Sales',
  branch_performance:  'Branch',
  category_promotion:  'Category',
  customer_retention:  'Customer',
  forecast_risk:       'Forecast',
  high_performer:      'High Performer',
  cost_optimization:   'Cost',
};

// Map priority_level → Badge variant
const PRIORITY_VARIANT = {
  High:   'danger',
  Medium: 'warning',
  Low:    'info',
};

/**
 * @param {object[]} recommendations
 * @param {number}   total             — full count from API
 * @param {boolean}  loading
 * @param {function} onGenerate        — trigger rule engine
 * @param {boolean}  generating        — generate button loading state
 */
export function RecommendationsPreview({
  recommendations = [],
  total     = 0,
  loading   = false,
  onGenerate,
  generating = false,
}) {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col">
      <Card.Header
        title="Recommendations"
        subtitle={total > 0 ? `${total} active` : 'No active recommendations'}
        action={
          <div className="flex items-center gap-2">
            {onGenerate && (
              <Button
                variant="ghost"
                size="xs"
                onClick={onGenerate}
                loading={generating}
                leftIcon={!generating && <RefreshCw size={12} />}
                title="Re-run recommendation engine"
              >
                {generating ? 'Running…' : 'Run'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/recommendations')}
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
        ) : recommendations.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="No active recommendations"
            message="Run the engine to generate insights."
            action={
              onGenerate && (
                <Button variant="secondary" size="sm" onClick={onGenerate} loading={generating}>
                  Run engine
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {recommendations.map((rec) => (
              <RecommendationRow key={rec.id} rec={rec} />
            ))}
          </ul>
        )}
      </Card.Body>

      {!loading && recommendations.length > 0 && total > recommendations.length && (
        <Card.Footer>
          <button
            onClick={() => navigate('/recommendations')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            +{total - recommendations.length} more recommendations →
          </button>
        </Card.Footer>
      )}
    </Card>
  );
}

function RecommendationRow({ rec }) {
  const variant = PRIORITY_VARIANT[rec.priority_level] ?? 'default';
  const typeLabel = TYPE_LABELS[rec.recommendation_type] ?? rec.recommendation_type;

  return (
    <li className="flex flex-col gap-1.5 px-5 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={variant} dot>
          {rec.priority_level}
        </Badge>
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
          {typeLabel}
        </span>
        {rec.related_entity_name && (
          <span className="text-xs font-semibold text-gray-700 ml-auto truncate max-w-[120px]">
            {rec.related_entity_name}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
        {rec.recommendation_text}
      </p>
      {rec.generated_at && (
        <p className="text-[10px] text-gray-400">
          {formatDateTime(rec.generated_at)}
        </p>
      )}
    </li>
  );
}
