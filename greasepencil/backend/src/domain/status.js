/**
 * Decide whether a maintenance interval needs attention.
 *
 * The owner sets the rule: a distance, a number of months, or both.
 * The reading comes from the vehicle odometer and from today's calendar date.
 * A missing last service is "unlogged", not overdue, until someone records a baseline.
 * When both rules exist, the worse result wins.
 *
 * Due now means the remaining distance or days is exactly zero.
 * Overdue means that remainder is negative.
 * Due soon means it is inside 30 days, or inside 10% of the distance
 * (at least 1 000 km or 600 mi).
 */

import { addMonthsISO, daysBetweenISO } from './dates.js';

const DAY_SOON = 30;

export const STATUS_RANK = {
  overdue: 0,
  due_now: 1,
  due_soon: 2,
  unlogged: 3,
  ok: 4,
};

/**
 * @param {object} input
 * @param {number | null} input.intervalDistance
 * @param {number | null} input.intervalMonths
 * @param {number | null} input.lastMileage
 * @param {string | null} input.lastPerformedOn YYYY-MM-DD
 * @param {number} input.currentMileage
 * @param {'km' | 'mi'} [input.mileageUnit]
 * @param {string} input.today YYYY-MM-DD
 */
export function assessInterval({
  intervalDistance = null,
  intervalMonths = null,
  lastMileage = null,
  lastPerformedOn = null,
  currentMileage,
  mileageUnit = 'km',
  today,
}) {
  const distance = assessDistance({ intervalDistance, lastMileage, currentMileage, mileageUnit });
  const time = assessTime({ intervalMonths, lastPerformedOn, today });
  const state = worseState([distance?.state, time?.state]);
  return {
    state,
    rank: STATUS_RANK[state],
    distanceRemaining: distance?.remaining ?? null,
    daysRemaining: time?.remaining ?? null,
    dueOn: time?.dueOn ?? null,
    progress: progress({ state, intervalDistance, intervalMonths, distance, time }),
  };
}

function assessDistance({ intervalDistance, lastMileage, currentMileage, mileageUnit }) {
  if (intervalDistance == null) return null;
  if (lastMileage == null) return { state: 'unlogged', remaining: null };
  const remaining = lastMileage + intervalDistance - currentMileage;
  const soonLimit = Math.max(mileageUnit === 'mi' ? 600 : 1000, Math.round(intervalDistance * 0.1));
  return { state: classify(remaining, soonLimit), remaining };
}

function assessTime({ intervalMonths, lastPerformedOn, today }) {
  if (intervalMonths == null) return null;
  if (!lastPerformedOn) return { state: 'unlogged', remaining: null, dueOn: null };
  const dueOn = addMonthsISO(lastPerformedOn, intervalMonths);
  const remaining = daysBetweenISO(today, dueOn);
  return { state: classify(remaining, DAY_SOON), remaining, dueOn };
}

function classify(remaining, soonLimit) {
  if (remaining < 0) return 'overdue';
  if (remaining === 0) return 'due_now';
  if (remaining <= soonLimit) return 'due_soon';
  return 'ok';
}

function worseState(states) {
  const present = states.filter(Boolean);
  if (present.length === 0) return 'unlogged';
  return present.reduce((worst, state) => (STATUS_RANK[state] < STATUS_RANK[worst] ? state : worst));
}

function progress({ state, intervalDistance, intervalMonths, distance, time }) {
  if (state === 'unlogged') return 0;
  if (state === 'overdue' || state === 'due_now') return 100;
  const distanceProgress = distance?.remaining != null && intervalDistance
    ? ((intervalDistance - distance.remaining) / intervalDistance) * 100
    : null;
  const timeProgress = time?.remaining != null && intervalMonths
    ? ((intervalMonths * 30 - time.remaining) / (intervalMonths * 30)) * 100
    : null;
  const values = [distanceProgress, timeProgress].filter((value) => value != null);
  if (values.length === 0) return 0;
  return clamp(Math.round(Math.max(...values)));
}

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}
