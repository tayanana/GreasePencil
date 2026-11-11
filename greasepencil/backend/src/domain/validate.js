/**
 * Request bodies are checked here before they reach SQL.
 * The allowed fuel and category values match frontend/src/lib/options.js.
 */

import { addDaysISO, isIsoDate, todayISO } from './dates.js';

const FUELS = new Set(['petrol', 'diesel', 'hybrid', 'electric', 'other']);
const CATEGORIES = new Set(['engine', 'filters', 'brakes', 'fluids', 'ignition', 'cooling', 'chassis', 'other']);
const UNITS = new Set(['km', 'mi']);
const PERFORMERS = new Set(['diy', 'shop']);

export function validateVehicle(input) {
  const nickname = requiredText(input.nickname, 'Nickname', 80);
  if (nickname.error) return fail(nickname.error);
  const make = requiredText(input.make, 'Make', 60);
  if (make.error) return fail(make.error);
  const model = requiredText(input.model, 'Model', 60);
  if (model.error) return fail(model.error);
  const year = requiredInt(input.year, 'Year', 1950, 2035);
  if (year.error) return fail(year.error);
  const mileage = requiredInt(input.mileage, 'Odometer', 0, 2_000_000);
  if (mileage.error) return fail(mileage.error);
  const mileageUnit = input.mileageUnit ?? 'km';
  if (!UNITS.has(mileageUnit)) return fail('Choose kilometres or miles.');
  const chassisCode = optionalText(input.chassisCode, 'Chassis code', 20);
  if (chassisCode.error) return fail(chassisCode.error);
  const engineCode = optionalText(input.engineCode, 'Engine code', 24);
  if (engineCode.error) return fail(engineCode.error);
  const vin = optionalText(input.vin, 'VIN', 24);
  if (vin.error) return fail(vin.error);
  const plate = optionalText(input.plate, 'Plate', 16);
  if (plate.error) return fail(plate.error);
  const fuel = optionalChoice(input.fuel, FUELS, 'Choose a fuel type.');
  if (fuel.error) return fail(fuel.error);
  const notes = optionalText(input.notes, 'Notes', 2000);
  if (notes.error) return fail(notes.error);
  return ok({
    nickname: nickname.value,
    make: make.value,
    model: model.value,
    year: year.value,
    mileage: mileage.value,
    mileageUnit,
    chassisCode: emptyToNull(chassisCode.value),
    engineCode: emptyToNull(engineCode.value),
    vin: emptyToNull(vin.value),
    plate: emptyToNull(plate.value),
    fuel: emptyToNull(fuel.value),
    notes: notes.value ?? '',
  });
}

export function validateMileage(input) {
  const mileage = requiredInt(input.mileage, 'Odometer', 0, 2_000_000);
  if (mileage.error) return fail(mileage.error);
  let mileageUnit;
  if (input.mileageUnit !== undefined) {
    if (!UNITS.has(input.mileageUnit)) return fail('Choose kilometres or miles.');
    mileageUnit = input.mileageUnit;
  }
  return ok({ mileage: mileage.value, mileageUnit });
}

export function validateInterval(input) {
  const title = requiredText(input.title, 'Interval name', 80);
  if (title.error) return fail(title.error);
  const category = input.category ?? 'other';
  if (!CATEGORIES.has(category)) return fail('Choose a category.');
  const intervalDistance = optionalInt(input.intervalDistance, 'Distance interval', 1, 500_000);
  if (intervalDistance.error) return fail(intervalDistance.error);
  const intervalMonths = optionalInt(input.intervalMonths, 'Month interval', 1, 240);
  if (intervalMonths.error) return fail(intervalMonths.error);
  if (intervalDistance.value == null && intervalMonths.value == null) {
    return fail('Set a distance, a number of months, or both.');
  }
  const lastMileage = optionalInt(input.lastMileage, 'Last odometer', 0, 2_000_000);
  if (lastMileage.error) return fail(lastMileage.error);
  const lastPerformedOn = optionalDate(input.lastPerformedOn, 'Last service date');
  if (lastPerformedOn.error) return fail(lastPerformedOn.error);
  const partNumber = optionalText(input.partNumber, 'Part number', 40);
  if (partNumber.error) return fail(partNumber.error);
  const partName = optionalText(input.partName, 'Part name', 80);
  if (partName.error) return fail(partName.error);
  const notes = optionalText(input.notes, 'Notes', 2000);
  if (notes.error) return fail(notes.error);
  return ok({
    title: title.value,
    category,
    intervalDistance: intervalDistance.value,
    intervalMonths: intervalMonths.value,
    lastMileage: lastMileage.value,
    lastPerformedOn: lastPerformedOn.value,
    partNumber: emptyToNull(partNumber.value),
    partName: emptyToNull(partName.value),
    notes: notes.value ?? '',
  });
}

export function validatePart(input) {
  const name = requiredText(input.name, 'Part name', 80);
  if (name.error) return fail(name.error);
  const partNumber = requiredText(input.partNumber, 'Part number', 40);
  if (partNumber.error) return fail(partNumber.error);
  const brand = optionalText(input.brand, 'Brand', 60);
  if (brand.error) return fail(brand.error);
  const category = input.category ?? 'other';
  if (!CATEGORIES.has(category)) return fail('Choose a category.');
  const specification = optionalText(input.specification, 'Specification', 240);
  if (specification.error) return fail(specification.error);
  const notes = optionalText(input.notes, 'Notes', 2000);
  if (notes.error) return fail(notes.error);
  let vehicleId = null;
  if (input.vehicleId != null && input.vehicleId !== '') {
    if (typeof input.vehicleId !== 'string') return fail('Choose a vehicle.');
    vehicleId = input.vehicleId;
  }
  return ok({
    name: name.value,
    partNumber: partNumber.value,
    brand: emptyToNull(brand.value),
    category,
    specification: specification.value ?? '',
    notes: notes.value ?? '',
    vehicleId,
  });
}

