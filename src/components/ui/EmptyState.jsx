import clsx from 'clsx';
import { Inbox } from 'lucide-react';

/**
 * Empty-state placeholder shown inside tables or sections with no data.
 */
export function EmptyState({
  icon: Icon  = Inbox,
  title       = 'No data',
  message,
  action,
  className,
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-3 py-12 text-center',
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <Icon size={26} className="text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        {message && (
          <p className="text-xs text-gray-400 mt-1 max-w-xs">{message}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
