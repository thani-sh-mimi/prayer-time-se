/**
 * Shared vocabulary and rules for prayer tracking.
 *
 * The five tracked prayers; sunrise is a time, not a prayer, so it is not
 * something a person marks.
 */
export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type Prayer = (typeof PRAYERS)[number];

export const TRACKED_PER_DAY = PRAYERS.length;
/** How many days back a mark may be added. Enough to repair a forgotten
 * evening, short enough that the history stays honest. */
export const BACKFILL_DAYS = 7;
/** A day counts toward a streak when at least this many prayers are marked. */
export const STREAK_MINIMUM = 4;
/** Window used to decide whether a friend has gone quiet. */
export const QUIET_WINDOW_DAYS = 3;
/** Marked prayers in that window at or below this number trigger support. */
export const QUIET_THRESHOLD = 6;
/** A user has to have marked something in this many days to be considered
 * active; somebody who stopped using the app is not "quiet". */
export const ACTIVE_WINDOW_DAYS = 14;

export function isPrayer(value: unknown): value is Prayer {
	return typeof value === 'string' && (PRAYERS as readonly string[]).includes(value);
}

/** Marks for the last `days` days, keyed by day then prayer. */
export interface Mark {
	prayer: Prayer;
	jamaah: boolean;
	markedAt: number;
}
