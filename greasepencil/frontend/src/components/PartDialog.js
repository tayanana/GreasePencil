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

export function emptyPart(vehicleId = '') {
  return {
    name: '',
    partNumber: '',
    brand: '',
    category: 'engine',
    specification: '',
    notes: '',
    vehicleId: vehicleId || 'none',
  };
}

export function partToForm(part) {
  return {
    name: part.name,
    partNumber: part.partNumber,
    brand: part.brand || '',
    category: part.category,
    specification: part.specification || '',
    notes: part.notes || '',
    vehicleId: part.vehicleId || 'none',
  };
}

export default function PartDialog({ partId, initial, vehicles, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const vehicleOptions = [
    { value: 'none', label: 'Not tied to one vehicle' },
    ...vehicles.map((vehicle) => ({ value: vehicle.id, label: vehicle.nickname })),
  ];

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api(partId ? `/api/parts/${partId}` : '/api/parts', {
        method: partId ? 'PATCH' : 'POST',
        body: {
          ...form,
          vehicleId: form.vehicleId === 'none' ? null : form.vehicleId,
        },
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
          <DialogTitle className="font-serif text-2xl">{partId ? 'Edit part' : 'Add a part number'}</DialogTitle>
          <DialogDescription>
            Store the number you would hand to a parts counter, plus the note that tells you when it does not fit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="part-name">
              <Input id="part-name" className={controlClass} value={form.name} onChange={(event) => set('name', event.target.value)} required />
            </Field>
            <Field label="Part number or spec" htmlFor="part-number">
              <Input id="part-number" className={`${controlClass} font-mono`} value={form.partNumber} onChange={(event) => set('partNumber', event.target.value)} required />
            </Field>
            <Field label="Brand" htmlFor="part-brand">
              <Input id="part-brand" className={controlClass} value={form.brand} onChange={(event) => set('brand', event.target.value)} />
            </Field>
            <Field label="Category" htmlFor="part-category">
              <Choice id="part-category" value={form.category} onChange={(value) => set('category', value)} options={CATEGORIES} />
            </Field>
          </div>
          <Field label="Fits" htmlFor="part-vehicle">
            <Choice id="part-vehicle" value={form.vehicleId} onChange={(value) => set('vehicleId', value)} options={vehicleOptions} />
          </Field>
          <Field label="Specification" htmlFor="part-spec">
            <Input id="part-spec" className={controlClass} value={form.specification} onChange={(event) => set('specification', event.target.value)} />
          </Field>
          <Field label="Notes" htmlFor="part-notes">
            <Textarea id="part-notes" value={form.notes} onChange={(event) => set('notes', event.target.value)} />
          </Field>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-10" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="h-10" disabled={saving}>{saving ? 'Saving…' : 'Save part'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
