import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PageStatus from '../components/PageStatus';
import StatusPill from '../components/StatusPill';
import VehicleDialog, { emptyVehicle } from '../components/VehicleDialog';
import { api } from '../api';
import { useResource } from '../hooks/useResource';
import { formatMileage } from '../lib/format';

export default function Garage() {
  const { data, error, loading, reload, setError } = useResource('/api/vehicles');
  const board = useResource('/api/dashboard');
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState('');
  const [working, setWorking] = useState(false);
  const attention = new Map((board.data?.vehicles || []).map((vehicle) => [vehicle.id, vehicle.attention]));

  async function loadSample() {
    setWorking(true);
    setNotice('');
    try {
      const result = await api('/api/sample', { method: 'POST', body: {} });
      setNotice(result.created
        ? 'The sample W203 is in the garage.'
        : 'The sample W203 was already in the garage.');
      await reload();
      await board.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-primary uppercase">Garage</p>
          <h1 className="font-serif text-4xl tracking-tight">Vehicles in the bay</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-10 bg-card" onClick={loadSample} disabled={working}>
            {working ? 'Loading…' : 'Load sample W203'}
          </Button>
          <Button type="button" className="h-10" onClick={() => setDraft(emptyVehicle())}>Add a vehicle</Button>
        </div>
      </header>
      {notice ? <p className="text-sm">{notice}</p> : null}
      <PageStatus loading={loading} error={error} onRetry={reload} loadingLabel="Bringing the cars in…">
        {data && data.vehicles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-6">
            <h2 className="font-serif text-2xl">No cars yet</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Add the one on the driveway, or load the sample Mercedes-Benz W203 with the M271.940 stamp and its catalogue.
            </p>
          </div>
        ) : null}
        {data && data.vehicles.length > 0 ? (
          <ul className="grid gap-3">
            {data.vehicles.map((vehicle) => {
              const flag = attention.get(vehicle.id);
              return (
                <li key={vehicle.id}>
                  <Link to={`/garage/${vehicle.id}`} className="grid gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/40 sm:grid-cols-[1fr_auto] sm:items-center">
                    <span>
                      <span className="block font-serif text-2xl">{vehicle.nickname}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </span>
                      <span className="mt-2 block font-mono text-sm">
                        {[vehicle.chassisCode, vehicle.engineCode].filter(Boolean).join(' · ') || 'Codes not recorded'}
                        {' · '}
                        {formatMileage(vehicle.mileage, vehicle.mileageUnit)}
                      </span>
                    </span>
                    {flag ? <StatusPill state={flag.state} /> : <span className="text-sm text-muted-foreground">No intervals</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </PageStatus>
      {draft ? (
        <VehicleDialog
          initial={draft}
          onClose={() => setDraft(null)}
          onSaved={async () => {
            setDraft(null);
            await reload();
            await board.reload();
          }}
        />
      ) : null}
    </div>
  );
}
