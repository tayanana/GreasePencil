import { todayISO } from './domain/dates.js';
import { assessInterval } from './domain/status.js';
import { HttpError } from './errors.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isId(value) {
  return typeof value === 'string' && UUID.test(value);
}

export async function listVehicles(db, ownerId) {
  const rows = await db.query(
    'select * from vehicles where owner_id = $1 order by nickname asc',
    [ownerId],
  );
  return rows.map(mapVehicle);
}

export async function getVehicle(db, ownerId, id) {
  const row = await one(
    db,
    'select * from vehicles where id = $1 and owner_id = $2',
    [id, ownerId],
  );
  return mapVehicle(row);
}

export async function createVehicle(db, ownerId, input) {
  const id = crypto.randomUUID();
  const rows = await db.query(
    `insert into vehicles (
      id, owner_id, nickname, make, model, year, chassis_code, engine_code,
      vin, plate, fuel, mileage, mileage_unit, notes
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    returning *`,
    [
      id, ownerId, input.nickname, input.make, input.model, input.year,
      input.chassisCode, input.engineCode, input.vin, input.plate, input.fuel,
      input.mileage, input.mileageUnit, input.notes,
    ],
  );
  return mapVehicle(rows[0]);
}

export async function updateVehicle(db, ownerId, id, input) {
  const current = await getVehicle(db, ownerId, id);
  if (!current) return null;
  const next = { ...current, ...stripUndefined(input) };
  const rows = await db.query(
    `update vehicles set
      nickname = $1, make = $2, model = $3, year = $4, chassis_code = $5,
      engine_code = $6, vin = $7, plate = $8, fuel = $9, mileage = $10,
      mileage_unit = $11, notes = $12, updated_at = now()
    where id = $13 and owner_id = $14
    returning *`,
    [
      next.nickname, next.make, next.model, next.year, empty(next.chassisCode),
      empty(next.engineCode), empty(next.vin), empty(next.plate), empty(next.fuel),
      next.mileage, next.mileageUnit, next.notes ?? '', id, ownerId,
    ],
  );
  return mapVehicle(rows[0]);
}

export async function updateMileage(db, ownerId, id, mileage, mileageUnit) {
  const rows = await db.query(
    `update vehicles set
      mileage = $1,
      mileage_unit = coalesce($2, mileage_unit),
      updated_at = now()
    where id = $3 and owner_id = $4
    returning *`,
    [mileage, mileageUnit ?? null, id, ownerId],
  );
  return mapVehicle(rows[0]);
}

export async function deleteVehicle(db, ownerId, id) {
  const rows = await db.query(
    'delete from vehicles where id = $1 and owner_id = $2 returning id',
    [id, ownerId],
  );
  return rows.length > 0;
}

export async function listIntervals(db, ownerId, vehicleId, today = todayISO()) {
  const vehicle = await getVehicle(db, ownerId, vehicleId);
  if (!vehicle) return null;
  const rows = await db.query(
    'select * from intervals where owner_id = $1 and vehicle_id = $2 order by title asc',
    [ownerId, vehicleId],
  );
  return rows
    .map((row) => decorateInterval(row, vehicle, today))
    .sort((a, b) => a.status.rank - b.status.rank || a.title.localeCompare(b.title));
}

export async function createInterval(db, ownerId, vehicleId, input, today = todayISO()) {
  const vehicle = await getVehicle(db, ownerId, vehicleId);
  if (!vehicle) return null;
  const id = crypto.randomUUID();
  const rows = await db.query(
    `insert into intervals (
      id, owner_id, vehicle_id, title, category, interval_distance, interval_months,
      last_mileage, last_performed_on, part_number, part_name, notes
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    returning *`,
    [
      id, ownerId, vehicleId, input.title, input.category, input.intervalDistance,
      input.intervalMonths, input.lastMileage, input.lastPerformedOn, input.partNumber,
      input.partName, input.notes,
    ],
  );
  return decorateInterval(rows[0], vehicle, today);
}

