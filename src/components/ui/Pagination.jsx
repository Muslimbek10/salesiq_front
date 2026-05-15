import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

/**
 * Pagination controls for paginated API responses.
 *
 * @param {number}   page         current 1-based page number
 * @param {number}   totalPages   from API response `total_pages`
 * @param {number}   count        total result count
 * @param {number}   pageSize     items per page
 * @param {function} onPage       called with new page number
 */
export function Pagination({ page, totalPages, count, pageSize, onPage }) {
  if (!totalPages || totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, count);

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-xs text-gray-500">
        {from}–{to} of {count} results
      </p>

      <div className="flex items-center gap-1">
        <PageButton
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          label="Previous"
        >
          <ChevronLeft size={15} />
        </PageButton>

        <span className="px-3 py-1.5 text-xs text-gray-600 font-medium select-none">
          {page} / {totalPages}
        </span>

        <PageButton
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          label="Next"
        >
          <ChevronRight size={15} />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({ onClick, disabled, label, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={clsx(
        'flex items-center justify-center h-7 w-7 rounded-md text-gray-500 transition-colors',
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-gray-100 hover:text-gray-700',
      )}
    >
      {children}
    </button>
  );
}
