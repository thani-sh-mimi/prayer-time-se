import { browser } from '$app/environment';
import { writable } from 'svelte/store';

/**
 * The prayer journal lives on this device and nowhere else.
 *
 * Each day is stored as a bitmask of the five prayers, keyed by the local
 * Swedish date. Nothing is sent to a server and there is no account.
 */
export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type Prayer = (typeof PRAYERS)[number];

/** day (YYYY-MM-DD) → bitmask of marked prayers */
export type Journal = Record<string, number>;

const STORAGE_KEY = 'bönetider:journal:v1';
/** Old days are dropped on save so the stored object stays small. */
const KEEP_DAYS = 730;
/** A day counts toward a streak with at least this many prayers marked. */
const STREAK_MINIMUM = 4;

function bitFor(prayer: Prayer): number {
	return 1 << PRAYERS.indexOf(prayer);
}

function load(): Journal {
	if (!browser) {
		return {};
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return {};
		}
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? (parsed as Journal) : {};
	} catch {
		return {};
	}
}

function save(value: Journal) {
	if (!browser) {
		return;
	}
	const cutoff = addDays(today(), -KEEP_DAYS);
	const pruned: Journal = {};
	for (const [day, mask] of Object.entries(value)) {
		if (day >= cutoff) {
			pruned[day] = mask;
		}
	}
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
	} catch {
		// A full or blocked storage must not break the screen.
	}
}

export const journal = writable<Journal>(load());

journal.subscribe(save);

/** Today's date in Stockholm as YYYY-MM-DD. */
export function today(): string {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Europe/Stockholm',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(new Date());
	const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
	return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Shift a day string by whole days. */
export function addDays(day: string, delta: number): string {
	const [year, month, date] = day.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, date) + delta * 86_400_000).toISOString().slice(0, 10);
}

export function isMarked(value: Journal, day: string, prayer: Prayer): boolean {
	return Boolean((value[day] ?? 0) & bitFor(prayer));
}

export function count(value: Journal, day: string): number {
	const mask = value[day] ?? 0;
	let total = 0;
	for (const prayer of PRAYERS) {
		if (mask & bitFor(prayer)) {
			total++;
		}
	}
	return total;
}

/** Mark or unmark one prayer; returns the updated journal. */
export function toggle(day: string, prayer: Prayer): void {
	journal.update((value) => {
		const mask = value[day] ?? 0;
		const next = mask ^ bitFor(prayer);
		const copy = { ...value };
		if (next === 0) {
			delete copy[day];
		} else {
			copy[day] = next;
		}
		return copy;
	});
}

export function clearJournal(): void {
	journal.set({});
}

/**
 * Consecutive days that count, walking back from `today`. Today is not over,
 * so an unfinished today does not break the streak.
 */
export function streak(value: Journal, day = today()): number {
	let cursor = day;
	if (count(value, cursor) < STREAK_MINIMUM) {
		cursor = addDays(cursor, -1);
	}
	let total = 0;
	while (total < 400 && count(value, cursor) >= STREAK_MINIMUM) {
		total++;
		cursor = addDays(cursor, -1);
	}
	return total;
}

/** The last seven days, oldest first. */
export function week(value: Journal, day = today()): { day: string; count: number }[] {
	return Array.from({ length: 7 }, (_, index) => {
		const value_day = addDays(day, index - 6);
		return { day: value_day, count: count(value, value_day) };
	});
}

/** Long Swedish date, e.g. "lördag 31 oktober". */
export function formatLongDate(day: string): string {
	const [year, month, date] = day.split('-').map(Number);
	return new Intl.DateTimeFormat('sv-SE', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	}).format(new Date(Date.UTC(year, month - 1, date, 12)));
}

/** Short Swedish weekday, e.g. "mån". */
export function formatWeekday(day: string): string {
	const [year, month, date] = day.split('-').map(Number);
	return new Intl.DateTimeFormat('sv-SE', { weekday: 'short' }).format(
		new Date(Date.UTC(year, month - 1, date, 12))
	);
}
