/**
 * API error helpers
 */

/**
 * Extract a human-readable error string from an Axios error.
 */
export function parseApiError(err) {
  const d = err?.response?.data;
  if (!d) return 'An unexpected error occurred.';
  if (typeof d === 'string') return d;
  if (d.detail) return d.detail;
  if (d.non_field_errors?.length) return d.non_field_errors[0];
  const entries = Object.entries(d);
  if (!entries.length) return 'An unexpected error occurred.';
  const [field, msgs] = entries[0];
  const msg = Array.isArray(msgs) ? msgs[0] : msgs;
  return `${field}: ${msg}`;
}

/**
 * Extract per-field error messages from an Axios error.
 * Returns { fieldName: 'first error message' }
 */
export function parseFieldErrors(err) {
  const d = err?.response?.data;
  if (!d || typeof d !== 'object') return {};
  return Object.fromEntries(
    Object.entries(d)
      .filter(([k]) => k !== 'detail' && k !== 'non_field_errors')
      .map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]),
  );
}
