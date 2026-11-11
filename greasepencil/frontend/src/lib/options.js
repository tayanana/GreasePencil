/** Keep these lists aligned with backend/src/domain/validate.js. */

export const FUELS = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'electric', label: 'Electric' },
  { value: 'other', label: 'Other' },
];

export const CATEGORIES = [
  { value: 'engine', label: 'Engine' },
  { value: 'filters', label: 'Filters' },
  { value: 'brakes', label: 'Brakes' },
  { value: 'fluids', label: 'Fluids' },
  { value: 'ignition', label: 'Ignition' },
  { value: 'cooling', label: 'Cooling' },
  { value: 'chassis', label: 'Chassis' },
  { value: 'other', label: 'Other' },
];

export function labelFor(options, value) {
  return options.find((option) => option.value === value)?.label || value || '—';
}
