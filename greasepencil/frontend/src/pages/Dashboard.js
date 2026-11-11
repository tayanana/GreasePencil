import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import PageStatus from '../components/PageStatus';
import StatusPill from '../components/StatusPill';
import { useResource } from '../hooks/useResource';
import { describeRemaining, formatDate, formatJobCost, formatMileage, formatPartNumber } from '../lib/format';

export default function Dashboard() {
  const { data, error, loading, reload } = useResource('/api/dashboard');

  return (
    <PageStatus loading={loading} error={error} onRetry={reload} loadingLabel="Checking the board…">
      {data ? <Board data={data} /> : null}
    </PageStatus>
  );
}

function Board({ data }) {
  const empty = data.summary.vehicles === 0;
  return (
    <div className="grid gap-8">
      <header className="max-w-2xl">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">The board</p>
        <h1 className="mt-1 font-serif text-4xl tracking-tight sm:text-5xl">What needs a wrench</h1>
        <p className="mt-3 text-muted-foreground">
          Repair entries, component life, notes, and part numbers across the systems on a car. The same garage opens on the bench laptop and on a phone under the hood. The sample bay is a W203 with an M271 engine.
        </p>
      </header>
      <section className="grid gap-3 sm:grid-cols-3" aria-label="Summary">
        <Stat label="Needs work" value={data.summary.needsWork} detail="Overdue or due today" />
        <Stat label="Coming up" value={data.summary.dueSoon} detail="Inside the warning window" />
        <Stat label="On track" value={data.summary.onTrack} detail="Still inside the interval" />
      </section>
      {empty ? (
        <Card>
          <CardContent className="grid gap-3 p-6">
            <h2 className="font-serif text-2xl">The bay is empty</h2>
            <p className="text-muted-foreground">Add the car you are working on, or load the sample W203.</p>
            <Link to="/garage" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Go to the garage</Link>
          </CardContent>
        </Card>
      ) : null}
      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">Attention</h2>
        {data.attention.length === 0 ? (
          <p className="text-muted-foreground">Nothing is due. The intervals you have recorded are still inside their window.</p>
        ) : (
          <ul className="grid gap-2">
            {data.attention.map((item) => (
              <li key={item.intervalId}>
                <Link
                  to={`/garage/${item.vehicleId}#interval-${item.intervalId}`}
                  className="grid gap-2 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <span>
                    <span className="block font-medium">{item.title}</span>
                    <span className="block text-sm text-muted-foreground">
                      {item.vehicleName}
                      {item.partNumber ? ` · ${formatPartNumber(item.partNumber)}` : ''}
                      {' · '}
                      {describeRemaining(item, item.mileageUnit)}
                    </span>
                  </span>
                  <StatusPill state={item.state} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="grid gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl">In the garage</h2>
          <Link to="/garage" className="text-sm font-medium text-primary underline-offset-4 hover:underline">All vehicles</Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.vehicles.map((vehicle) => (
            <li key={vehicle.id}>
              <Link to={`/garage/${vehicle.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/40">
                <span className="flex items-start justify-between gap-3">
                  <span className="font-serif text-xl">{vehicle.nickname}</span>
                  {vehicle.attention ? <StatusPill state={vehicle.attention.state} /> : null}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </span>
                <span className="mt-3 block font-mono text-sm">
                  {[vehicle.chassisCode, vehicle.engineCode].filter(Boolean).join(' · ') || 'No codes yet'}
                </span>
                <span className="mt-1 block text-sm">{formatMileage(vehicle.mileage, vehicle.mileageUnit)}</span>
                {vehicle.attention ? (
                  <span className="mt-2 block text-sm">Next up: {vehicle.attention.title}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">Recent jobs</h2>
        {data.recentLogs.length === 0 ? (
          <p className="text-muted-foreground">No service has been recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {data.recentLogs.map((log) => (
              <li key={log.id}>
                <Link to={`/garage/${log.vehicleId}`} className="grid gap-1 px-4 py-3 hover:bg-muted/60 sm:grid-cols-[8rem_1fr_auto] sm:items-center">
                  <span className="text-sm text-muted-foreground">{formatDate(log.performedOn)}</span>
                  <span>
                    <span className="block font-medium">{log.title}</span>
                    <span className="block text-sm text-muted-foreground">{log.vehicleName} · {formatMileage(log.mileage, log.mileageUnit)}</span>
                  </span>
                  <span className="text-sm">{formatJobCost(log.laborCents, log.partsCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, detail }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-serif text-4xl">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
