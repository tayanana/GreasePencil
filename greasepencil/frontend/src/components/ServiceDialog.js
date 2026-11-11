import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '../api';
import { dollarsToCents, localToday } from '../lib/format';
import { Choice, Field, controlClass } from './Choice';

const PERFORMERS = [
  { value: 'diy', label: 'DIY' },
  { value: 'shop', label: 'Shop' },
];

function blankLine() {
  return { name: '', partNumber: '', quantity: '1', unitPrice: '' };
}

export default function ServiceDialog({ vehicleId, mileage, intervals, intervalId, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: intervals.find((interval) => interval.id === intervalId)?.title || '',
    performedOn: localToday(),
    mileage: mileage ?? '',
    performer: 'diy',
    summary: '',
    labor: '',
    intervalId: intervalId || 'none',
    lines: [blankLine()],
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const intervalOptions = [
    { value: 'none', label: 'Not tied to an interval' },
    ...intervals.map((interval) => ({ value: interval.id, label: interval.title })),
  ];

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setLine(index, key, value) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [key]: value } : line)),
    }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    const laborCents = dollarsToCents(form.labor);
    if (laborCents == null) {
      setError('Enter labour as a dollar amount, such as 40 or 40.50.');
      return;
    }
    const lines = [];
    for (const line of form.lines) {
      if (!line.name.trim() && !line.partNumber.trim() && !line.unitPrice.trim()) continue;
      const unitPriceCents = dollarsToCents(line.unitPrice);
      if (unitPriceCents == null) {
        setError('Enter each part price as a dollar amount, or leave it blank.');
        return;
      }
      lines.push({
        name: line.name.trim(),
        partNumber: line.partNumber.trim(),
        quantity: Number(line.quantity),
        unitPriceCents,
      });
    }
    setSaving(true);
    try {
      const result = await api(`/api/vehicles/${vehicleId}/logs`, {
        method: 'POST',
        body: {
          title: form.title,
          performedOn: form.performedOn,
          mileage: Number(form.mileage),
          performer: form.performer,
          summary: form.summary,
          laborCents,
          intervalId: form.intervalId === 'none' ? null : form.intervalId,
          lines,
        },
      });
      onSaved(result.log);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Record a service</DialogTitle>
          <DialogDescription>
            Logging a job against an interval moves that interval forward when this date is the latest one.
            An older backfilled job stays in the history and leaves the interval where it is.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Job" htmlFor="job-title">
            <Input id="job-title" className={controlClass} value={form.title} onChange={(event) => set('title', event.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="job-date">
              <Input id="job-date" className={controlClass} type="date" value={form.performedOn} onChange={(event) => set('performedOn', event.target.value)} required />
            </Field>
            <Field label="Odometer" htmlFor="job-mileage">
              <Input id="job-mileage" className={controlClass} inputMode="numeric" value={form.mileage} onChange={(event) => set('mileage', event.target.value)} required />
            </Field>
          </div>
          <Field label="Who did it" htmlFor="job-performer">
            <Choice id="job-performer" value={form.performer} onChange={(value) => set('performer', value)} options={PERFORMERS} />
          </Field>
          <Field label="Updates interval" htmlFor="job-interval">
            <Choice id="job-interval" value={form.intervalId} onChange={(value) => set('intervalId', value)} options={intervalOptions} />
          </Field>
          <Field label="Notes" htmlFor="job-summary">
            <Textarea id="job-summary" value={form.summary} onChange={(event) => set('summary', event.target.value)} />
          </Field>
          <Field label="Labour (USD)" htmlFor="job-labor">
            <Input id="job-labor" className={controlClass} inputMode="decimal" placeholder="0.00" value={form.labor} onChange={(event) => set('labor', event.target.value)} />
          </Field>
          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium">Parts used</legend>
            {form.lines.map((line, index) => (
              <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
                <Input aria-label="Part name" className={controlClass} placeholder="Part name" value={line.name} onChange={(event) => setLine(index, 'name', event.target.value)} />
                <Input aria-label="Part number" className={`${controlClass} font-mono`} placeholder="Part number" value={line.partNumber} onChange={(event) => setLine(index, 'partNumber', event.target.value)} />
                <Input aria-label="Quantity" className={controlClass} inputMode="decimal" placeholder="Qty" value={line.quantity} onChange={(event) => setLine(index, 'quantity', event.target.value)} />
                <Input aria-label="Unit price in USD" className={controlClass} inputMode="decimal" placeholder="Unit price" value={line.unitPrice} onChange={(event) => setLine(index, 'unitPrice', event.target.value)} />
                {form.lines.length > 1 ? (
                  <Button type="button" variant="ghost" className="h-10 justify-self-start" onClick={() => set('lines', form.lines.filter((_, lineIndex) => lineIndex !== index))}>
                    Remove part
                  </Button>
                ) : null}
              </div>
            ))}
            <Button type="button" variant="outline" className="h-10 w-fit" onClick={() => set('lines', [...form.lines, blankLine()])}>
              Add another part
            </Button>
          </fieldset>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-10" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="h-10" disabled={saving}>{saving ? 'Saving…' : 'Save service'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
