import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { HttpError } from './errors.js';
import { apiRouter } from './routes.js';

const hits = new Map();

export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({
    strictTransportSecurity: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        upgradeInsecureRequests: null,
        styleSrcAttr: ["'unsafe-inline'"],
      },
    },
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', rateLimit);
  app.use('/api', apiRouter(db));

  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
  if (existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(path.join(dist, 'index.html'), (error) => {
        if (error) next(error);
      });
    });
  }

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const parseError = error?.type === 'entity.parse.failed';
    const status = parseError ? 400 : error instanceof HttpError ? error.status : error.status || 500;
    const message = parseError
      ? 'The request body was not valid JSON.'
      : status >= 500
        ? 'The garage could not complete that.'
        : error.message || 'Request failed.';
    if (status >= 500) console.error(error.message);
    res.set('cache-control', 'private, no-store');
    res.status(status).json({ error: message });
  });

  return app;
}

function rateLimit(req, res, next) {
  const key = req.ip || 'local';
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= 300) {
    res.set('retry-after', '30');
    res.set('cache-control', 'private, no-store');
    res.status(429).json({ error: 'Too many requests. Wait a moment and try again.' });
    return;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    const oldest = hits.keys().next().value;
    hits.delete(oldest);
  }
  next();
}
