import { Router } from 'express';
import { requireAppHeader, requireViewer } from './auth.js';
import { HttpError, asyncRoute } from './errors.js';
import {
  validateInterval,
  validateMileage,
  validatePart,
  validateSearch,
  validateServiceLog,
  validateVehicle,
} from './domain/validate.js';
import { isId } from './repository.js';
import {
  createInterval,
  createPart,
  createServiceLog,
  createVehicle,
  deleteInterval,
  deleteLog,
  deletePart,
  deleteVehicle,
  getDashboard,
  getVehicle,
  listIntervals,
  listLogs,
  listParts,
  listVehicles,
  updateInterval,
  updateMileage,
  updatePart,
  updateVehicle,
} from './repository.js';
import { autoSeed, ensureSample } from './seed.js';

export function apiRouter(db) {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ ok: true, service: 'greasepencil' });
  });

  router.use(requireAppHeader);
  router.use(requireViewer);
  router.use(asyncRoute(async (req, res, next) => {
    if (req.path === '/me' || req.path === '/sample') {
      next();
      return;
    }
    await autoSeed(db, req.ownerId);
    next();
  }));

  router.get('/me', (req, res) => {
    res.json(req.viewer);
  });

  router.get('/dashboard', asyncRoute(async (req, res) => {
    res.json(await getDashboard(db, req.ownerId));
  }));

  router.post('/sample', asyncRoute(async (req, res) => {
    const sample = await ensureSample(db, req.ownerId);
    const vehicle = await getVehicle(db, req.ownerId, sample.id);
    res.status(sample.created ? 201 : 200).json({ created: sample.created, vehicle });
  }));

  router.get('/vehicles', asyncRoute(async (req, res) => {
    res.json({ vehicles: await listVehicles(db, req.ownerId) });
  }));

  router.post('/vehicles', asyncRoute(async (req, res) => {
    const input = parse(validateVehicle(req.body));
    const vehicle = await createVehicle(db, req.ownerId, input);
    res.status(201).json({ vehicle });
  }));

  router.get('/vehicles/:id', asyncRoute(async (req, res) => {
    const id = paramId(req.params.id);
    const vehicle = await getVehicle(db, req.ownerId, id);
    if (!vehicle) throw new HttpError(404, 'That vehicle is not in your garage.');
    const intervals = await listIntervals(db, req.ownerId, id);
    const logs = await listLogs(db, req.ownerId, id);
    res.json({ vehicle, intervals, logs });
  }));

  router.patch('/vehicles/:id', asyncRoute(async (req, res) => {
    const id = paramId(req.params.id);
    const keys = Object.keys(req.body ?? {});
    const odometerOnly = keys.length > 0 && keys.every((key) => key === 'mileage' || key === 'mileageUnit');
    const vehicle = odometerOnly
      ? await updateMileageFrom(db, req.ownerId, id, req.body)
      : await updateVehicle(db, req.ownerId, id, parse(validateVehicle(req.body)));
    if (!vehicle) throw new HttpError(404, 'That vehicle is not in your garage.');
    res.json({ vehicle });
  }));

  router.delete('/vehicles/:id', asyncRoute(async (req, res) => {
    const removed = await deleteVehicle(db, req.ownerId, paramId(req.params.id));
    if (!removed) throw new HttpError(404, 'That vehicle is not in your garage.');
    res.status(204).end();
  }));

  router.post('/vehicles/:id/intervals', asyncRoute(async (req, res) => {
    const vehicleId = paramId(req.params.id);
    const interval = await createInterval(db, req.ownerId, vehicleId, parse(validateInterval(req.body)));
    if (!interval) throw new HttpError(404, 'That vehicle is not in your garage.');
    res.status(201).json({ interval });
  }));

  router.patch('/intervals/:id', asyncRoute(async (req, res) => {
    const interval = await updateInterval(db, req.ownerId, paramId(req.params.id), parse(validateInterval(req.body)));
    if (!interval) throw new HttpError(404, 'That interval is not in your garage.');
    res.json({ interval });
  }));

  router.delete('/intervals/:id', asyncRoute(async (req, res) => {
    const removed = await deleteInterval(db, req.ownerId, paramId(req.params.id));
    if (!removed) throw new HttpError(404, 'That interval is not in your garage.');
    res.status(204).end();
  }));

  router.post('/vehicles/:id/logs', asyncRoute(async (req, res) => {
    const log = await createServiceLog(
      db,
      req.ownerId,
      paramId(req.params.id),
      parse(validateServiceLog(req.body)),
    );
    if (!log) throw new HttpError(404, 'That vehicle is not in your garage.');
    res.status(201).json({ log });
  }));

  router.delete('/logs/:id', asyncRoute(async (req, res) => {
    const removed = await deleteLog(db, req.ownerId, paramId(req.params.id));
    if (!removed) throw new HttpError(404, 'That service record is not in your garage.');
    res.status(204).end();
  }));

  router.get('/parts', asyncRoute(async (req, res) => {
    const query = parse(validateSearch(req.query));
    if (query.vehicleId && !isId(query.vehicleId)) throw new HttpError(400, 'Choose a vehicle.');
    res.json({ parts: await listParts(db, req.ownerId, query) });
  }));

  router.post('/parts', asyncRoute(async (req, res) => {
    const part = await createPart(db, req.ownerId, parse(validatePart(req.body)));
    res.status(201).json({ part });
  }));

  router.patch('/parts/:id', asyncRoute(async (req, res) => {
    const part = await updatePart(db, req.ownerId, paramId(req.params.id), parse(validatePart(req.body)));
    if (!part) throw new HttpError(404, 'That part is not in your catalogue.');
    res.json({ part });
  }));

  router.delete('/parts/:id', asyncRoute(async (req, res) => {
    const removed = await deletePart(db, req.ownerId, paramId(req.params.id));
    if (!removed) throw new HttpError(404, 'That part is not in your catalogue.');
    res.status(204).end();
  }));

  router.use((req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  return router;
}

async function updateMileageFrom(db, ownerId, id, body) {
  const input = parse(validateMileage(body));
  return updateMileage(db, ownerId, id, input.mileage, input.mileageUnit);
}

function parse(result) {
  if (!result.ok) throw new HttpError(400, result.error);
  return result.value;
}

function paramId(value) {
  if (!isId(value)) throw new HttpError(404, 'Not found.');
  return value;
}
