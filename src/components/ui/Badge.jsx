import clsx from 'clsx';

const variants = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-indigo-100 text-indigo-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger:  'bg-red-100 text-red-700',
  info:    'bg-blue-100 text-blue-700',
};

const dots = {
  default: 'bg-gray-400',
  primary: 'bg-indigo-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  info:    'bg-blue-500',
};

/**
 * @param {'default'|'primary'|'success'|'warning'|'danger'|'info'} [variant='default']
 * @param {boolean} [dot] — show a coloured dot on the left
 */
export function Badge({ variant = 'default', dot = false, className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5',
        'text-xs font-medium rounded-full whitespace-nowrap',
        variants[variant],
        className,
      )}
    >
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dots[variant])} />
      )}
      {children}
    </span>
  );
}
