import { describe, expect, it } from 'vitest';
import { countOf, groupByDay, jamaahOf, streakFrom, summarize } from './stats';

function marks(day: string, prayers: string[], jamaah: string[] = []) {
	return prayers.map((prayer) => ({
		day,
		prayer,
		jamaah: jamaah.includes(prayer) ? 1 : 0,
		marked_at: 0
	}));
}

const FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

describe('groupByDay', () => {
	it('groups rows into days and counts them', () => {
		const days = groupByDay([
			...marks('2026-10-30', FIVE, ['isha']),
			...marks('2026-10-31', FIVE.slice(0, 2))
		]);
		expect(days).toHaveLength(2);
		expect(countOf(days[0])).toBe(5);
		expect(jamaahOf(days[0])).toBe(1);
		expect(countOf(days[1])).toBe(2);
	});

	it('sorts days oldest first regardless of input order', () => {
		const days = groupByDay([...marks('2026-10-31', ['fajr']), ...marks('2026-10-30', ['fajr'])]);
		expect(days.map((day) => day.day)).toEqual(['2026-10-30', '2026-10-31']);
	});
});

describe('streakFrom', () => {
	it('counts back from today when today already has four', () => {
		const days = groupByDay([
			...marks('2026-10-31', FIVE),
			...marks('2026-10-30', FIVE),
			...marks('2026-10-29', FIVE.slice(0, 4))
		]);
		expect(streakFrom(days, '2026-10-31')).toBe(3);
	});

	it('does not break the streak on an unfinished today', () => {
		const days = groupByDay([
			...marks('2026-10-31', ['fajr']),
			...marks('2026-10-30', FIVE),
			...marks('2026-10-29', FIVE)
		]);
		expect(streakFrom(days, '2026-10-31')).toBe(2);
	});

	it('stops at a day with fewer than four', () => {
		const days = groupByDay([
			...marks('2026-10-31', FIVE),
			...marks('2026-10-30', FIVE),
			...marks('2026-10-29', FIVE.slice(0, 3)),
			...marks('2026-10-28', FIVE)
		]);
		expect(streakFrom(days, '2026-10-31')).toBe(2);
	});

	it('is zero with no marks at all', () => {
		expect(streakFrom([], '2026-10-31')).toBe(0);
	});
});

describe('summarize', () => {
	it('builds a seven day window ending today', () => {
		const days = groupByDay([...marks('2026-10-31', FIVE, ['fajr', 'dhuhr'])]);
		const summary = summarize(days, '2026-10-31');
		expect(summary.week).toHaveLength(7);
		expect(summary.week[6].day).toBe('2026-10-31');
		expect(summary.week[0].day).toBe('2026-10-25');
		expect(summary.todayCount).toBe(5);
		expect(summary.todayJamaah).toBe(2);
		expect(summary.weekCount).toBe(5);
	});

	it('counts a mark that is outside the week only in the streak', () => {
		const days = groupByDay([
			...marks('2026-10-01', FIVE),
			...marks('2026-10-31', FIVE.slice(0, 2))
		]);
		const summary = summarize(days, '2026-10-31');
		expect(summary.weekCount).toBe(2);
		expect(summary.streak).toBe(0);
	});
});
