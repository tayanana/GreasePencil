/** Presentation helpers. Status numbers come from the API; this file only formats them. */

export function formatPartNumber(value) {
  if (!value) return '';
  const compact = String(value).replace(/\s+/g, '').toUpperCase();
  const mercedes = compact.match(/^A?(\d{10})$/);
  if (!mercedes) return String(value).trim();
  const digits = mercedes[1];
  return `A ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
}

export function formatMileage(value, unit) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const label = unit === 'mi' ? 'mi' : 'km';
  return `${new Intl.NumberFormat('en-GB').format(value)} ${label}`;
}

export function formatDistance(value, unit) {
  if (value == null) return null;
  const label = unit === 'mi' ? 'mi' : 'km';
  const formatted = new Intl.NumberFormat('en-GB').format(Math.abs(value));
  if (value < 0) return `${formatted} ${label} over`;
  if (value === 0) return `due at this ${label === 'mi' ? 'mileage' : 'odometer'}`;
  return `${formatted} ${label} left`;
}

export function formatDays(value) {
  if (value == null) return null;
  if (value < 0) return `${Math.abs(value)} days over`;
  if (value === 0) return 'due today';
  return `${value} days left`;
}

export function describeRemaining(status, unit) {
  const bits = [formatDistance(status?.distanceRemaining, unit), formatDays(status?.daysRemaining)].filter(Boolean);
  return bits.length ? bits.join(' · ') : 'No service recorded yet';
}

export function formatDate(iso) {
  if (!iso) return '—';
  const [year, month, day] = String(iso).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatMoney(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
}

export function formatJobCost(laborCents, partsCents) {
  if (!laborCents && !partsCents) return 'Cost not recorded';
  return formatMoney((laborCents || 0) + (partsCents || 0));
}

/** Whole cents, up to two decimal places. Returns null when the text is not a price. */
export function dollarsToCents(value) {
  if (value == null || String(value).trim() === '') return 0;
  const normalized = String(value).trim().replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (cents > 10_000_000) return null;
  return cents;
}

export function statusLabel(state) {
  switch (state) {
    case 'overdue':
      return 'Overdue';
    case 'due_now':
      return 'Due now';
    case 'due_soon':
      return 'Due soon';
    case 'ok':
      return 'On track';
    default:
      return 'No history';
  }
}

export function localToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
