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
import { CATEGORIES } from '../lib/options';
import { Choice, Field, controlClass } from './Choice';

export function emptyInterval() {
  return {
    title: '',
    category: 'engine',
    intervalDistance: '',
    intervalMonths: '',
    lastMileage: '',
    lastPerformedOn: '',
    partNumber: '',
    partName: '',
    notes: '',
  };
}

export function intervalToForm(interval) {
  return {
    title: interval.title,
    category: interval.category,
    intervalDistance: interval.intervalDistance ?? '',
    intervalMonths: interval.intervalMonths ?? '',
    lastMileage: interval.lastMileage ?? '',
    lastPerformedOn: interval.lastPerformedOn || '',
    partNumber: interval.partNumber || '',
    partName: interval.partName || '',
    notes: interval.notes || '',
  };
}

export default function IntervalDialog({ vehicleId, intervalId, initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      title: form.title,
      category: form.category,
      intervalDistance: form.intervalDistance === '' ? null : Number(form.intervalDistance),
      intervalMonths: form.intervalMonths === '' ? null : Number(form.intervalMonths),
      lastMileage: form.lastMileage === '' ? null : Number(form.lastMileage),
      lastPerformedOn: form.lastPerformedOn || null,
      partNumber: form.partNumber,
      partName: form.partName,
      notes: form.notes,
    };
    try {
      await api(intervalId ? `/api/intervals/${intervalId}` : `/api/vehicles/${vehicleId}/intervals`, {
        method: intervalId ? 'PATCH' : 'POST',
        body,
      });
      onSaved();
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
          <DialogTitle className="font-serif text-2xl">{intervalId ? 'Edit interval' : 'Add an interval'}</DialogTitle>
          <DialogDescription>
            Set a distance, a number of months, or both. Leave the last service blank until you have a baseline.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Name" htmlFor="interval-title">
            <Input id="interval-title" className={controlClass} value={form.title} onChange={(event) => set('title', event.target.value)} required />
          </Field>
          <Field label="Category" htmlFor="interval-category">
            <Choice id="interval-category" value={form.category} onChange={(value) => set('category', value)} options={CATEGORIES} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Every (distance)" htmlFor="interval-distance">
              <Input id="interval-distance" className={controlClass} inputMode="numeric" value={form.intervalDistance} onChange={(event) => set('intervalDistance', event.target.value)} />
            </Field>
            <Field label="Every (months)" htmlFor="interval-months">
              <Input id="interval-months" className={controlClass} inputMode="numeric" value={form.intervalMonths} onChange={(event) => set('intervalMonths', event.target.value)} />
            </Field>
            <Field label="Last odometer" htmlFor="last-mileage">
              <Input id="last-mileage" className={controlClass} inputMode="numeric" value={form.lastMileage} onChange={(event) => set('lastMileage', event.target.value)} />
            </Field>
            <Field label="Last service date" htmlFor="last-date">
              <Input id="last-date" className={controlClass} type="date" value={form.lastPerformedOn} onChange={(event) => set('lastPerformedOn', event.target.value)} />
            </Field>
            <Field label="Part number" htmlFor="interval-part">
              <Input id="interval-part" className={`${controlClass} font-mono`} value={form.partNumber} onChange={(event) => set('partNumber', event.target.value)} />
            </Field>
            <Field label="Part name" htmlFor="interval-part-name">
              <Input id="interval-part-name" className={controlClass} value={form.partName} onChange={(event) => set('partName', event.target.value)} />
            </Field>
          </div>
          <Field label="Notes" htmlFor="interval-notes">
            <Textarea id="interval-notes" value={form.notes} onChange={(event) => set('notes', event.target.value)} />
          </Field>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-10" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="h-10" disabled={saving}>{saving ? 'Saving…' : 'Save interval'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
