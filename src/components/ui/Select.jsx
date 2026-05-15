import clsx from 'clsx';
import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Styled <select> wrapper.
 *
 * <Select label="Status" options={[{value:'active',label:'Active'}]} {...register('status')} />
 */
export const Select = forwardRef(function Select(
  { label, error, hint, options = [], placeholder, className, id, ...rest },
  ref,
) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'block w-full appearance-none rounded-lg border bg-white',
            'text-sm text-gray-900 pl-3 pr-9 py-2',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
            'transition-colors duration-150',
            'disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60',
            error ? 'border-red-400' : 'border-gray-300',
          )}
          {...rest}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
});
