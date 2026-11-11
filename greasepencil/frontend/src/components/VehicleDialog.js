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
import { FUELS } from '../lib/options';
import { Choice, Field, controlClass } from './Choice';

const UNITS = [
  { value: 'km', label: 'Kilometres' },
  { value: 'mi', label: 'Miles' },
];

export function emptyVehicle() {
  return {
    nickname: '',
    make: '',
    model: '',
    year: String(new Date().getFullYear()),
    chassisCode: '',
    engineCode: '',
    vin: '',
    plate: '',
    fuel: 'petrol',
    mileage: '',
    mileageUnit: 'km',
    notes: '',
  };
}

export function vehicleToForm(vehicle) {
  return {
    nickname: vehicle.nickname,
    make: vehicle.make,
    model: vehicle.model,
    year: String(vehicle.year),
    chassisCode: vehicle.chassisCode || '',
    engineCode: vehicle.engineCode || '',
    vin: vehicle.vin || '',
    plate: vehicle.plate || '',
    fuel: vehicle.fuel || 'petrol',
    mileage: String(vehicle.mileage),
    mileageUnit: vehicle.mileageUnit || 'km',
    notes: vehicle.notes || '',
  };
}

export default function VehicleDialog({ initial, vehicleId, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const editing = Boolean(vehicleId);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      ...form,
      year: Number(form.year),
      mileage: Number(form.mileage),
    };
    try {
      const result = await api(editing ? `/api/vehicles/${vehicleId}` : '/api/vehicles', {
        method: editing ? 'PATCH' : 'POST',
        body,
      });
      onSaved(result.vehicle);
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
          <DialogTitle className="font-serif text-2xl">{editing ? 'Edit vehicle' : 'Add a vehicle'}</DialogTitle>
          <DialogDescription>
            Chassis and engine codes are what you read off the car, for example W203 and M271.940.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Nickname" htmlFor="nickname">
            <Input id="nickname" className={controlClass} value={form.nickname} onChange={(event) => set('nickname', event.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Make" htmlFor="make">
              <Input id="make" className={controlClass} value={form.make} onChange={(event) => set('make', event.target.value)} required />
            </Field>
            <Field label="Model" htmlFor="model">
              <Input id="model" className={controlClass} value={form.model} onChange={(event) => set('model', event.target.value)} required />
            </Field>
            <Field label="Year" htmlFor="year">
              <Input id="year" className={controlClass} inputMode="numeric" value={form.year} onChange={(event) => set('year', event.target.value)} required />
            </Field>
            <Field label="Fuel" htmlFor="fuel">
              <Choice id="fuel" value={form.fuel} onChange={(value) => set('fuel', value)} options={FUELS} />
            </Field>
            <Field label="Chassis code" htmlFor="chassis">
              <Input id="chassis" className={`${controlClass} font-mono`} value={form.chassisCode} onChange={(event) => set('chassisCode', event.target.value)} placeholder="W203" />
            </Field>
            <Field label="Engine code" htmlFor="engine">
              <Input id="engine" className={`${controlClass} font-mono`} value={form.engineCode} onChange={(event) => set('engineCode', event.target.value)} placeholder="M271.940" />
            </Field>
            <Field label="Odometer" htmlFor="mileage">
              <Input id="mileage" className={controlClass} inputMode="numeric" value={form.mileage} onChange={(event) => set('mileage', event.target.value)} required />
            </Field>
            <Field label="Unit" htmlFor="unit">
              <Choice id="unit" value={form.mileageUnit} onChange={(value) => set('mileageUnit', value)} options={UNITS} />
            </Field>
            <Field label="Plate" htmlFor="plate">
              <Input id="plate" className={controlClass} value={form.plate} onChange={(event) => set('plate', event.target.value)} />
            </Field>
            <Field label="VIN or sample id" htmlFor="vin">
              <Input id="vin" className={`${controlClass} font-mono`} value={form.vin} onChange={(event) => set('vin', event.target.value)} />
            </Field>
          </div>
          <Field label="Notes" htmlFor="notes">
            <Textarea id="notes" value={form.notes} onChange={(event) => set('notes', event.target.value)} />
          </Field>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-10" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="h-10" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add vehicle'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
