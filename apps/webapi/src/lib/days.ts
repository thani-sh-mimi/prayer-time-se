/**
 * Calendar helpers. A "day" everywhere in the tracker is the local Swedish
 * date as YYYY-MM-DD — never the UTC date — so marks made at 00:30 belong to
 * the day the user experienced.
 */

export const TIME_ZONE = 'Europe/Stockholm';

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
	timeZone: TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

/** The current date in Stockholm as YYYY-MM-DD. */
export function today(now: Date | number = Date.now()): string {
	const parts = dayFormatter.formatToParts(new Date(now));
	const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
	return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Parse YYYY-MM-DD into a UTC midnight timestamp. */
function parseDay(day: string): number {
	const [year, month, date] = day.split('-').map(Number);
	return Date.UTC(year, month - 1, date);
}

/** Shift a day string by a number of days. */
export function addDays(day: string, delta: number): string {
	const shifted = new Date(parseDay(day) + delta * 86_400_000);
	return shifted.toISOString().slice(0, 10);
}

/** True when the string is a real calendar date in YYYY-MM-DD form. */
export function isValidDay(day: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
		return false;
	}
	const [year, month, date] = day.split('-').map(Number);
	const time = Date.UTC(year, month - 1, date);
	const roundTrip = new Date(time).toISOString().slice(0, 10);
	return roundTrip === day;
}

/** Every day from `from` to `to`, inclusive. Capped so a huge range cannot
 * allocate forever. */
export function daysBetween(from: string, to: string): string[] {
	const days: string[] = [];
	let current = from;
	while (current <= to && days.length < 400) {
		days.push(current);
		current = addDays(current, 1);
	}
	return days;
}

/** Whole days from `from` to `to` (may be negative). */
export function differenceInDays(to: string, from: string): number {
	return Math.round((parseDay(to) - parseDay(from)) / 86_400_000);
}

/** First day of the month containing `day`. */
export function startOfMonth(day: string): string {
	return `${day.slice(0, 7)}-01`;
}

/** Last day of the month containing `day`. */
export function endOfMonth(day: string): string {
	const [year, month] = day.split('-').map(Number);
	return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
