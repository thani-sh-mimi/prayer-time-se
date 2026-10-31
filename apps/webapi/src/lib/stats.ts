import type { D1Database } from '@cloudflare/workers-types';
import { addDays } from './days';
import { PRAYERS, STREAK_MINIMUM, type Prayer } from './tracking';

/** A single marked prayer. */
export interface PrayerMark {
	jamaah: boolean;
	markedAt: number;
}

/** Everything marked on one day. */
export interface DayRecord {
	day: string;
	prayers: Partial<Record<Prayer, PrayerMark>>;
}

export interface MarkLike {
	day: string;
	prayer: string;
	jamaah: number | boolean;
	marked_at?: number;
	markedAt?: number;
}

/** Marks for one user, grouped by day, in day order. */
export function groupByDay(rows: MarkLike[]): DayRecord[] {
	const days = new Map<string, DayRecord>();
	for (const row of rows) {
		const day = row.day;
		const prayer = row.prayer as Prayer;
		if (!days.has(day)) {
			days.set(day, { day, prayers: {} });
		}
		days.get(day)!.prayers[prayer] = {
			jamaah: Boolean(row.jamaah),
			markedAt: Number(row.markedAt ?? row.marked_at ?? 0)
		};
	}
	return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** Number of prayers marked on a day. */
export function countOf(day: DayRecord | undefined): number {
	if (!day) {
		return 0;
	}
	return PRAYERS.filter((prayer) => day.prayers[prayer]).length;
}

/** Number of those marked as prayed in a group. */
export function jamaahOf(day: DayRecord | undefined): number {
	if (!day) {
		return 0;
	}
	return PRAYERS.filter((prayer) => day.prayers[prayer]?.jamaah).length;
}

/**
 * Consecutive days that count, walking backwards from `today`. A day counts
 * when at least STREAK_MINIMUM prayers are marked. Today is not yet over, so
 * an unfinished today does not break the streak — it starts from yesterday.
 */
export function streakFrom(days: DayRecord[], today: string): number {
	const byDay = new Map(days.map((day) => [day.day, day]));
	let cursor = today;
	if (countOf(byDay.get(cursor)) < STREAK_MINIMUM) {
		cursor = addDays(cursor, -1);
	}
	let streak = 0;
	while (streak < 400 && countOf(byDay.get(cursor)) >= STREAK_MINIMUM) {
		streak++;
		cursor = addDays(cursor, -1);
	}
	return streak;
}

export interface Summary {
	today: string;
	todayCount: number;
	todayJamaah: number;
	weekCount: number;
	weekJamaah: number;
	streak: number;
	week: { day: string; count: number; jamaah: number }[];
}

/** Summarise the marks a user has over the trailing week. */
export function summarize(days: DayRecord[], today: string): Summary {
	const byDay = new Map(days.map((day) => [day.day, day]));
	const week: Summary['week'] = [];
	for (let offset = 6; offset >= 0; offset--) {
		const day = addDays(today, -offset);
		const record = byDay.get(day);
		week.push({ day, count: countOf(record), jamaah: jamaahOf(record) });
	}
	return {
		today,
		todayCount: countOf(byDay.get(today)),
		todayJamaah: jamaahOf(byDay.get(today)),
		weekCount: week.reduce((total, day) => total + day.count, 0),
		weekJamaah: week.reduce((total, day) => total + day.jamaah, 0),
		streak: streakFrom(days, today),
		week
	};
}

export interface MarkRow {
	user_id: string;
	day: string;
	prayer: string;
	jamaah: number;
	marked_at: number;
}

/** Load marks for one user between two days (inclusive). */
export async function loadMarks(
	db: D1Database,
	userId: string,
	from: string,
	to: string
): Promise<MarkRow[]> {
	const { results } = await db
		.prepare(
			`SELECT user_id, day, prayer, jamaah, marked_at
			 FROM prayer_marks
			 WHERE user_id = ? AND day >= ? AND day <= ?
			 ORDER BY day ASC, prayer ASC`
		)
		.bind(userId, from, to)
		.all<MarkRow>();
	return results ?? [];
}

/** Load marks for several users between two days (inclusive). */
export async function loadMarksForUsers(
	db: D1Database,
	userIds: string[],
	from: string,
	to: string
): Promise<MarkRow[]> {
	if (userIds.length === 0) {
		return [];
	}
	const placeholders = userIds.map(() => '?').join(',');
	const { results } = await db
		.prepare(
			`SELECT user_id, day, prayer, jamaah, marked_at
			 FROM prayer_marks
			 WHERE user_id IN (${placeholders}) AND day >= ? AND day <= ?
			 ORDER BY user_id ASC, day ASC, prayer ASC`
		)
		.bind(...userIds, from, to)
		.all<MarkRow>();
	return results ?? [];
}

/** Group rows by user id, then by day. */
export function groupRowsByUser(rows: MarkRow[]): Map<string, DayRecord[]> {
	const byUser = new Map<string, MarkRow[]>();
	for (const row of rows) {
		if (!byUser.has(row.user_id)) {
			byUser.set(row.user_id, []);
		}
		byUser.get(row.user_id)!.push(row);
	}
	const result = new Map<string, DayRecord[]>();
	for (const [userId, userRows] of byUser) {
		result.set(userId, groupByDay(userRows));
	}
	return result;
}


