/**
 * Sample bay for the walkthrough: a W203 C 200 Kompressor, engine stamp M271.940.
 *
 * Part numbers are catalogue cross-references, not an order form:
 * oil filter A2711800109 (MANN-FILTER HU 514 x), air filter A2710940204 (C 14 114),
 * cabin filter A2038300218 (CU 3461/1), sump washer N007603014106.
 * NGK splits spark plugs at engine number 30 853 899 / 30 853 900 (ILFR6A, then PLKR7B8E).
 * Intervals are owner settings for the demo. They are not an ASSYST reading.
 */

import { addDaysISO, addMonthsISO, todayISO } from './domain/dates.js';
import { createPart, createServiceLog, createVehicle } from './repository.js';

export const SAMPLE_NICKNAME = 'W203 Kompressor';

const inflight = new Map();

export function ensureSample(db, ownerId) {
  if (!inflight.has(ownerId)) {
    const job = loadSampleGarage(db, ownerId).finally(() => inflight.delete(ownerId));
    inflight.set(ownerId, job);
  }
  return inflight.get(ownerId);
}

export async function autoSeed(db, ownerId) {
  if (process.env.AUTO_SEED === 'false') return;
  const settings = await db.query(
    'select sample_loaded from owner_settings where owner_id = $1',
    [ownerId],
  );
  if (settings[0]?.sample_loaded === true) return;
  await ensureSample(db, ownerId);
  await db.query(
    `insert into owner_settings (owner_id, sample_loaded) values ($1, true)
     on conflict (owner_id) do update set sample_loaded = true`,
    [ownerId],
  );
}

export async function loadSampleGarage(db, ownerId) {
  const found = await db.query(
    'select id from vehicles where owner_id = $1 and nickname = $2 limit 1',
    [ownerId, SAMPLE_NICKNAME],
  );
  if (found[0]) return { id: found[0].id, created: false };
  const id = await insertSample(db, ownerId);
  return { id, created: true };
}

async function insertSample(db, ownerId) {
  const today = todayISO();
  const mileage = 186_420;
  const plan = buildSample(today, mileage);

  const vehicle = await createVehicle(db, ownerId, plan.vehicle);
  const intervalIds = new Map();
  for (const interval of plan.intervals) {
    const id = await insertInterval(db, ownerId, vehicle.id, interval);
    intervalIds.set(interval.key, id);
  }
  for (const part of plan.parts) {
    await createPart(db, ownerId, { ...part, vehicleId: vehicle.id });
  }
  for (const log of plan.logs) {
    await createServiceLog(db, ownerId, vehicle.id, {
      ...log,
      intervalId: log.key ? intervalIds.get(log.key) : null,
    });
  }
  return vehicle.id;
}

