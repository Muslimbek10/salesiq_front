import clsx from 'clsx';
import { forwardRef } from 'react';

/**
 * Controlled text input with optional label, helper text and error state.
 *
 * <Input label="Email" type="email" error={errors.email} {...register('email')} />
 */
export const Input = forwardRef(function Input(
  { label, error, hint, leftIcon, rightIcon, className, id, ...rest },
  ref,
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'block w-full rounded-lg border bg-white text-sm text-gray-900',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
            'transition-colors duration-150',
            'disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60',
            leftIcon  ? 'pl-9'  : 'pl-3',
            rightIcon ? 'pr-9'  : 'pr-3',
            'py-2',
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-gray-300',
          )}
          {...rest}
        />

        {rightIcon && (
          <span className="absolute inset-y-0 right-3 flex items-center text-gray-400">
            {rightIcon}
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
});
