#!/usr/bin/env node
/**
 * End-to-end check of the prayer tracker against a running Worker.
 *
 *   API_BASE=http://127.0.0.1:8799 node scripts/e2e-social.mjs
 *
 * The Worker must be started with `wrangler dev --test-scheduled` so the daily
 * sweep can be triggered through /__scheduled. Every assertion is a real HTTP
 * call against the real D1 database — nothing is mocked.
 */

const BASE = process.env.API_BASE ?? 'http://127.0.0.1:8799';
const ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:5173';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail) {
	if (condition) {
		passed++;
		console.log(`  ok   ${name}`);
	} else {
		failed++;
		failures.push(name);
		console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
	}
}

/** One HTTP client with a cookie jar; the app only ever uses one session. */
function client() {
	const jar = new Map();
	return {
		async request(path, options = {}) {
			// Better Auth rejects a state-changing request without an Origin,
			// so the client sends the same one a browser would.
			const headers = { origin: ORIGIN, ...(options.headers ?? {}) };
			if (jar.size) {
				headers.cookie = [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
			}
			if (options.body !== undefined) {
				headers['content-type'] = 'application/json';
			}
			const response = await fetch(`${BASE}${path}`, {
				method: options.method ?? 'GET',
				headers,
				body: options.body === undefined ? undefined : JSON.stringify(options.body)
			});
			for (const value of response.headers.getSetCookie()) {
				const [pair] = value.split(';');
				const index = pair.indexOf('=');
				const name = pair.slice(0, index);
				const cookieValue = pair.slice(index + 1);
				if (cookieValue === '' || /max-age=0/i.test(value)) {
					jar.delete(name);
				} else {
					jar.set(name, cookieValue);
				}
			}
			const text = await response.text();
			let json = null;
			try {
				json = text ? JSON.parse(text) : null;
			} catch {
				json = { raw: text };
			}
			return { status: response.status, body: json, headers: response.headers };
		}
	};
}

function dayString(offset = 0) {
	const date = new Date(Date.now() + offset * 86_400_000);
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Europe/Stockholm',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(date);
	const get = (type) => parts.find((part) => part.type === type)?.value;
	return `${get('year')}-${get('month')}-${get('day')}`;
}

const suffix = Math.random().toString(36).slice(2, 8);
const handleA = `a_${suffix}`;
const handleB = `b_${suffix}`;
const handleC = `c_${suffix}`;
const password = 'korrekt-häst-batteri';

const alice = client();
const bob = client();
const carol = client();

console.log(`\nAPI ${BASE}\n`);

// ---------------------------------------------------------------- accounts
console.log('accounts');
function signUp(handle, displayName, password) {
	return {
		method: 'POST',
		body: {
			email: `${handle}@tracker.invalid`,
			password,
			name: displayName,
			username: handle
		}
	};
}

let res = await alice.request('/auth/sign-up/email', signUp(handleA, 'Aisha', password));
check('sign-up returns 200', res.status === 200, `got ${res.status}`);
check('sign-up returns the user', res.body?.user?.username === handleA);

res = await bob.request('/auth/sign-up/email', signUp(handleB, 'Bilal', password));
check('second sign-up returns 200', res.status === 200);

res = await carol.request('/auth/sign-up/email', signUp(handleC, 'Chadi', password));
check('third sign-up returns 200', res.status === 200);

res = await client().request('/auth/sign-up/email', signUp(handleA, 'Copy', password));
check(
	'duplicate handle rejected',
	res.status === 400 && res.body?.code === 'USERNAME_IS_ALREADY_TAKEN',
	`got ${res.status} ${JSON.stringify(res.body)}`
);

res = await client().request('/auth/sign-up/email', signUp('x', 'Too short', password));
check('short handle rejected', res.status >= 400 && res.status < 500, `got ${res.status}`);

res = await client().request(
	'/auth/sign-up/email',
	signUp(`d_${suffix}`, 'Dave', 'short')
);
check('short password rejected', res.status >= 400 && res.status < 500, `got ${res.status}`);

res = await client().request('/auth/sign-in/username', {
	method: 'POST',
	body: { username: handleA, password: 'fel-losenord' }
});
check('wrong password rejected with 401', res.status === 401, `got ${res.status}`);

const stranger = client();
res = await stranger.request('/auth/sign-in/username', {
	method: 'POST',
	body: { username: handleA, password }
});
check('sign-in returns 200', res.status === 200, `got ${res.status}`);
res = await stranger.request('/v2/me');
check('sign-in sets a working session cookie', res.status === 200 && res.body?.user?.handle === handleA);

res = await client().request('/v2/me');
check('anonymous /v2/me is 401', res.status === 401);
res = await client().request('/v2/tracker');
check('anonymous /v2/tracker is 401', res.status === 401);

// ---------------------------------------------------------------- tracking
console.log('\ntracking');
const today = dayString();
const yesterday = dayString(-1);

res = await alice.request('/v2/tracker');
check(
	'empty tracker starts at zero',
	res.status === 200 && res.body.summary.todayCount === 0 && res.body.summary.streak === 0
);

const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
for (const [index, prayer] of prayers.entries()) {
	res = await alice.request('/v2/tracker/marks', {
		method: 'POST',
		body: { day: today, prayer, jamaah: index < 2 }
	});
	check(`mark ${prayer}`, res.status === 200 && res.body.summary.todayCount === index + 1);
}

res = await alice.request('/v2/tracker');
check('five marks = 5/5 today', res.body.summary.todayCount === 5);
check('two marks prayed in group', res.body.summary.todayJamaah === 2);
check('one day streak', res.body.summary.streak === 1);
check('week total is 5', res.body.summary.weekCount === 5);

res = await alice.request('/v2/tracker/marks', {
	method: 'POST',
	body: { day: today, prayer: 'fajr', jamaah: false }
});
check('marking again updates instead of duplicating', res.body.summary.todayCount === 5 && res.body.summary.todayJamaah === 1);

res = await alice.request('/v2/tracker/marks', {
	method: 'POST',
	body: { day: dayString(1), prayer: 'fajr' }
});
check('cannot mark the future', res.status === 400 && res.body.error === 'day_in_future');

res = await alice.request('/v2/tracker/marks', {
	method: 'POST',
	body: { day: dayString(-8), prayer: 'fajr' }
});
check('cannot backfill beyond a week', res.status === 400 && res.body.error === 'day_too_old');

res = await alice.request('/v2/tracker/marks', {
	method: 'POST',
	body: { day: today, prayer: 'tahajjud' }
});
check('unknown prayer rejected', res.status === 400 && res.body.error === 'invalid_prayer');

res = await alice.request(`/v2/tracker/marks/${yesterday}/isha`, { method: 'DELETE' });
check('deleting an unmarked prayer is harmless', res.status === 200);

res = await carol.request('/v2/tracker');
check('another account sees none of it', res.status === 200 && res.body.summary.weekCount === 0);

// ----------------------------------------------------------------- friends
console.log('\nfriends');
res = await alice.request('/v2/friends/requests', {
	method: 'POST',
	body: { handle: handleB }
});
check('friend request created', res.status === 201 && res.body.status === 'pending');

res = await alice.request('/v2/friends/requests', {
	method: 'POST',
	body: { handle: handleA }
});
check('cannot add yourself', res.status === 400 && res.body.error === 'cannot_add_self');

res = await bob.request('/v2/friends');
check('request is visible to the addressee', res.body.incoming.length === 1);
const requestId = res.body.incoming[0]?.id;

res = await alice.request('/v2/friends');
check('pending friends are not listed as friends', res.body.friends.length === 0);
check('outgoing request is listed', res.body.outgoing.length === 1);

res = await carol.request('/v2/friends/requests', {
	method: 'POST',
	body: { handle: handleA }
});
check('a third account can also ask', res.status === 201);

res = await bob.request(`/v2/friends/requests/${requestId}/accept`, { method: 'POST' });
check('accept works', res.status === 200);

res = await bob.request('/v2/friends');
check('accepted friend is listed', res.body.friends.length === 1 && res.body.friends[0].handle === handleA);
check(
	'friend sees the week count, not the individual marks',
	res.body.friends[0].weekCount === 5 &&
		res.body.friends[0].weekJamaah === 1 &&
		res.body.friends[0].marks === undefined
);

res = await carol.request('/v2/nudges', {
	method: 'POST',
	body: { toUserId: res.body.friends[0].id }
});
check('non-friend nudge refused with 403', res.status === 403);

res = await bob.request('/v2/nudges', {
	method: 'POST',
	body: { toUserId: (await bob.request('/v2/friends')).body.friends[0].id }
});
check('friend nudge accepted', res.status === 200);

res = await bob.request('/v2/nudges', {
	method: 'POST',
	body: { toUserId: (await bob.request('/v2/friends')).body.friends[0].id }
});
check('second nudge within a day is rate limited', res.status === 429);

const bobId = (await bob.request('/v2/me')).body.user.id;
res = await alice.request('/v2/notifications');
const nudge = res.body.items.find((item) => item.type === 'nudge');
check('nudge arrives as a notification', Boolean(nudge));
check('nudge carries the sender', nudge?.subject?.handle === handleB);
check('nudge carries the message', typeof nudge?.context?.message === 'string');
check('unread count is not zero', res.body.unread >= 1);

res = await alice.request('/v2/notifications/read', { method: 'POST', body: {} });
check('marking all read works', res.status === 200);
res = await alice.request('/v2/notifications');
check('unread drops to zero', res.body.unread === 0);

// ------------------------------------------------------------------- sweep
console.log('\ndaily sweep');
// Alice is the quiet one: one mark ten days ago keeps her "active", nothing in
// the last three completed days. Bob is her supporter.
res = await alice.request('/v2/tracker/marks', {
	method: 'POST',
	body: { day: dayString(-10), prayer: 'fajr' }
});
check('backfilling ten days ago is refused', res.status === 400 && res.body.error === 'day_too_old');

res = await fetch(`${BASE}/__scheduled?cron=0+19+*+*+*`);
check('scheduled handler ran', res.status === 200, `got ${res.status}`);

res = await bob.request('/v2/notifications');
const quiet = res.body.items.find((item) => item.type === 'friend_quiet');
check('supporter is told a friend went quiet', Boolean(quiet), JSON.stringify(res.body.items));
check('notification names the quiet friend', quiet?.subject?.handle === handleA);
check('notification carries the count', typeof quiet?.context?.count === 'number');

const before = res.body.items.filter((item) => item.type === 'friend_quiet').length;
await fetch(`${BASE}/__scheduled?cron=0+19+*+*+*`);
res = await bob.request('/v2/notifications');
const after = res.body.items.filter((item) => item.type === 'friend_quiet').length;
check('a second sweep does not duplicate', before === after, `${before} vs ${after}`);

res = await alice.request('/v2/notifications');
check(
	'the quiet friend is not told about herself',
	!res.body.items.some((item) => item.type === 'friend_quiet')
);

res = await bob.request('/v2/friends');
check('supporter sees the quiet flag on the friend', res.body.friends[0]?.quiet === true);

// One full day is 5 marks, still under the 6-of-15 threshold; two clears it.
for (const day of [yesterday, dayString(-2)]) {
	for (const prayer of prayers) {
		await alice.request('/v2/tracker/marks', {
			method: 'POST',
			body: { day, prayer, jamaah: false }
		});
	}
}
res = await bob.request('/v2/friends');
check('two full days clear the quiet flag', res.body.friends[0]?.quiet === false);
check('the cleared week total is visible to the friend', res.body.friends[0]?.weekCount === 15);

// ---------------------------------------------------------------- unfriend
console.log('\nfriendship removal');
res = await alice.request(`/v2/friends/${bobId}`, { method: 'DELETE' });
check('unfriend works', res.status === 200);
res = await bob.request('/v2/friends');
check('friendship gone on both sides', res.body.friends.length === 0);

// ----------------------------------------------------------------- logout
console.log('\nsession');
res = await alice.request('/auth/sign-out', { method: 'POST', body: {} });
check('sign-out works', res.status === 200);
res = await alice.request('/v2/me');
check('session is gone after logout', res.status === 401);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
	console.log(`failed: ${failures.join(', ')}`);
	process.exit(1);
}