export function validateServiceLog(input) {
  const title = requiredText(input.title, 'Job title', 80);
  if (title.error) return fail(title.error);
  const performedOn = optionalDate(input.performedOn, 'Service date');
  if (performedOn.error) return fail(performedOn.error);
  if (!performedOn.value) return fail('Service date is required.');
  const mileage = requiredInt(input.mileage, 'Odometer', 0, 2_000_000);
  if (mileage.error) return fail(mileage.error);
  const performer = input.performer ?? 'diy';
  if (!PERFORMERS.has(performer)) return fail('Say whether this was DIY or a shop.');
  const summary = optionalText(input.summary, 'Notes', 2000);
  if (summary.error) return fail(summary.error);
  const laborCents = requiredInt(input.laborCents ?? 0, 'Labour cost', 0, 10_000_000);
  if (laborCents.error) return fail(laborCents.error);
  let intervalId = null;
  if (input.intervalId != null && input.intervalId !== '') {
    if (typeof input.intervalId !== 'string') return fail('Choose an interval.');
    intervalId = input.intervalId;
  }
  if (input.lines != null && !Array.isArray(input.lines)) return fail('Parts must be a list.');
  const rawLines = input.lines ?? [];
  if (rawLines.length > 12) return fail('A job can list at most 12 parts.');
  const lines = [];
  for (const line of rawLines) {
    const parsed = validateLine(line);
    if (parsed.error) return fail(parsed.error);
    lines.push(parsed.value);
  }
  const partsCents = lines.reduce(
    (sum, line) => sum + Math.round(line.quantity * line.unitPriceCents),
    0,
  );
  if (partsCents > 10_000_000) return fail('The parts total is too large.');
  return ok({
    title: title.value,
    performedOn: performedOn.value,
    mileage: mileage.value,
    performer,
    summary: summary.value ?? '',
    laborCents: laborCents.value,
    partsCents,
    intervalId,
    lines,
  });
}

export function validateSearch(query) {
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  if (q.length > 80) return fail('Search is too long.');
  let vehicleId = null;
  if (typeof query.vehicleId === 'string' && query.vehicleId.trim()) {
    vehicleId = query.vehicleId.trim();
  }
  return ok({ q, vehicleId });
}

function validateLine(line) {
  if (!line || typeof line !== 'object' || Array.isArray(line)) return { error: 'Each part needs a name.' };
  const name = requiredText(line.name, 'Part name', 80);
  if (name.error) return name;
  const partNumber = optionalText(line.partNumber, 'Part number', 40);
  if (partNumber.error) return partNumber;
  const quantity = Number(line.quantity ?? 1);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100) {
    return { error: 'Quantity must be between 0 and 100.' };
  }
  const unitPriceCents = requiredInt(line.unitPriceCents ?? 0, 'Part price', 0, 10_000_000);
  if (unitPriceCents.error) return unitPriceCents;
  return {
    value: {
      name: name.value,
      partNumber: emptyToNull(partNumber.value),
      quantity: Math.round(quantity * 1000) / 1000,
      unitPriceCents: unitPriceCents.value,
    },
  };
}

function requiredText(value, label, max) {
  if (typeof value !== 'string') return { error: `${label} is required.` };
  const trimmed = value.trim();
  if (!trimmed) return { error: `${label} is required.` };
  if (trimmed.length > max) return { error: `${label} is too long.` };
  if (trimmed.includes('\0')) return { error: `${label} contains an invalid character.` };
  return { value: trimmed };
}

function optionalText(value, label, max) {
  if (value == null || value === '') return { value: '' };
  if (typeof value !== 'string') return { error: `${label} must be text.` };
  const trimmed = value.trim();
  if (trimmed.length > max) return { error: `${label} is too long.` };
  if (trimmed.includes('\0')) return { error: `${label} contains an invalid character.` };
  return { value: trimmed };
}

function requiredInt(value, label, min, max) {
  if (value == null || value === '') return { error: `${label} is required.` };
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(number)) return { error: `${label} must be a whole number.` };
  if (number < min || number > max) return { error: `${label} is out of range.` };
  return { value: number };
}

function optionalInt(value, label, min, max) {
  if (value == null || value === '') return { value: null };
  return requiredInt(value, label, min, max);
}

function optionalChoice(value, allowed, message) {
  if (value == null || value === '') return { value: '' };
  if (typeof value !== 'string' || !allowed.has(value)) return { error: message };
  return { value };
}

function optionalDate(value, label) {
  if (value == null || value === '') return { value: null };
  if (typeof value !== 'string' || !isIsoDate(value)) return { error: `${label} must be a real date.` };
  const latest = addDaysISO(todayISO(), 1);
  if (value < '1950-01-01' || value > latest) return { error: `${label} is out of range.` };
  return { value };
}

function emptyToNull(value) {
  return value ? value : null;
}

function ok(value) {
  return { ok: true, value };
}

function fail(error) {
  return { ok: false, error };
}
