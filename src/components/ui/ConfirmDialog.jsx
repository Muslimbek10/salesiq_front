import { AlertTriangle } from 'lucide-react';
import { Modal }   from './Modal';
import { Button }  from './Button';

/**
 * Delete / destructive action confirmation dialog.
 *
 * @param {boolean}  open
 * @param {function} onClose
 * @param {function} onConfirm
 * @param {boolean}  loading
 * @param {string}   title
 * @param {string}   message
 * @param {string}   confirmLabel
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  title   = 'Confirm Delete',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmLabel = 'Delete',
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <Modal.Body>
        <div className="flex gap-4">
          <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <p className="text-sm text-gray-600 leading-relaxed pt-1.5">{message}</p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
