export const APP_NAME = import.meta.env.VITE_APP_NAME || 'SalesIQ';

// ── Auth ─────────────────────────────────────────────────────────────────────
export const TOKEN_KEY   = 'access_token';
export const REFRESH_KEY = 'refresh_token';
export const USER_KEY    = 'user';

// ── User roles ────────────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN:    'admin',
  MANAGER:  'manager',
  ANALYST:  'analyst',
};

// ── Priority colours (Tailwind classes) ──────────────────────────────────────
export const PRIORITY_CLASSES = {
  HIGH:   'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW:    'bg-blue-100 text-blue-700',
};

// ── Customer types ────────────────────────────────────────────────────────────
export const CUSTOMER_TYPES = ['Retail', 'Wholesale', 'VIP', 'Corporate'];

// ── Default date-range: last 12 months ───────────────────────────────────────
export const DEFAULT_DATE_RANGE_DAYS = 365;

// ── Pagination ────────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20;
