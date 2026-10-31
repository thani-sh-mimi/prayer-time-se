import { Hono } from 'hono';
import type { Context } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import { Env } from '../../cf-types';
import { currentUser, type SessionUser } from '../lib/auth';
import { addDays, daysBetween, isValidDay, today as todayInStockholm } from '../lib/days';
import {
	countOf,
	groupByDay,
	groupRowsByUser,
	jamaahOf,
	loadMarks,
	loadMarksForUsers,
	summarize,
	type DayRecord,
	type MarkRow
} from '../lib/stats';
import {
	BACKFILL_DAYS,
	PRAYERS,
	QUIET_THRESHOLD,
	QUIET_WINDOW_DAYS,
	TRACKED_PER_DAY,
	isPrayer,
	type Prayer
} from '../lib/tracking';

const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

/**
 * Better Auth owns sign-up, sign-in and sign-out (mounted at /auth/*), so this
 * file only needs to resolve the session and answer 401 when it is missing.
 */
async function requireUser(c: Context<{ Bindings: Env }>): Promise<SessionUser | null> {
	const user = await currentUser(c.env, c.req.raw.headers);
	if (!user) {
		c.status(401);
	}
	return user;
}
const DEFAULT_NUDGE = 'Jag tänker på dig. Hur går det med bönerna?';
const MAX_FRIENDS = 50;

function badRequest(c: Context<{ Bindings: Env }>, error: string) {
	c.status(400);
	return c.json({ error });
}

function normalizeHandle(value: unknown): string {
	return typeof value === 'string' ? value.trim().toLowerCase().replace(/^@/, '') : '';
}

function parseContext(value: string | null): Record<string, unknown> | null {
	if (!value) {
		return null;
	}
	try {
		const parsed = JSON.parse(value);
		return typeof parsed === 'object' && parsed !== null ? parsed : null;
	} catch {
		return null;
	}
}

/** Ids of everyone this user is accepted friends with. */
async function acceptedFriendIds(db: D1Database, userId: string): Promise<string[]> {
	const { results } = await db
		.prepare(
			`SELECT requester_id, addressee_id FROM friendships
			 WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)`
		)
		.bind(userId, userId)
		.all<{ requester_id: string; addressee_id: string }>();
	return (results ?? []).map((row) =>
		row.requester_id === userId ? row.addressee_id : row.requester_id
	);
}

async function areFriends(db: D1Database, a: string, b: string): Promise<boolean> {
	const row = await db
		.prepare(
			`SELECT id FROM friendships
			 WHERE status = 'accepted'
			   AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`
		)
		.bind(a, b, b, a)
		.first();
	return Boolean(row);
}

async function notify(
	db: D1Database,
	userId: string,
	type: string,
	subjectUserId: string | null,
	context: Record<string, unknown> | null
) {
	await db
		.prepare(
			`INSERT INTO notifications (id, user_id, type, subject_user_id, context, dedupe_key, created_at)
			 VALUES (?, ?, ?, ?, ?, NULL, ?)`
		)
		.bind(
			newId('ntf'),
			userId,
			type,
			subjectUserId,
			context ? JSON.stringify(context) : null,
			Date.now()
		)
		.run();
}

function withJamaah(
	day: DayRecord
): { day: string; prayers: Record<string, { jamaah: boolean; markedAt: number }>; count: number; jamaah: number } {
	return {
		day: day.day,
		prayers: day.prayers as Record<string, { jamaah: boolean; markedAt: number }>,
		count: countOf(day),
		jamaah: jamaahOf(day)
	};
}

