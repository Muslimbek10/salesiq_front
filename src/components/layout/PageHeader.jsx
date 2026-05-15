import clsx from 'clsx';

/**
 * Section header used at the top of page content.
 *
 * <PageHeader
 *   title="Sales"
 *   subtitle="All transactions for the selected period"
 *   action={<Button>+ Add Sale</Button>}
 * />
 */
export function PageHeader({ title, subtitle, action, className, children }) {
  return (
    <div
      className={clsx(
        'flex flex-wrap items-start justify-between gap-4 mb-6',
        className,
      )}
    >
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
