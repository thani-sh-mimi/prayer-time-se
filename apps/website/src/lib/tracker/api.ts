/**
 * Thin client for the tracker API.
 *
 * Every call goes to /api/v2/* on this origin; the SvelteKit route at
 * src/routes/api/[...path] forwards it to the Worker. Same-origin means the
 * session cookie is first-party and survives Safari's third-party cookie
 * blocking — which matters because the app is mostly used on iPhones.
 */

export type Prayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYERS: Prayer[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export interface TrackerUser {
	id: string;
	handle: string;
	displayName: string;
}

export interface WeekDay {
	day: string;
	count: number;
	jamaah: number;
}

export interface Summary {
	today: string;
	todayCount: number;
	todayJamaah: number;
	weekCount: number;
	weekJamaah: number;
	streak: number;
	week: WeekDay[];
}

export interface Mark {
	jamaah: boolean;
	markedAt: number;
}

export interface TrackerDay {
	day: string;
	prayers: Partial<Record<Prayer, Mark>>;
	count: number;
	jamaah: number;
}

export interface Friend {
	id: string;
	handle: string;
	displayName: string;
	weekCount: number;
	weekJamaah: number;
	quiet: boolean;
	quietCount: number;
	lastMarkedDay: string | null;
	canNudge: boolean;
}

export interface FriendRequest {
	id: string;
	user: TrackerUser;
	createdAt: number;
}

export type NotificationType = 'friend_quiet' | 'nudge' | 'friend_request' | 'friend_accepted';

export interface TrackerNotification {
	id: string;
	type: NotificationType;
	context: Record<string, unknown> | null;
	createdAt: number;
	readAt: number | null;
	subject: TrackerUser | null;
}

export class ApiError extends Error {
	status: number;
	code: string;

	constructor(status: number, code: string) {
		super(code);
		this.status = status;
		this.code = code;
	}
}

async function send<T>(url: string, options: RequestInit = {}): Promise<T> {
	const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
	if (options.body !== undefined) {
		headers['content-type'] = 'application/json';
	}

	const response = await fetch(url, {
		...options,
		headers,
		credentials: 'same-origin'
	});

	const text = await response.text();
	const body = text ? JSON.parse(text) : null;

	if (!response.ok) {
		// Better Auth answers with { code }, the tracker's own routes with { error }.
		throw new ApiError(response.status, body?.code ?? body?.error ?? 'request_failed');
	}
	return body as T;
}

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	return send<T>(`/api/v2${path}`, options);
}

export const api = {
	me: () => request<{ user: TrackerUser; summary: Summary }>('/me'),

	/**
	 * Sign-up, sign-in and sign-out are Better Auth's endpoints, reached through
	 * the same proxy. The app has no email: one is derived from the handle in a
	 * domain that cannot receive mail (RFC 2606 `.invalid`).
	 */
	register: (handle: string, displayName: string, password: string) =>
		send<{ user: TrackerUser }>('/api/auth/sign-up/email', {
			method: 'POST',
			body: JSON.stringify({
				email: `${handle}@tracker.invalid`,
				password,
				name: displayName,
				username: handle
			})
		}),

	login: (handle: string, password: string) =>
		send<{ user: TrackerUser }>('/api/auth/sign-in/username', {
			method: 'POST',
			body: JSON.stringify({ username: handle, password })
		}),

	logout: () => send<{ success: boolean }>('/api/auth/sign-out', { method: 'POST', body: '{}' }),

	tracker: (days = 120) =>
		request<{ summary: Summary; days: TrackerDay[]; prayers: Prayer[] }>(`/tracker?days=${days}`),

	mark: (day: string, prayer: Prayer, jamaah: boolean) =>
		request<{ ok: true; summary: Summary }>('/tracker/marks', {
			method: 'POST',
			body: JSON.stringify({ day, prayer, jamaah })
		}),

	unmark: (day: string, prayer: Prayer) =>
		request<{ ok: true; summary: Summary }>(`/tracker/marks/${day}/${prayer}`, {
			method: 'DELETE'
		}),

	friends: () =>
		request<{ friends: Friend[]; incoming: FriendRequest[]; outgoing: FriendRequest[] }>(
			'/friends'
		),

	requestFriend: (handle: string) =>
		request<{ ok: true; status: 'pending' | 'accepted' }>('/friends/requests', {
			method: 'POST',
			body: JSON.stringify({ handle })
		}),

	accept: (id: string) =>
		request<{ ok: true }>(`/friends/requests/${id}/accept`, { method: 'POST' }),

	decline: (id: string) =>
		request<{ ok: true }>(`/friends/requests/${id}/decline`, { method: 'POST' }),

	removeFriend: (userId: string) =>
		request<{ ok: true }>(`/friends/${userId}`, { method: 'DELETE' }),

	nudge: (toUserId: string, message: string) =>
		request<{ ok: true }>('/nudges', {
			method: 'POST',
			body: JSON.stringify({ toUserId, message })
		}),

	notifications: () => request<{ items: TrackerNotification[]; unread: number }>('/notifications'),

	readNotifications: () =>
		request<{ ok: true }>('/notifications/read', { method: 'POST', body: '{}' })
};

/** The local date in Stockholm as YYYY-MM-DD. */
export function localDay(date: Date = new Date()): string {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Europe/Stockholm',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(date);
	const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
	return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Shift a YYYY-MM-DD string by a number of days. */
export function shiftDay(day: string, delta: number): string {
	const [year, month, date] = day.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, date) + delta * 86_400_000).toISOString().slice(0, 10);
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
