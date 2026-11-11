import { createApp } from './src/app.js';
import { getDb } from './src/db.js';

const port = Number(process.env.PORT) || 4871;
const host = process.env.HOST || '0.0.0.0';
const db = await getDb();
const app = createApp(db);

const server = app.listen(port, host, () => {
  console.log(`Greasepencil API listening on ${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      process.exit(0);
    });
  });
}
