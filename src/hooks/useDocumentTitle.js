import { useEffect } from 'react';
import { APP_NAME } from '@/utils/constants';

/**
 * Sets the browser tab title.
 * useDocumentTitle('Dashboard') → "Dashboard — SalesIQ"
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
