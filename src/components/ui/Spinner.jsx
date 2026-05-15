import clsx from 'clsx';

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
  xl: 'w-12 h-12 border-4',
};

/**
 * @param {'sm'|'md'|'lg'|'xl'} [size='md']
 * @param {string} [className]
 */
export function Spinner({ size = 'md', className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={clsx(
        'inline-block rounded-full border-gray-200 border-t-indigo-600 animate-spin',
        sizes[size],
        className,
      )}
    />
  );
}

/** Full-page loading overlay */
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner size="lg" />
    </div>
  );
}
