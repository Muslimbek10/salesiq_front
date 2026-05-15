/**
 * Shared formatting utilities.
 * All functions handle null/undefined gracefully.
 */

// ── Currency ────────────────────────────────────────────────────────────────

/**
 * Format a number as USD currency.
 * formatCurrency(1234.5) → "$1,234.50"
 */
export function formatCurrency(value, opts = {}) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  }).format(Number(value));
}

/**
 * Compact currency for KPI cards.
 * formatCurrencyCompact(1_234_567) → "$1.23M"
 */
export function formatCurrencyCompact(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  if (Math.abs(n) >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)
    return `$${(n / 1_000).toFixed(1)}K`;
  return formatCurrency(n);
}

// ── Numbers ─────────────────────────────────────────────────────────────────

/**
 * Format a plain number with thousands separators.
 * formatNumber(1234567) → "1,234,567"
 */
export function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-US').format(Number(value));
}

/**
 * Format a percentage.
 * formatPercent(12.345) → "12.35%"
 */
export function formatPercent(value, decimals = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Format a growth rate with sign.
 * formatGrowth(12.3) → "+12.30%"
 * formatGrowth(-5.1) → "-5.10%"
 */
export function formatGrowth(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

// ── Dates ────────────────────────────────────────────────────────────────────

/**
 * Format an ISO date string to a readable date.
 * formatDate("2025-11-15") → "Nov 15, 2025"
 */
export function formatDate(isoString) {
  if (!isoString) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoString));
}

/**
 * Format an ISO date-time string.
 * formatDateTime("2025-11-15T14:30:00") → "Nov 15, 2025, 2:30 PM"
 */
export function formatDateTime(isoString) {
  if (!isoString) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoString));
}

/**
 * Format YYYY-MM to readable month label.
 * formatMonth("2025-11") → "Nov 2025"
 */
export function formatMonth(yyyyMm) {
  if (!yyyyMm) return '—';
  const [year, month] = yyyyMm.split('-');
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
  }).format(new Date(Number(year), Number(month) - 1, 1));
}

/**
 * Return today's date in YYYY-MM-DD format.
 */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Return a date N days ago in YYYY-MM-DD format.
 */
export function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
