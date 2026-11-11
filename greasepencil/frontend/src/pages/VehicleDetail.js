import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConfirmDialog from '../components/ConfirmDialog';
import IntervalDialog, { emptyInterval, intervalToForm } from '../components/IntervalDialog';
import PageStatus from '../components/PageStatus';
import ServiceDialog from '../components/ServiceDialog';
import StatusPill from '../components/StatusPill';
import VehicleDialog, { vehicleToForm } from '../components/VehicleDialog';
import { api } from '../api';
import { useResource } from '../hooks/useResource';
import {
  describeRemaining,
  formatDate,
  formatJobCost,
  formatMileage,
  formatPartNumber,
} from '../lib/format';
import { CATEGORIES, FUELS, labelFor } from '../lib/options';
import { controlClass } from '../components/Choice';

export default function VehicleDetail() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload, setError } = useResource(`/api/vehicles/${vehicleId}`);
  const [mileage, setMileage] = useState('');
  const [editor, setEditor] = useState(null);
  const [intervalEditor, setIntervalEditor] = useState(null);
  const [service, setService] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (data?.vehicle) setMileage(String(data.vehicle.mileage));
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const id = window.location.hash.replace('#', '');
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: 'center' });
  }, [data]);

  async function saveMileage(event) {
    event.preventDefault();
    setNotice('');
    try {
      await api(`/api/vehicles/${vehicleId}`, {
        method: 'PATCH',
        body: { mileage: Number(mileage) },
      });
      setNotice('Odometer updated. Interval status uses this reading.');
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmDelete() {
    setPending(true);
    try {
      if (confirm.kind === 'vehicle') {
        await api(`/api/vehicles/${vehicleId}`, { method: 'DELETE' });
        navigate('/garage');
        return;
      }
      if (confirm.kind === 'interval') {
        await api(`/api/intervals/${confirm.id}`, { method: 'DELETE' });
      }
      if (confirm.kind === 'log') {
        await api(`/api/logs/${confirm.id}`, { method: 'DELETE' });
      }
      setConfirm(null);
      setNotice(confirm.kind === 'log'
        ? 'Service record removed. The interval was not rolled back.'
        : 'Interval removed.');
      await reload();
    } catch (err) {
      setConfirm(null);
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <PageStatus loading={loading} error={error} onRetry={reload} loadingLabel="Opening the vehicle…">
      {data ? (
        <article className="grid gap-8">
          <div>
            <Link to="/garage" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Back to the garage</Link>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-serif text-4xl tracking-tight">{data.vehicle.nickname}</h1>
                <p className="mt-1 text-muted-foreground">
                  {data.vehicle.year} {data.vehicle.make} {data.vehicle.model}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="h-10 bg-card" onClick={() => setEditor(vehicleToForm(data.vehicle))}>Edit</Button>
                <Button type="button" variant="ghost" className="h-10" onClick={() => setConfirm({ kind: 'vehicle' })}>Delete</Button>
              </div>
            </div>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Spec term="Chassis" value={data.vehicle.chassisCode || '—'} mono />
            <Spec term="Engine" value={data.vehicle.engineCode || '—'} mono />
            <Spec term="Fuel" value={labelFor(FUELS, data.vehicle.fuel)} />
            <Spec term="Plate" value={data.vehicle.plate || '—'} />
            <Spec term="VIN" value={data.vehicle.vin || '—'} mono />
            <Spec term="Odometer" value={formatMileage(data.vehicle.mileage, data.vehicle.mileageUnit)} />
          </dl>
          {data.vehicle.notes ? <p className="max-w-3xl text-sm text-muted-foreground">{data.vehicle.notes}</p> : null}
          <form onSubmit={saveMileage} className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1.5 text-sm font-medium" htmlFor="odometer">
              Update odometer ({data.vehicle.mileageUnit})
              <Input id="odometer" className={`${controlClass} w-40`} inputMode="numeric" value={mileage} onChange={(event) => setMileage(event.target.value)} />
            </label>
            <Button type="submit" className="h-10">Save reading</Button>
          </form>
          {notice ? <p className="text-sm">{notice}</p> : null}
          <section className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-serif text-2xl">Intervals</h2>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-10 bg-card" onClick={() => setService({ intervalId: null })}>Record a service</Button>
                <Button type="button" className="h-10" onClick={() => setIntervalEditor({ id: null, initial: emptyInterval() })}>Add interval</Button>
              </div>
            </div>
            {data.intervals.length === 0 ? (
              <p className="text-muted-foreground">No intervals yet. Add the oil change, then the items you actually forget.</p>
            ) : (
              <ul className="grid gap-3">
                {data.intervals.map((interval) => (
                  <li key={interval.id} id={`interval-${interval.id}`} className="scroll-mt-24 rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{interval.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {labelFor(CATEGORIES, interval.category)}
                          {' · '}
                          {ruleText(interval, data.vehicle.mileageUnit)}
                        </p>
                      </div>
                      <StatusPill state={interval.status.state} />
                    </div>
                    <p className="mt-3 text-sm">{describeRemaining(interval.status, data.vehicle.mileageUnit)}</p>
                    {interval.partNumber ? (
                      <p className="mt-1 font-mono text-sm">{formatPartNumber(interval.partNumber)}{interval.partName ? ` · ${interval.partName}` : ''}</p>
                    ) : null}
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                      <div className={`h-full ${barClass(interval.status.state)}`} style={{ width: `${clamp(interval.status.progress)}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last service: {interval.lastPerformedOn ? `${formatDate(interval.lastPerformedOn)} at ${formatMileage(interval.lastMileage, data.vehicle.mileageUnit)}` : 'not recorded'}
                      {interval.status.dueOn ? ` · Next date ${formatDate(interval.status.dueOn)}` : ''}
                    </p>
                    {interval.notes ? <p className="mt-2 text-sm text-muted-foreground">{interval.notes}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" className="h-9" onClick={() => setService({ intervalId: interval.id })}>Record</Button>
                      <Button type="button" variant="outline" className="h-9 bg-card" onClick={() => setIntervalEditor({ id: interval.id, initial: intervalToForm(interval) })}>Edit</Button>
                      <Button type="button" variant="ghost" className="h-9" onClick={() => setConfirm({ kind: 'interval', id: interval.id, title: interval.title })}>Delete</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="grid gap-3">
            <h2 className="font-serif text-2xl">Service history</h2>
            {data.logs.length === 0 ? (
              <p className="text-muted-foreground">No jobs recorded for this car.</p>
            ) : (
              <ul className="grid gap-3">
                {data.logs.map((log) => (
                  <li key={log.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{log.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(log.performedOn)} · {formatMileage(log.mileage, data.vehicle.mileageUnit)} · {log.performer === 'shop' ? 'Shop' : 'DIY'}
                        </p>
                      </div>
                      <p className="text-sm">{formatJobCost(log.laborCents, log.partsCents)}</p>
                    </div>
                    {log.summary ? <p className="mt-2 text-sm">{log.summary}</p> : null}
                    {log.lines?.length ? (
                      <ul className="mt-2 text-sm text-muted-foreground">
                        {log.lines.map((line) => (
                          <li key={line.id}>
                            {line.quantity} × {line.name}
                            {line.partNumber ? ` · ${formatPartNumber(line.partNumber)}` : ''}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <Button type="button" variant="ghost" className="mt-2 h-9 px-2" onClick={() => setConfirm({ kind: 'log', id: log.id, title: log.title })}>
                      Delete record
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {editor ? (
            <VehicleDialog
              vehicleId={vehicleId}
              initial={editor}
              onClose={() => setEditor(null)}
              onSaved={async () => {
                setEditor(null);
                await reload();
              }}
            />
          ) : null}
          {intervalEditor ? (
            <IntervalDialog
              vehicleId={vehicleId}
              intervalId={intervalEditor.id}
              initial={intervalEditor.initial}
              onClose={() => setIntervalEditor(null)}
              onSaved={async () => {
                setIntervalEditor(null);
                await reload();
              }}
            />
          ) : null}
          {service ? (
            <ServiceDialog
              vehicleId={vehicleId}
              mileage={data.vehicle.mileage}
              intervals={data.intervals}
              intervalId={service.intervalId}
              onClose={() => setService(null)}
              onSaved={async (log) => {
                setService(null);
                setNotice(log.intervalUpdated
                  ? 'Service recorded and the interval moved forward.'
                  : 'Service recorded. An older job does not move the interval backward.');
                await reload();
              }}
            />
          ) : null}
          {confirm ? (
            <ConfirmDialog
              title={confirm.kind === 'vehicle' ? `Delete ${data.vehicle.nickname}?` : `Delete ${confirm.title}?`}
              description={confirm.kind === 'vehicle'
                ? 'This removes the vehicle, its intervals, and its service history. Parts stay in the catalogue.'
                : confirm.kind === 'log'
                  ? 'The history line goes away. The interval keeps its current last-service reading.'
                  : 'The interval goes away. Service history stays, without that link.'}
              confirmLabel="Delete"
              pending={pending}
              onClose={() => setConfirm(null)}
              onConfirm={confirmDelete}
            />
          ) : null}
        </article>
      ) : null}
    </PageStatus>
  );
}

function Spec({ term, value, mono = false }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{term}</dt>
      <dd className={`mt-1 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

function ruleText(interval, unit) {
  const bits = [];
  if (interval.intervalDistance) bits.push(formatMileage(interval.intervalDistance, unit));
  if (interval.intervalMonths) bits.push(`${interval.intervalMonths} months`);
  return bits.length ? `Every ${bits.join(' or ')}` : 'No rule';
}

function barClass(state) {
  if (state === 'overdue' || state === 'due_now') return 'bg-primary';
  if (state === 'due_soon') return 'bg-amber-600';
  if (state === 'ok') return 'bg-emerald-800';
  return 'bg-stone-400';
}

function clamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}
