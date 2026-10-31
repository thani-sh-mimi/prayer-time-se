import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import { addDays, today as todayInStockholm } from './days';
import { ACTIVE_WINDOW_DAYS, QUIET_THRESHOLD, QUIET_WINDOW_DAYS, TRACKED_PER_DAY } from './tracking';

export interface SweepResult {
	day: string;
	checked: number;
	quiet: number;
	notified: number;
}

/**
 * The daily job behind "support each other".
 *
 * A user is quiet when they marked QUIET_THRESHOLD prayers or fewer over the
 * last three completed days, and they are still using the app (something marked
 * in the last two weeks) — somebody who left is not a project. Every accepted
 * friend of a quiet user gets one in-app notification per window, idempotent by
 * dedupe key, so a retried cron cannot double-notify.
 */
export async function runDailySweep(db: D1Database, now = Date.now()): Promise<SweepResult> {
	const day = todayInStockholm(now);
	const windowEnd = addDays(day, -1);
	const windowStart = addDays(day, -QUIET_WINDOW_DAYS);
	const activeFrom = addDays(day, -ACTIVE_WINDOW_DAYS);

	const active = await db
		.prepare('SELECT DISTINCT user_id FROM prayer_marks WHERE day >= ?')
		.bind(activeFrom)
		.all<{ user_id: string }>();
	const activeIds = (active.results ?? []).map((row) => row.user_id);

	if (activeIds.length === 0) {
		return { day, checked: 0, quiet: 0, notified: 0 };
	}

	const counts = await db
		.prepare(
			`SELECT user_id, COUNT(*) AS count
			 FROM prayer_marks
			 WHERE day >= ? AND day <= ?
			 GROUP BY user_id`
		)
		.bind(windowStart, windowEnd)
		.all<{ user_id: string; count: number }>();

	const countByUser = new Map((counts.results ?? []).map((row) => [row.user_id, Number(row.count)]));
	const quietIds = activeIds.filter((id) => (countByUser.get(id) ?? 0) <= QUIET_THRESHOLD);

	if (quietIds.length === 0) {
		return { day, checked: activeIds.length, quiet: 0, notified: 0 };
	}

	const placeholders = quietIds.map(() => '?').join(',');
	const friendships = await db
		.prepare(
			`SELECT id, requester_id, addressee_id
			 FROM friendships
			 WHERE status = 'accepted'
			   AND (requester_id IN (${placeholders}) OR addressee_id IN (${placeholders}))`
		)
		.bind(...quietIds, ...quietIds)
		.all<{ id: string; requester_id: string; addressee_id: string }>();

	const statements: D1PreparedStatement[] = [];
	const createdAt = now;
	const quietSet = new Set(quietIds);

	for (const friendship of friendships.results ?? []) {
		const subject = quietSet.has(friendship.requester_id)
			? friendship.requester_id
			: friendship.addressee_id;
		const supporter =
			subject === friendship.requester_id ? friendship.addressee_id : friendship.requester_id;
		const count = countByUser.get(subject) ?? 0;
		const dedupeKey = `quiet:${supporter}:${subject}:${windowEnd}`;
		const id = `ntf_${crypto.randomUUID()}`;
		statements.push(
			db
				.prepare(
					`INSERT OR IGNORE INTO notifications
					 (id, user_id, type, subject_user_id, context, dedupe_key, created_at)
					 VALUES (?, ?, 'friend_quiet', ?, ?, ?, ?)`
				)
				.bind(
					id,
					supporter,
					subject,
					JSON.stringify({
						count,
						total: QUIET_WINDOW_DAYS * TRACKED_PER_DAY,
						windowStart,
						windowEnd
					}),
					dedupeKey,
					createdAt
				)
		);
	}

	if (statements.length > 0) {
		await db.batch(statements);
	}

	return {
		day,
		checked: activeIds.length,
		quiet: quietIds.length,
		notified: statements.length
	};
}
