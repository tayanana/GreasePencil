import { addMonthsISO } from '../src/domain/dates.js';
import { assessInterval } from '../src/domain/status.js';

const base = {
  intervalDistance: 10_000,
  intervalMonths: 12,
  lastMileage: 10_000,
  lastPerformedOn: '2026-01-11',
  currentMileage: 15_000,
  mileageUnit: 'km',
  today: '2026-06-01',
};

describe('assessInterval', () => {
  it('stays on track when both the distance and the date have room', () => {
    const status = assessInterval(base);
    expect(status.state).toBe('ok');
    expect(status.distanceRemaining).toBe(5_000);
    expect(status.dueOn).toBe('2027-01-11');
    expect(status.daysRemaining).toBeGreaterThan(30);
  });

  it('is overdue when the odometer has passed the interval', () => {
    const status = assessInterval({ ...base, currentMileage: 21_000, intervalMonths: null });
    expect(status.state).toBe('overdue');
    expect(status.distanceRemaining).toBe(-1_000);
    expect(status.progress).toBe(100);
  });

  it('is due now on the exact distance or the due date', () => {
    const byDistance = assessInterval({
      ...base,
      intervalMonths: null,
      currentMileage: 20_000,
    });
    expect(byDistance.state).toBe('due_now');
    const byDate = assessInterval({
      ...base,
      intervalDistance: null,
      today: '2027-01-11',
    });
    expect(byDate.state).toBe('due_now');
    expect(byDate.daysRemaining).toBe(0);
  });

  it('is due soon inside the warning window and on track just outside it', () => {
    const soon = assessInterval({
      ...base,
      intervalMonths: null,
      lastMileage: 0,
      currentMileage: 9_000,
    });
    const ok = assessInterval({
      ...base,
      intervalMonths: null,
      lastMileage: 0,
      currentMileage: 8_999,
    });
    expect(soon.distanceRemaining).toBe(1_000);
    expect(soon.state).toBe('due_soon');
    expect(ok.distanceRemaining).toBe(1_001);
    expect(ok.state).toBe('ok');

    const soonDate = assessInterval({ ...base, intervalDistance: null, today: '2026-12-12' });
    const okDate = assessInterval({ ...base, intervalDistance: null, today: '2026-12-11' });
    expect(soonDate.daysRemaining).toBe(30);
    expect(soonDate.state).toBe('due_soon');
    expect(okDate.daysRemaining).toBe(31);
    expect(okDate.state).toBe('ok');
  });

  it('lets the worse of the two rules win', () => {
    const status = assessInterval({ ...base, currentMileage: 21_000, today: '2026-06-01' });
    expect(status.state).toBe('overdue');
    expect(status.daysRemaining).toBeGreaterThan(30);
  });

  it('does not call a missing baseline overdue', () => {
    const status = assessInterval({
      ...base,
      lastMileage: null,
      lastPerformedOn: null,
    });
    expect(status.state).toBe('unlogged');
    expect(status.progress).toBe(0);
  });

  it('uses a shorter warning distance for miles', () => {
    const status = assessInterval({
      intervalDistance: 5_000,
      intervalMonths: null,
      lastMileage: 0,
      lastPerformedOn: null,
      currentMileage: 4_400,
      mileageUnit: 'mi',
      today: '2026-06-01',
    });
    expect(status.distanceRemaining).toBe(600);
    expect(status.state).toBe('due_soon');
  });

  it('clamps month-end dates', () => {
    expect(addMonthsISO('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsISO('2024-01-31', 1)).toBe('2024-02-29');
  });
});
