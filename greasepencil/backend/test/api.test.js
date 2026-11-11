process.env.DATA_DIR = 'memory';
process.env.AUTO_SEED = 'false';
process.env.APP_TIME_ZONE = 'Africa/Harare';
delete process.env.DATABASE_URL;
delete process.env.CURSOR_APP_ID;
delete process.env.VERCEL;

import request from 'supertest';
import { todayISO } from '../src/domain/dates.js';
import { createApp } from '../src/app.js';
import { closeDb, getDb } from '../src/db.js';
import { createVehicle, listVehicles } from '../src/repository.js';

const header = { 'x-greasepencil-request': '1' };

function vehicle(overrides = {}) {
  return {
    nickname: 'Test car',
    make: 'Mercedes-Benz',
    model: 'C 200 Kompressor',
    year: 2005,
    chassisCode: 'W203',
    engineCode: 'M271.940',
    mileage: 20_000,
    mileageUnit: 'km',
    fuel: 'petrol',
    notes: '',
    ...overrides,
  };
}

describe('garage API', () => {
  let app;

  beforeAll(async () => {
    const db = await getDb();
    app = createApp(db);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('answers a health check without a viewer', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, service: 'greasepencil' });
  });

  it('rejects a forged identity header instead of falling back to the local viewer', async () => {
    const response = await request(app)
      .get('/api/vehicles')
      .set('x-cursor-identity-v2', 'not-a-real-token');
    expect(response.status).toBe(401);
  });

  it('rejects a change that did not come from the app', async () => {
    const response = await request(app).post('/api/vehicles').send(vehicle());
    expect(response.status).toBe(403);
  });

  it('creates a vehicle, flags an overdue interval, and clears it when the job is logged', async () => {
    const created = await request(app).post('/api/vehicles').set(header).send(vehicle());
    expect(created.status).toBe(201);
    const id = created.body.vehicle.id;

    const listed = await request(app).get('/api/vehicles');
    expect(listed.status).toBe(200);
    expect(listed.body.vehicles.map((item) => item.id)).toContain(id);

    const interval = await request(app)
      .post(`/api/vehicles/${id}/intervals`)
      .set(header)
      .send({
        title: 'Engine oil and filter',
        category: 'engine',
        intervalDistance: 10_000,
        lastMileage: 9_000,
        partNumber: 'A2711800109',
        partName: 'Oil filter element',
      });
    expect(interval.status).toBe(201);
    expect(interval.body.interval.status.state).toBe('overdue');
    expect(interval.body.interval.status.distanceRemaining).toBe(-1_000);

    const logged = await request(app)
      .post(`/api/vehicles/${id}/logs`)
      .set(header)
      .send({
        title: 'Oil and filter',
        performedOn: todayISO(),
        mileage: 20_000,
        performer: 'diy',
        intervalId: interval.body.interval.id,
        laborCents: 0,
        lines: [
          { name: 'Oil filter element', partNumber: 'A2711800109', quantity: 1, unitPriceCents: 1200 },
        ],
      });
    expect(logged.status).toBe(201);
    expect(logged.body.log.intervalUpdated).toBe(true);
    expect(logged.body.log.partsCents).toBe(1200);

    const detail = await request(app).get(`/api/vehicles/${id}`);
    const oil = detail.body.intervals.find((item) => item.id === interval.body.interval.id);
    expect(oil.status.state).toBe('ok');
    expect(oil.lastMileage).toBe(20_000);
    expect(detail.body.logs).toHaveLength(1);

    const removed = await request(app).delete(`/api/vehicles/${id}`).set(header);
    expect(removed.status).toBe(204);
    const after = await request(app).get(`/api/vehicles/${id}`);
    expect(after.status).toBe(404);
  });

  it('rejects a negative odometer', async () => {
    const response = await request(app)
      .post('/api/vehicles')
      .set(header)
      .send(vehicle({ mileage: -1 }));
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/odometer/i);
  });

  it('keeps a literal percent sign from becoming a catalogue wildcard', async () => {
    const response = await request(app).get('/api/parts').query({ q: '%' });
    expect(response.status).toBe(200);
    expect(response.body.parts).toEqual([]);
  });

  it('does not let one owner read another owner\'s vehicle', async () => {
    const db = await getDb();
    const mine = await createVehicle(db, 'production:user:owner-a', vehicle({ nickname: 'Owner A' }));
    await createVehicle(db, 'production:user:owner-b', vehicle({ nickname: 'Owner B' }));
    const visible = await listVehicles(db, 'production:user:owner-a');
    expect(visible.map((item) => item.id)).toEqual([mine.id]);
    const hidden = await request(app).get(`/api/vehicles/${mine.id}`);
    expect(hidden.status).toBe(404);
  });
});