async function insertInterval(db, ownerId, vehicleId, interval) {
  const { key, ...value } = interval;
  const id = crypto.randomUUID();
  await db.query(
    `insert into intervals (
      id, owner_id, vehicle_id, title, category, interval_distance, interval_months,
      last_mileage, last_performed_on, part_number, part_name, notes
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      id,
      ownerId,
      vehicleId,
      value.title,
      value.category,
      value.intervalDistance,
      value.intervalMonths,
      value.lastMileage,
      value.lastPerformedOn,
      value.partNumber,
      value.partName,
      value.notes,
    ],
  );
  return id;
}

function buildSample(today, mileage) {
  const note = 'Sample cross-reference for a W203 with an M271 engine. Confirm the engine stamp, steering side, and climate system before ordering.';
  return {
    vehicle: {
      nickname: SAMPLE_NICKNAME,
      make: 'Mercedes-Benz',
      model: 'C 200 Kompressor',
      year: 2005,
      mileage,
      mileageUnit: 'km',
      chassisCode: 'W203',
      engineCode: 'M271.940',
      vin: 'SAMPLE-W203-M271',
      plate: 'SAMPLE',
      fuel: 'petrol',
      notes: 'Sample bay for the oral walkthrough. The stamp used here is M271.940, the W203 C 200 Kompressor code in the M271 family. Part numbers still have to be checked against the car in front of you.',
    },
    intervals: [
      {
        key: 'oil',
        title: 'Engine oil and filter',
        category: 'engine',
        intervalDistance: 10_000,
        intervalMonths: 12,
        lastMileage: mileage - 10_200,
        lastPerformedOn: addMonthsISO(today, -13),
        partNumber: 'A2711800109',
        partName: 'Oil filter element',
        notes: 'Owner interval for this demo: 10 000 km or 12 months. MB 229.5 oil. This is not the cluster ASSYST reading.',
      },
      {
        key: 'brake-fluid',
        title: 'Brake fluid',
        category: 'fluids',
        intervalDistance: null,
        intervalMonths: 24,
        lastMileage: mileage - 28_000,
        lastPerformedOn: addMonthsISO(today, -26),
        partNumber: 'MB 331.0',
        partName: 'Brake fluid',
        notes: 'Owner interval: 24 months. Fluid approved to MB 331.0.',
      },
      {
        key: 'cabin',
        title: 'Cabin filter',
        category: 'filters',
        intervalDistance: 15_000,
        intervalMonths: 12,
        lastMileage: mileage - 4_000,
        lastPerformedOn: addDaysISO(addMonthsISO(today, -12), 20),
        partNumber: 'A2038300218',
        partName: 'Cabin filter',
        notes: 'Right-hand-drive sample. Confirm THERMATIC versus THERMOTRONIC before ordering.',
      },
      {
        key: 'pads',
        title: 'Front brake pads',
        category: 'brakes',
        intervalDistance: 25_000,
        intervalMonths: null,
        lastMileage: mileage - 23_500,
        lastPerformedOn: addMonthsISO(today, -20),
        partNumber: null,
        partName: 'Front pad set',
        notes: 'Wear item. No pad part number is seeded, because axle and sensor options differ.',
      },
      {
        key: 'air',
        title: 'Engine air filter',
        category: 'filters',
        intervalDistance: 30_000,
        intervalMonths: 24,
        lastMileage: mileage - 6_000,
        lastPerformedOn: addMonthsISO(today, -4),
        partNumber: 'A2710940204',
        partName: 'Engine air filter',
        notes: 'MANN-FILTER cross-reference C 14 114.',
      },
      {
        key: 'plugs',
        title: 'Spark plugs',
        category: 'ignition',
        intervalDistance: 60_000,
        intervalMonths: 48,
        lastMileage: mileage - 22_000,
        lastPerformedOn: addMonthsISO(today, -18),
        partNumber: null,
        partName: 'Spark plug',
        notes: 'NGK lists ILFR6A up to engine number 30 853 899 and PLKR7B8E from 30 853 900. Read the stamp before buying a set of four.',
      },
      {
        key: 'coolant',
        title: 'Coolant',
        category: 'cooling',
        intervalDistance: null,
        intervalMonths: 36,
        lastMileage: mileage - 12_000,
        lastPerformedOn: addMonthsISO(today, -8),
        partNumber: 'MB 325.0',
        partName: 'Coolant',
        notes: 'Owner interval: 36 months. Confirm the antifreeze approval in the manual.',
      },
    ],
    parts: [
      {
        name: 'Oil filter element',
        partNumber: 'A2711800109',
        brand: 'Mercedes-Benz',
        category: 'engine',
        specification: 'Cartridge with seals. Also listed as A2711800009.',
        notes: `${note} MANN-FILTER cross-reference: HU 514 x. Keep the x suffix.`,
      },
      {
        name: 'Sump plug washer',
        partNumber: 'N007603014106',
        brand: 'Mercedes-Benz',
        category: 'engine',
        specification: 'Replace with the oil filter.',
        notes: note,
      },
      {
        name: 'Engine oil',
        partNumber: 'MB 229.5',
        brand: 'Mercedes-Benz spec',
        category: 'fluids',
        specification: 'Approval MB 229.5. Fill to the dipstick.',
        notes: 'A litre figure from another M271 model is not copied here. The dipstick is the fill check.',
      },
      {
        name: 'Engine air filter',
        partNumber: 'A2710940204',
        brand: 'Mercedes-Benz',
        category: 'filters',
        specification: 'M271 intake filter.',
        notes: `${note} MANN-FILTER cross-reference: C 14 114.`,
      },
      {
        name: 'Cabin filter',
        partNumber: 'A2038300218',
        brand: 'Mercedes-Benz',
        category: 'filters',
        specification: 'Particulate element.',
        notes: `${note} MANN-FILTER CU 3461/1 is listed for some right-hand-drive cars. Activated carbon for some climate systems is CUK 3461/1.`,
      },
      {
        name: 'Cabin filter, activated carbon',
        partNumber: 'CUK 3461/1',
        brand: 'MANN-FILTER',
        category: 'filters',
        specification: 'Right-hand-drive carbon element. Not every climate system uses it.',
        notes: note,
      },
      {
        name: 'Spark plug, up to engine 30853899',
        partNumber: 'ILFR6A',
        brand: 'NGK',
        category: 'ignition',
        specification: 'NGK stock 3588. Quantity 4. Engine number up to 30 853 899.',
        notes: note,
      },
      {
        name: 'Spark plug, from engine 30853900',
        partNumber: 'PLKR7B8E',
        brand: 'NGK',
        category: 'ignition',
        specification: 'NGK stock 94716. Quantity 4. Engine number from 30 853 900.',
        notes: note,
      },
      {
        name: 'Brake fluid',
        partNumber: 'MB 331.0',
        brand: 'Mercedes-Benz spec',
        category: 'fluids',
        specification: 'Fluid approved to MB 331.0.',
        notes: note,
      },
    ],
    logs: [
      {
        key: 'oil',
        title: 'Oil and filter',
        performedOn: addMonthsISO(today, -13),
        mileage: mileage - 10_200,
        performer: 'diy',
        summary: 'Cartridge filter and MB 229.5 oil, filled to the dipstick. Cost was not kept with this sample entry.',
        laborCents: 0,
        lines: [
          { name: 'Oil filter element', partNumber: 'A2711800109', quantity: 1, unitPriceCents: 0 },
          { name: 'Engine oil MB 229.5', partNumber: 'MB 229.5', quantity: 1, unitPriceCents: 0 },
        ],
      },
      {
        key: 'brake-fluid',
        title: 'Brake fluid change',
        performedOn: addMonthsISO(today, -26),
        mileage: mileage - 28_000,
        performer: 'shop',
        summary: 'Shop fluid change. Cost was not kept with this sample entry.',
        laborCents: 0,
        lines: [
          { name: 'Brake fluid', partNumber: 'MB 331.0', quantity: 1, unitPriceCents: 0 },
        ],
      },
      {
        key: null,
        title: 'Wiper blades',
        performedOn: addDaysISO(today, -18),
        mileage,
        performer: 'diy',
        summary: 'Front blades. Not tied to an interval.',
        laborCents: 0,
        lines: [
          { name: 'Front wiper blade set', partNumber: null, quantity: 1, unitPriceCents: 0 },
        ],
      },
    ],
  };
}
