import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Accessible modal dialog rendered via createPortal.
 *
 * @param {boolean}   open
 * @param {function}  onClose
 * @param {string}    title
 * @param {'sm'|'md'|'lg'|'xl'} size
 * @param {ReactNode} children
 */
export function Modal({ open, onClose, title, size = 'md', children }) {
  const overlayRef = useRef(null);

  // ESC key closes
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={clsx(
          'relative z-10 w-full rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]',
          SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <h2 id="modal-title" className="text-base font-semibold text-gray-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

Modal.Body = function ModalBody({ children, className }) {
  return (
    <div className={clsx('px-6 py-5', className)}>
      {children}
    </div>
  );
};

Modal.Footer = function ModalFooter({ children, className }) {
  return (
    <div className={clsx(
      'flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0',
      className,
    )}>
      {children}
    </div>
  );
};