export function registerV2(app: Hono<{ Bindings: Env }>) {
	// ---------------------------------------------------------------- accounts
	//
	// Sign-up, sign-in and sign-out are Better Auth's endpoints, mounted in
	// src/index.ts at /auth/*; the website calls them through the same proxy.

	// -------------------------------------------------------------------- me

	app.get('/v2/me', async (c) => {
		const me = await requireUser(c);
		if (!me) {
			return c.json({ error: 'unauthorized' });
		}

		const day = todayInStockholm();
		const rows = await loadMarks(c.env.db, me.id, addDays(day, -30), day);
		const summary = summarize(groupByDay(rows), day);
		return c.json({ user: me, summary });
	});

	// --------------------------------------------------------------- tracking

	app.get('/v2/tracker', async (c) => {
		const me = await requireUser(c);
		if (!me) {
			return c.json({ error: 'unauthorized' });
		}

		const day = todayInStockholm();
		const requested = Number(c.req.query('days') ?? 35);
		const days = Math.min(Math.max(Number.isFinite(requested) ? requested : 35, 7), 120);
		const from = addDays(day, -days + 1);

		const rows = await loadMarks(c.env.db, me.id, from, day);
		const grouped = groupByDay(rows);
		const summary = summarize(grouped, day);

		return c.json({
			summary,
			days: grouped.map(withJamaah),
			prayers: PRAYERS
		});
	});

	app.post('/v2/tracker/marks', async (c) => {
		const me = await requireUser(c);
		if (!me) {
			return c.json({ error: 'unauthorized' });
		}

		const body = await c.req.json().catch(() => null);
		if (!body) {
			return badRequest(c, 'invalid_body');
		}

		const day = typeof body.day === 'string' ? body.day : '';
		const prayer = body.prayer;
		const jamaah = body.jamaah === true || body.jamaah === 1;

		if (!isValidDay(day)) {
			return badRequest(c, 'invalid_day');
		}
		if (!isPrayer(prayer)) {
			return badRequest(c, 'invalid_prayer');
		}

		const today = todayInStockholm();
		const earliest = addDays(today, -BACKFILL_DAYS);
		if (day > today) {
			return badRequest(c, 'day_in_future');
		}
		if (day < earliest) {
			return badRequest(c, 'day_too_old');
		}

		await c.env.db
			.prepare(
				`INSERT INTO prayer_marks (user_id, day, prayer, jamaah, marked_at)
				 VALUES (?, ?, ?, ?, ?)
				 ON CONFLICT(user_id, day, prayer)
				 DO UPDATE SET jamaah = excluded.jamaah, marked_at = excluded.marked_at`
			)
			.bind(me.id, day, prayer, jamaah ? 1 : 0, Date.now())
			.run();

		const rows = await loadMarks(c.env.db, me.id, addDays(today, -30), today);
		return c.json({ ok: true, summary: summarize(groupByDay(rows), today) });
	});

	app.delete('/v2/tracker/marks/:day/:prayer', async (c) => {
		const me = await requireUser(c);
		if (!me) {
			return c.json({ error: 'unauthorized' });
		}

		const day = c.req.param('day');
		const prayer = c.req.param('prayer') as Prayer;
		if (!isValidDay(day) || !isPrayer(prayer)) {
			return badRequest(c, 'invalid_mark');
		}

		await c.env.db
			.prepare('DELETE FROM prayer_marks WHERE user_id = ? AND day = ? AND prayer = ?')
			.bind(me.id, day, prayer)
			.run();

		const today = todayInStockholm();
		const rows = await loadMarks(c.env.db, me.id, addDays(today, -30), today);
		return c.json({ ok: true, summary: summarize(groupByDay(rows), today) });
	});

	// ---------------------------------------------------------------- friends

	app.get('/v2/friends', async (c) => {
		const me = await requireUser(c);
		if (!me) {
			return c.json({ error: 'unauthorized' });
		}

		const { results: links } = await c.env.db
			.prepare(
				`SELECT f.id, f.requester_id, f.addressee_id, f.status, f.created_at,
				        u.id AS other_id, u.username AS other_handle, u.name AS other_name
				 FROM friendships f
				 JOIN "user" u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
				 WHERE f.requester_id = ? OR f.addressee_id = ?`
			)
			.bind(me.id, me.id, me.id)
			.all<{
				id: string;
				requester_id: string;
				addressee_id: string;
				status: string;
				created_at: number;
				other_id: string;
				other_handle: string;
				other_name: string;
			}>();

		const rows = links ?? [];
		const friendIds = rows.filter((row) => row.status === 'accepted').map((row) => row.other_id);

		const today = todayInStockholm();
		const from = addDays(today, -QUIET_WINDOW_DAYS - 4);
		const markRows = await loadMarksForUsers(c.env.db, friendIds, from, today);
		const marksByUser = groupRowsByUser(markRows);

		const { results: recentNudges } = friendIds.length
			? await c.env.db
					.prepare(
						`SELECT to_user_id, MAX(created_at) AS last FROM nudges
						 WHERE from_user_id = ? GROUP BY to_user_id`
					)
					.bind(me.id)
					.all<{ to_user_id: string; last: number }>()
			: { results: [] as { to_user_id: string; last: number }[] };
		const lastNudge = new Map((recentNudges ?? []).map((row) => [row.to_user_id, Number(row.last)]));

		const quietWindowEnd = addDays(today, -1);
		const quietWindowStart = addDays(today, -QUIET_WINDOW_DAYS);
		const weekStart = addDays(today, -6);

		const friends = rows
			.filter((row) => row.status === 'accepted')
			.map((row) => {
				const days = marksByUser.get(row.other_id) ?? [];
				const byDay = new Map(days.map((day) => [day.day, day]));
				let weekCount = 0;
				let weekJamaah = 0;
				for (let offset = 0; offset < 7; offset++) {
					const day = byDay.get(addDays(weekStart, offset));
					weekCount += countOf(day);
					weekJamaah += jamaahOf(day);
				}
				let quietCount = 0;
				for (let offset = 0; offset < QUIET_WINDOW_DAYS; offset++) {
					quietCount += countOf(byDay.get(addDays(quietWindowStart, offset)));
				}
				const lastMarkedDay = days.length ? days[days.length - 1].day : null;
				const nudgedAt = lastNudge.get(row.other_id) ?? 0;
				return {
					id: row.other_id,
					handle: row.other_handle,
					displayName: row.other_name,
					weekCount,
					weekJamaah,
					quiet: quietCount <= QUIET_THRESHOLD,
					quietCount,
					lastMarkedDay,
					canNudge: Date.now() - nudgedAt > 24 * 60 * 60 * 1000
				};
			})
			.sort((a, b) => a.displayName.localeCompare(b.displayName, 'sv'));

		return c.json({
			friends,
			incoming: rows
				.filter((row) => row.status === 'pending' && row.addressee_id === me.id)
				.map((row) => ({
					id: row.id,
					user: { id: row.other_id, handle: row.other_handle, displayName: row.other_name },
					createdAt: row.created_at
				})),
			outgoing: rows
				.filter((row) => row.status === 'pending' && row.requester_id === me.id)
				.map((row) => ({
					id: row.id,
					user: { id: row.other_id, handle: row.other_handle, displayName: row.other_name },
					createdAt: row.created_at
				})),
			window: { quietDays: QUIET_WINDOW_DAYS, quietThreshold: QUIET_THRESHOLD }
		});
	});

	app.post('/v2/friends/requests', async (c) => {
		const me = await requireUser(c);
		if (!me) {
			return c.json({ error: 'unauthorized' });
		}

		const body = await c.req.json().catch(() => null);
		const handle = normalizeHandle(body?.handle);
		if (!HANDLE_PATTERN.test(handle)) {
			return badRequest(c, 'invalid_handle');
		}
		if (handle === me.handle) {
			return badRequest(c, 'cannot_add_self');
		}

		const target = await c.env.db
			.prepare('SELECT id, username, name FROM "user" WHERE username = ?')
			.bind(handle)
			.first<{ id: string; username: string; name: string }>();
		if (!target) {
			c.status(404);
			return c.json({ error: 'user_not_found' });
		}

		const friendCount = (await acceptedFriendIds(c.env.db, me.id)).length;
		if (friendCount >= MAX_FRIENDS) {
			c.status(409);
			return c.json({ error: 'too_many_friends' });
		}

		const existing = await c.env.db
			.prepare(
				`SELECT id, requester_id, status FROM friendships
				 WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
			)
			.bind(me.id, target.id, target.id, me.id)
			.first<{ id: string; requester_id: string; status: string }>();

		if (existing?.status === 'accepted') {
			c.status(409);
			return c.json({ error: 'already_friends' });
		}

		if (existing?.status === 'pending') {
			// The other side already asked: accept it instead of stacking a
			// second request in the opposite direction.
			if (existing.requester_id !== me.id) {
				await c.env.db
					.prepare(`UPDATE friendships SET status = 'accepted', responded_at = ? WHERE id = ?`)
					.bind(Date.now(), existing.id)
					.run();
				await notify(c.env.db, target.id, 'friend_accepted', me.id, null);
				return c.json({ ok: true, status: 'accepted' });
			}
			return c.json({ ok: true, status: 'pending' });
		}

		const id = newId('frn');
		await c.env.db
			.prepare(
				`INSERT INTO friendships (id, requester_id, addressee_id, status, created_at)
				 VALUES (?, ?, ?, 'pending', ?)`
			)
			.bind(id, me.id, target.id, Date.now())
			.run();

		await notify(c.env.db, target.id, 'friend_request', me.id, null);
		c.status(201);
		return c.json({ ok: true, status: 'pending', id });
	});

	app.post('/v2/friends/requests/:id/accept', async (c) => {
		const me = await requireUser(c);
		if (!me) {
			return c.json({ error: 'unauthorized' });
		}

		const request = await c.env.db
			.prepare(
				`SELECT id, requester_id FROM friendships
				 WHERE id = ? AND addressee_id = ? AND status = 'pending'`
			)
			.bind(c.req.param('id'), me.id)
			.first<{ id: string; requester_id: string }>();
		if (!request) {
			c.status(404);
			return c.json({ error: 'request_not_found' });
		}

		await c.env.db
			.prepare(`UPDATE friendships SET status = 'accepted', responded_at = ? WHERE id = ?`)
			.bind(Date.now(), request.id)
			.run();
		await notify(c.env.db, request.requester_id, 'friend_accepted', me.id, null);

		return c.json({ ok: true });
	});

	app.post('/v2/friends/requests/:id/decline', async (c) => {
		const me = await requireUser(c);
		if (!me) {
			return c.json({ error: 'unauthorized' });
		}

		const result = await c.env.db
			.prepare(
				`DELETE FROM friendships WHERE id = ? AND addressee_id = ? AND status = 'pending'`
			)
			.bind(c.req.param('id'), me.id)
			.run();
		if (!result.meta.changes) {
			c.status(404);
			return c.json({ error: 'request_not_found' });
		}
		return c.json({ ok: true });
	});

	app.delete('/v2/friends/:userId', async (c) => {
		const me = await requireUser(c);
		if (!me) {
			return c.json({ error: 'unauthorized' });
		}

		await c.env.db
			.prepare(
				`DELETE FROM friendships
				 WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`
			)
			.bind(me.id, c.req.param('userId'), c.req.param('userId'), me.id)
			.run();
		return c.json({ ok: true });
	});

	// ----------------------------------------------------------------- nudges

	app.post('/v2/nudges', async (c) => {
		const me = await requireUser(c);
		if (!me) {
			return c.json({ error: 'unauthorized' });
		}

		const body = await c.req.json().catch(() => null);
		const toUserId = typeof body?.toUserId === 'string' ? body.toUserId : '';
		const rawMessage = typeof body?.message === 'string' ? body.message.trim() : '';
		const message = (rawMessage || DEFAULT_NUDGE).slice(0, 200);

		if (!toUserId) {
			return badRequest(c, 'invalid_recipient');
		}
		if (!(await areFriends(c.env.db, me.id, toUserId))) {
			c.status(403);
			return c.json({ error: 'not_friends' });
		}

		const last = await c.env.db
			.prepare(
				`SELECT created_at FROM nudges WHERE from_user_id = ? AND to_user_id = ?
				 ORDER BY created_at DESC LIMIT 1`
			)
			.bind(me.id, toUserId)
			.first<{ created_at: number }>();
		if (last && Date.now() - Number(last.created_at) < 24 * 60 * 60 * 1000) {
			c.status(429);
			return c.json({ error: 'nudge_already_sent' });
		}

		await c.env.db
			.prepare(
				`INSERT INTO nudges (id, from_user_id, to_user_id, message, created_at)
				 VALUES (?, ?, ?, ?, ?)`
			)
			.bind(newId('ndg'), me.id, toUserId, message, Date.now())
			.run();

		await notify(c.env.db, toUserId, 'nudge', me.id, { message });

		return c.json({ ok: true });
	});

	// ---------------------------------------------------------- notifications

	app.get('/v2/notifications', async (c) => {
		const me = await requireUser(c);
		if (!me) {
			return c.json({ error: 'unauthorized' });
		}

		const { results } = await c.env.db
			.prepare(
				`SELECT n.id, n.type, n.context, n.created_at, n.read_at,
				        u.id AS subject_id, u.username AS subject_handle, u.name AS subject_name
				 FROM notifications n
				 LEFT JOIN "user" u ON u.id = n.subject_user_id
				 WHERE n.user_id = ?
				 ORDER BY n.created_at DESC
				 LIMIT 50`
			)
			.bind(me.id)
			.all<{
				id: string;
				type: string;
				context: string | null;
				created_at: number;
				read_at: number | null;
				subject_id: string | null;
				subject_handle: string | null;
				subject_name: string | null;
			}>();

		const items = (results ?? []).map((row) => ({
			id: row.id,
			type: row.type,
			context: parseContext(row.context),
			createdAt: Number(row.created_at),
			readAt: row.read_at ? Number(row.read_at) : null,
			subject: row.subject_id
				? { id: row.subject_id, handle: row.subject_handle!, displayName: row.subject_name! }
				: null
		}));

		const unread = await c.env.db
			.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL')
			.bind(me.id)
			.first<{ count: number }>();

		return c.json({ items, unread: Number(unread?.count ?? 0) });
	});

	app.post('/v2/notifications/read', async (c) => {
		const me = await requireUser(c);
		if (!me) {
			return c.json({ error: 'unauthorized' });
		}

		const body = await c.req.json().catch(() => null);
		const ids: string[] = Array.isArray(body?.ids)
			? body.ids.filter((id: unknown) => typeof id === 'string')
			: [];

		if (ids.length === 0) {
			await c.env.db
				.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL')
				.bind(Date.now(), me.id)
				.run();
		} else {
			const placeholders = ids.map(() => '?').join(',');
			await c.env.db
				.prepare(
					`UPDATE notifications SET read_at = ?
					 WHERE user_id = ? AND read_at IS NULL AND id IN (${placeholders})`
				)
				.bind(Date.now(), me.id, ...ids)
				.run();
		}

		return c.json({ ok: true });
	});
}

/** Re-exported for tests and the scheduled handler. */
export type { SessionUser, MarkRow };