export async function updateInterval(db, ownerId, id, input, today = todayISO()) {
  const current = await one(
    db,
    'select * from intervals where id = $1 and owner_id = $2',
    [id, ownerId],
  );
  if (!current) return null;
  const rows = await db.query(
    `update intervals set
      title = $1, category = $2, interval_distance = $3, interval_months = $4,
      last_mileage = $5, last_performed_on = $6, part_number = $7, part_name = $8,
      notes = $9, updated_at = now()
    where id = $10 and owner_id = $11
    returning *`,
    [
      input.title, input.category, input.intervalDistance, input.intervalMonths,
      input.lastMileage, input.lastPerformedOn, input.partNumber, input.partName,
      input.notes, id, ownerId,
    ],
  );
  const vehicle = await getVehicle(db, ownerId, current.vehicle_id);
  return decorateInterval(rows[0], vehicle, today);
}

export async function deleteInterval(db, ownerId, id) {
  const rows = await db.query(
    'delete from intervals where id = $1 and owner_id = $2 returning id',
    [id, ownerId],
  );
  return rows.length > 0;
}

export async function listParts(db, ownerId, { q = '', vehicleId = null } = {}) {
  const pattern = q ? likeContains(q) : null;
  const rows = await db.query(
    `select p.*, v.nickname as vehicle_nickname
     from parts p
     left join vehicles v on v.id = p.vehicle_id and v.owner_id = p.owner_id
     where p.owner_id = $1
       and ($2::text is null or p.vehicle_id = $2)
       and (
         $3::text is null
         or p.name ilike $3 escape '\\'
         or p.part_number ilike $3 escape '\\'
         or coalesce(p.brand, '') ilike $3 escape '\\'
         or coalesce(p.specification, '') ilike $3 escape '\\'
       )
     order by p.name asc`,
    [ownerId, vehicleId, pattern],
  );
  return rows.map(mapPart);
}

export async function createPart(db, ownerId, input) {
  if (input.vehicleId) await assertVehicle(db, ownerId, input.vehicleId);
  const id = crypto.randomUUID();
  const rows = await db.query(
    `insert into parts (
      id, owner_id, vehicle_id, name, part_number, brand, category, specification, notes
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    returning *`,
    [
      id, ownerId, input.vehicleId, input.name, input.partNumber, input.brand,
      input.category, input.specification, input.notes,
    ],
  );
  return hydratePart(db, ownerId, rows[0]);
}

export async function updatePart(db, ownerId, id, input) {
  const current = await one(db, 'select * from parts where id = $1 and owner_id = $2', [id, ownerId]);
  if (!current) return null;
  if (input.vehicleId) await assertVehicle(db, ownerId, input.vehicleId);
  const rows = await db.query(
    `update parts set
      vehicle_id = $1, name = $2, part_number = $3, brand = $4, category = $5,
      specification = $6, notes = $7, updated_at = now()
    where id = $8 and owner_id = $9
    returning *`,
    [
      input.vehicleId, input.name, input.partNumber, input.brand, input.category,
      input.specification, input.notes, id, ownerId,
    ],
  );
  return hydratePart(db, ownerId, rows[0]);
}

export async function deletePart(db, ownerId, id) {
  const rows = await db.query(
    'delete from parts where id = $1 and owner_id = $2 returning id',
    [id, ownerId],
  );
  return rows.length > 0;
}

export async function listLogs(db, ownerId, vehicleId) {
  const vehicle = await getVehicle(db, ownerId, vehicleId);
  if (!vehicle) return null;
  const rows = await db.query(
    `select * from service_logs
     where owner_id = $1 and vehicle_id = $2
     order by performed_on desc, created_at desc`,
    [ownerId, vehicleId],
  );
  return attachLines(db, ownerId, rows);
}

