# Greasepencil

Greasepencil is a DIY garage and auto maintenance tracker. It keeps the cars you work on, the intervals you choose, the part numbers that belong to them, and the jobs you have already done.

The sample bay is a 2005 Mercedes-Benz C 200 Kompressor, chassis **W203**, engine stamp **M271.940**. On a fresh garage the board shows that sample with overdue oil and brake fluid, two items coming up, and a small parts catalogue. Those part numbers are catalogue cross-references. Check the engine stamp, the steering side, and the climate system before ordering anything.

## Run with Docker

Docker Compose builds the React app and the API as two containers. The API keeps its database in a named volume, so the garage is still there after a restart.

```bash
docker compose up --build
```

- App: http://localhost:4870
- API health: http://localhost:4871/api/health

Stop it with `docker compose down`. Add `-v` if you also want to delete the garage data.

The container is a single-user workshop. 

## Run locally

Node.js 22 or newer.

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
npm run dev
```

- App: http://localhost:4870
- API: http://localhost:4871

The Vite dev server proxies `/api` to the API. Data is stored in `data/` with PGlite. Calendar dates use `Africa/Harare` (`APP_TIME_ZONE`).

A production-style process, with the built SPA served by the API:

```bash
npm run build
npm start
```

That listens on port 4871. When `DATABASE_URL` is set, the API uses Postgres instead of the local PGlite file. The build runs `scripts/migrate.mjs`, which applies `migrations/` only when `DATABASE_URL` is present.

## Tests

```bash
npm test
```

| Suite | What it checks |
| --- | --- |
| `backend/test/status.test.js` | Unit tests for overdue, due now, due soon, and a missing baseline |
| `backend/test/api.test.js` | Integration tests: create a vehicle, flag an overdue interval, clear it by logging the job, reject a bad odometer, and keep one owner out of another's vehicle |
| `frontend/src/lib/format.test.js` | Unit tests for part-number grouping and money |
| `frontend/src/App.test.js` | Integration test: the board renders an overdue item and routing opens the parts catalogue |

Jest and React Testing Library run the frontend tests. Jest and Supertest run the API tests.

## Directory tree

```text
.
├── backend
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   ├── server.js                 # process entry: opens the database and listens
│   ├── src
│   │   ├── app.js                # Express app, used by the server and by tests
│   │   ├── auth.js               # signed-in viewer, preview/production split
│   │   ├── db.js                 # Postgres or local PGlite
│   │   ├── migrate.js
│   │   ├── repository.js         # SQL and the service-log transaction
│   │   ├── routes.js             # REST resources
│   │   ├── seed.js               # sample W203 / M271 bay
│   │   └── domain
│   │       ├── dates.js
│   │       ├── status.js         # pure interval status
│   │       └── validate.js
│   └── test
├── frontend
│   ├── Dockerfile
│   ├── nginx.conf                # serves the SPA and proxies /api
│   └── src
│       ├── App.js                # routes
│       ├── main.js
│       ├── api.js
│       ├── components
│       ├── pages
│       └── lib/format.js
├── migrations/001_init.sql
├── scripts/migrate.mjs
├── docker-compose.yml
└── docs                          # concept, C4 architecture, Scrum, reflection
```

## API

Mutating requests must send `x-greasepencil-request: 1`. The browser app does this. A plain cross-site form cannot.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness, no viewer required |
| GET | `/api/me` | The signed-in viewer |
| GET | `/api/dashboard` | Counts, attention list, recent jobs |
| POST | `/api/sample` | Load the sample W203 if it is not already there |
| GET, POST | `/api/vehicles` | List or add a vehicle |
| GET, PATCH, DELETE | `/api/vehicles/:id` | One vehicle, including intervals and history on GET |
| POST | `/api/vehicles/:id/intervals` | Add an interval |
| PATCH, DELETE | `/api/intervals/:id` | Change or remove an interval |
| POST | `/api/vehicles/:id/logs` | Record a service |
| DELETE | `/api/logs/:id` | Remove a service record |
| GET, POST | `/api/parts` | Search or add a part number |
| PATCH, DELETE | `/api/parts/:id` | Change or remove a part |

A vehicle patch that contains only `mileage` updates the odometer. Any other patch replaces the vehicle details. Logging a job moves the linked interval forward only when that job is the latest one, and it raises the odometer only when the new reading is higher. Deleting a log does not roll the interval back.

