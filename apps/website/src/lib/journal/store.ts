import { browser } from '$app/environment';
import { writable } from 'svelte/store';

/**
 * The prayer journal lives on this device and nowhere else.
 *
 * Each day is a bitmask of the five prayers, keyed by the local date as
 * YYYY-MM-DD. Nothing is sent to a server and there is no account.
 */
export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type Prayer = (typeof PRAYERS)[number];

/** day (YYYY-MM-DD) → bitmask of marked prayers */
export type Journal = Record<string, number>;

const STORAGE_KEY = 'bönetider:journal:v1';
/** Old days are dropped on save so the stored object stays small. */
const KEEP_DAYS = 730;

function bitFor(prayer: Prayer): number {
	return 1 << PRAYERS.indexOf(prayer);
}

function load(): Journal {
	if (!browser) {
		return {};
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		return parsed && typeof parsed === 'object' ? (parsed as Journal) : {};
	} catch {
		return {};
	}
}

function save(value: Journal) {
	if (!browser) {
		return;
	}
	const cutoff = keyFor(new Date(Date.now() - KEEP_DAYS * 86_400_000));
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

/** The storage key for a date, in the local calendar. */
export function keyFor(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function isMarked(value: Journal, day: string, prayer: Prayer): boolean {
	return Boolean((value[day] ?? 0) & bitFor(prayer));
}

export function count(value: Journal, day: string): number {
	const mask = value[day] ?? 0;
	return PRAYERS.filter((prayer) => mask & bitFor(prayer)).length;
}

/** Mark or unmark one prayer for a day. */
export function toggle(day: string, prayer: Prayer): void {
	journal.update((value) => {
		const next = (value[day] ?? 0) ^ bitFor(prayer);
		const copy = { ...value };
		if (next === 0) {
			delete copy[day];
		} else {
			copy[day] = next;
		}
		return copy;
	});
}
