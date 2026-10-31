import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, differenceInDays, isValidDay, today } from './days';

describe('days', () => {
	it('formats today in Stockholm, not UTC', () => {
		// Stockholm is UTC+2 in summer, so the date flips at 22:00 UTC.
		expect(today(Date.UTC(2026, 5, 30, 22, 30))).toBe('2026-07-01');
		expect(today(Date.UTC(2026, 5, 30, 21, 59))).toBe('2026-06-30');
		// And at 23:00 UTC in winter (UTC+1) it is already the next day.
		expect(today(Date.UTC(2026, 0, 31, 23, 30))).toBe('2026-02-01');
	});

	it('shifts days across month and year boundaries', () => {
		expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
		expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
		expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
	});

	it('rejects impossible dates', () => {
		expect(isValidDay('2026-02-30')).toBe(false);
		expect(isValidDay('2026-2-3')).toBe(false);
		expect(isValidDay('2026-02-03')).toBe(true);
	});

	it('counts days between and lists inclusive ranges', () => {
		expect(differenceInDays('2026-03-01', '2026-02-28')).toBe(1);
		expect(daysBetween('2026-02-27', '2026-03-01')).toEqual([
			'2026-02-27',
			'2026-02-28',
			'2026-03-01'
		]);
	});
});
