import clsx from 'clsx';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const config = {
  success: {
    wrapper: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    icon:    CheckCircle,
    iconCls: 'text-emerald-500',
  },
  error: {
    wrapper: 'bg-red-50 border-red-300 text-red-800',
    icon:    XCircle,
    iconCls: 'text-red-500',
  },
  warning: {
    wrapper: 'bg-amber-50 border-amber-300 text-amber-800',
    icon:    AlertTriangle,
    iconCls: 'text-amber-500',
  },
  info: {
    wrapper: 'bg-blue-50 border-blue-300 text-blue-800',
    icon:    Info,
    iconCls: 'text-blue-500',
  },
};

/**
 * Inline alert banner.
 *
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {string} [title]
 * @param {function} [onClose]
 */
export function Alert({ type = 'info', title, onClose, className, children }) {
  const { wrapper, icon: Icon, iconCls } = config[type] ?? config.info;

  return (
    <div
      role="alert"
      className={clsx(
        'flex gap-3 px-4 py-3 rounded-lg border',
        wrapper,
        className,
      )}
    >
      <Icon size={18} className={clsx('shrink-0 mt-0.5', iconCls)} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm">{title}</p>}
        {children && (
          <p className="text-sm mt-0.5 opacity-90">{children}</p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