export async function createServiceLog(db, ownerId, vehicleId, input) {
  return db.transaction(async (tx) => {
    const vehicle = await getVehicle(tx, ownerId, vehicleId);
    if (!vehicle) return null;
    let intervalUpdated = false;
    if (input.intervalId) {
      const interval = await one(
        tx,
        'select * from intervals where id = $1 and owner_id = $2 and vehicle_id = $3',
        [input.intervalId, ownerId, vehicleId],
      );
      if (!interval) throw new HttpError(400, 'That interval is not on this vehicle.');
      const previous = asDate(interval.last_performed_on);
      const advance = !previous || input.performedOn > previous
        || (input.performedOn === previous && (interval.last_mileage == null || input.mileage >= interval.last_mileage));
      if (advance) {
        await tx.query(
          `update intervals set last_mileage = $1, last_performed_on = $2, updated_at = now()
           where id = $3 and owner_id = $4`,
          [input.mileage, input.performedOn, input.intervalId, ownerId],
        );
        intervalUpdated = true;
      }
    }
    let mileageUpdated = false;
    if (input.mileage > vehicle.mileage) {
      await tx.query(
        'update vehicles set mileage = $1, updated_at = now() where id = $2 and owner_id = $3',
        [input.mileage, vehicleId, ownerId],
      );
      mileageUpdated = true;
    }
    const id = crypto.randomUUID();
    const partsCents = input.lines.reduce(
      (sum, line) => sum + Math.round(line.quantity * line.unitPriceCents),
      0,
    );
    await tx.query(
      `insert into service_logs (
        id, owner_id, vehicle_id, interval_id, performed_on, mileage, title,
        summary, performer, labor_cents, parts_cents
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id, ownerId, vehicleId, input.intervalId, input.performedOn, input.mileage,
        input.title, input.summary, input.performer, input.laborCents, partsCents,
      ],
    );
    for (const line of input.lines) {
      await tx.query(
        `insert into service_log_parts (
          id, owner_id, log_id, name, part_number, quantity, unit_price_cents
        ) values ($1,$2,$3,$4,$5,$6,$7)`,
        [crypto.randomUUID(), ownerId, id, line.name, line.partNumber, line.quantity, line.unitPriceCents],
      );
    }
    const log = await one(tx, 'select * from service_logs where id = $1 and owner_id = $2', [id, ownerId]);
    const [withLines] = await attachLines(tx, ownerId, [log]);
    return { ...withLines, intervalUpdated, mileageUpdated };
  });
}

export async function deleteLog(db, ownerId, id) {
  const rows = await db.query(
    'delete from service_logs where id = $1 and owner_id = $2 returning id',
    [id, ownerId],
  );
  return rows.length > 0;
}

export async function recentLogs(db, ownerId, limit = 6) {
  const rows = await db.query(
    `select l.*, v.nickname as vehicle_nickname, v.mileage_unit
     from service_logs l
     join vehicles v on v.id = l.vehicle_id and v.owner_id = l.owner_id
     where l.owner_id = $1
     order by l.performed_on desc, l.created_at desc
     limit $2`,
    [ownerId, limit],
  );
  return rows.map((row) => ({
    ...mapLog(row),
    vehicleName: row.vehicle_nickname,
    mileageUnit: row.mileage_unit,
  }));
}

export async function getDashboard(db, ownerId, today = todayISO()) {
  const vehicles = await listVehicles(db, ownerId);
  const intervals = [];
  for (const vehicle of vehicles) {
    const rows = await listIntervals(db, ownerId, vehicle.id, today);
    for (const interval of rows) intervals.push({ interval, vehicle });
  }
  const attention = intervals
    .filter(({ interval }) => ['overdue', 'due_now', 'due_soon'].includes(interval.status.state))
    .sort((a, b) => a.interval.status.rank - b.interval.status.rank || a.interval.title.localeCompare(b.interval.title))
    .map(({ interval, vehicle }) => ({
      vehicleId: vehicle.id,
      vehicleName: vehicle.nickname,
      mileageUnit: vehicle.mileageUnit,
      intervalId: interval.id,
      title: interval.title,
      partNumber: interval.partNumber,
      state: interval.status.state,
      distanceRemaining: interval.status.distanceRemaining,
      daysRemaining: interval.status.daysRemaining,
      dueOn: interval.status.dueOn,
    }));
  return {
    summary: {
      vehicles: vehicles.length,
      needsWork: intervals.filter(({ interval }) => interval.status.state === 'overdue' || interval.status.state === 'due_now').length,
      dueSoon: intervals.filter(({ interval }) => interval.status.state === 'due_soon').length,
      onTrack: intervals.filter(({ interval }) => interval.status.state === 'ok').length,
    },
    attention,
    vehicles: vehicles.map((vehicle) => {
      const mine = intervals.filter((item) => item.vehicle.id === vehicle.id);
      const worst = mine.reduce((best, item) => (!best || item.interval.status.rank < best.interval.status.rank ? item : best), null);
      return {
        ...vehicle,
        attention: worst
          ? { state: worst.interval.status.state, title: worst.interval.title, intervalId: worst.interval.id }
          : null,
      };
    }),
    recentLogs: await recentLogs(db, ownerId, 5),
  };
}

async function hydratePart(db, ownerId, row) {
  if (!row?.vehicle_id) return mapPart(row);
  const vehicle = await getVehicle(db, ownerId, row.vehicle_id);
  return mapPart({ ...row, vehicle_nickname: vehicle?.nickname ?? null });
}

async function attachLines(db, ownerId, rows) {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const lines = await db.query(
    `select * from service_log_parts
     where owner_id = $1 and log_id = any($2::text[])
     order by name asc`,
    [ownerId, ids],
  );
  const grouped = new Map();
  for (const line of lines) {
    const list = grouped.get(line.log_id) ?? [];
    list.push(mapLine(line));
    grouped.set(line.log_id, list);
  }
  return rows.map((row) => ({ ...mapLog(row), lines: grouped.get(row.id) ?? [] }));
}

async function assertVehicle(db, ownerId, id) {
  if (!isId(id)) throw new HttpError(400, 'Choose a vehicle.');
  const vehicle = await getVehicle(db, ownerId, id);
  if (!vehicle) throw new HttpError(400, 'That vehicle is not in your garage.');
}

function decorateInterval(row, vehicle, today) {
  const interval = mapInterval(row);
  return {
    ...interval,
    status: assessInterval({
      intervalDistance: interval.intervalDistance,
      intervalMonths: interval.intervalMonths,
      lastMileage: interval.lastMileage,
      lastPerformedOn: interval.lastPerformedOn,
      currentMileage: vehicle.mileage,
      mileageUnit: vehicle.mileageUnit,
      today,
    }),
  };
}

function mapVehicle(row) {
  if (!row) return null;
  return {
    id: row.id,
    nickname: row.nickname,
    make: row.make,
    model: row.model,
    year: row.year,
    chassisCode: row.chassis_code || '',
    engineCode: row.engine_code || '',
    vin: row.vin || '',
    plate: row.plate || '',
    fuel: row.fuel || '',
    mileage: Number(row.mileage),
    mileageUnit: row.mileage_unit,
    notes: row.notes || '',
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapInterval(row) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    title: row.title,
    category: row.category,
    intervalDistance: row.interval_distance == null ? null : Number(row.interval_distance),
    intervalMonths: row.interval_months == null ? null : Number(row.interval_months),
    lastMileage: row.last_mileage == null ? null : Number(row.last_mileage),
    lastPerformedOn: asDate(row.last_performed_on),
    partNumber: row.part_number || '',
    partName: row.part_name || '',
    notes: row.notes || '',
  };
}

function mapPart(row) {
  if (!row) return null;
  return {
    id: row.id,
    vehicleId: row.vehicle_id || null,
    vehicleName: row.vehicle_nickname || '',
    name: row.name,
    partNumber: row.part_number,
    brand: row.brand || '',
    category: row.category,
    specification: row.specification || '',
    notes: row.notes || '',
  };
}

function mapLog(row) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    intervalId: row.interval_id || null,
    performedOn: asDate(row.performed_on),
    mileage: Number(row.mileage),
    title: row.title,
    summary: row.summary || '',
    performer: row.performer,
    laborCents: Number(row.labor_cents),
    partsCents: Number(row.parts_cents),
    createdAt: asIso(row.created_at),
  };
}

function mapLine(row) {
  return {
    id: row.id,
    name: row.name,
    partNumber: row.part_number || '',
    quantity: Number(row.quantity),
    unitPriceCents: Number(row.unit_price_cents),
  };
}

function likeContains(value) {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

async function one(db, text, params) {
  const rows = await db.query(text, params);
  return rows[0] ?? null;
}

function asDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function asIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function empty(value) {
  return value ? value : null;
}

function stripUndefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
