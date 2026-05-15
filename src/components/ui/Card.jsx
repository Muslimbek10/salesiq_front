import clsx from 'clsx';

/**
 * Base card container.
 *
 * <Card>
 *   <Card.Header title="Sales" action={<Button>Add</Button>} />
 *   <Card.Body>…</Card.Body>
 *   <Card.Footer>…</Card.Footer>
 * </Card>
 */
export function Card({ className, children, ...rest }) {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-gray-200 shadow-sm',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ title, subtitle, action, className }) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between px-6 py-4 border-b border-gray-100',
        className,
      )}
    >
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

Card.Body = function CardBody({ className, children }) {
  return (
    <div className={clsx('px-6 py-4', className)}>{children}</div>
  );
};

Card.Footer = function CardFooter({ className, children }) {
  return (
    <div
      className={clsx(
        'px-6 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl',
        className,
      )}
    >
      {children}
    </div>
  );
};
