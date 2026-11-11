import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageStatus from '../components/PageStatus';
import PartDialog, { emptyPart, partToForm } from '../components/PartDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { api } from '../api';
import { useResource } from '../hooks/useResource';
import { formatPartNumber } from '../lib/format';
import { labelFor, CATEGORIES } from '../lib/options';
import { Choice, controlClass } from '../components/Choice';

export default function Parts() {
  const vehiclesResource = useResource('/api/vehicles');
  const [draftQuery, setDraftQuery] = useState('');
  const [query, setQuery] = useState('');
  const [vehicleId, setVehicleId] = useState('all');
  const [editor, setEditor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [pending, setPending] = useState(false);
  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (vehicleId !== 'all') params.set('vehicleId', vehicleId);
    const search = params.toString();
    return `/api/parts${search ? `?${search}` : ''}`;
  }, [query, vehicleId]);
  const { data, error, loading, reload, setError } = useResource(path);
  const vehicles = vehiclesResource.data?.vehicles || [];
  const vehicleOptions = [
    { value: 'all', label: 'All vehicles' },
    ...vehicles.map((vehicle) => ({ value: vehicle.id, label: vehicle.nickname })),
  ];

  async function removePart() {
    setPending(true);
    try {
      await api(`/api/parts/${confirm.id}`, { method: 'DELETE' });
      setConfirm(null);
      await reload();
    } catch (err) {
      setConfirm(null);
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-sm font-medium tracking-wide text-primary uppercase">Catalogue</p>
          <h1 className="font-serif text-4xl tracking-tight">Part numbers</h1>
          <p className="mt-2 text-muted-foreground">
            The sample list is for a W203 M271. Spark plugs split on the engine number. Cabin filters split on steering side and climate control.
          </p>
        </div>
        <Button type="button" className="h-10" onClick={() => setEditor({ id: null, initial: emptyPart(vehicleId === 'all' ? '' : vehicleId) })}>
          Add a part
        </Button>
      </header>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_14rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(draftQuery.trim());
        }}
      >
        <Input
          className={controlClass}
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
          placeholder="Search name, number, or brand"
          aria-label="Search parts"
        />
        <Choice id="parts-vehicle" value={vehicleId} onChange={setVehicleId} options={vehicleOptions} />
        <Button type="submit" variant="outline" className="h-10 bg-card">Search</Button>
      </form>
      <PageStatus loading={loading} error={error} onRetry={reload} loadingLabel="Looking through the catalogue…">
        {data && data.parts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-muted-foreground">
            {query || vehicleId !== 'all' ? 'Nothing in the catalogue matches that.' : 'The catalogue is empty. Add a part number or load the sample W203 from the garage.'}
          </p>
        ) : null}
        {data && data.parts.length > 0 ? (
          <ul className="grid gap-3">
            {data.parts.map((part) => (
              <li key={part.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-medium">{part.name}</h2>
                    <p className="mt-1 font-mono text-lg tracking-wide">{formatPartNumber(part.partNumber)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="h-9 bg-card" onClick={() => setEditor({ id: part.id, initial: partToForm(part) })}>Edit</Button>
                    <Button type="button" variant="ghost" className="h-9" onClick={() => setConfirm(part)}>Delete</Button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {[part.brand, labelFor(CATEGORIES, part.category), part.vehicleName || 'Any vehicle'].filter(Boolean).join(' · ')}
                </p>
                {part.specification ? <p className="mt-2 text-sm">{part.specification}</p> : null}
                {part.notes ? <p className="mt-2 text-sm text-muted-foreground">{part.notes}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </PageStatus>
      {editor ? (
        <PartDialog
          partId={editor.id}
          initial={editor.initial}
          vehicles={vehicles}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await reload();
          }}
        />
      ) : null}
      {confirm ? (
        <ConfirmDialog
          title={`Delete ${confirm.name}?`}
          description="The number leaves the catalogue. Service history that mentioned it stays."
          confirmLabel="Delete part"
          pending={pending}
          onClose={() => setConfirm(null)}
          onConfirm={removePart}
        />
      ) : null}
    </div>
  );
}
