import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Env } from '../../cf-types';

/**
 * Password hashing with PBKDF2-SHA256. The iteration count is a deliberate
 * compromise: Workers bills CPU time, and a login is the only place that pays
 * it. 100k iterations costs roughly 40-60ms on the edge runtime.
 */
const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

export const SESSION_COOKIE = 'bt_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function toBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
		key,
		KEY_LENGTH * 8
	);
	return new Uint8Array(bits);
}

/** Hash a password into `pbkdf2$iterations$salt$hash`. */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
	const hash = await derive(password, salt, ITERATIONS);
	return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Compare a password against a stored hash in constant time. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [scheme, iterations, salt, hash] = stored.split('$');
	if (scheme !== 'pbkdf2' || !iterations || !salt || !hash) {
		return false;
	}
	const expected = fromBase64(hash);
	const actual = await derive(password, fromBase64(salt), Number(iterations));
	if (actual.length !== expected.length) {
		return false;
	}
	let difference = 0;
	for (let i = 0; i < actual.length; i++) {
		difference |= actual[i] ^ expected[i];
	}
	return difference === 0;
}

/** A random, URL-safe token. */
export function randomToken(bytes = 32): string {
	const buffer = crypto.getRandomValues(new Uint8Array(bytes));
	return toBase64(buffer).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/** SHA-256 of a session token, which is what the database stores. */
export async function hashToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return toBase64(new Uint8Array(digest));
}

/** New id for a row. */
export function newId(prefix: string): string {
	return `${prefix}_${randomToken(12)}`;
}

/** Create a session and attach the cookie to the response. */
export async function startSession(c: Context<{ Bindings: Env }>, userId: string): Promise<void> {
	const db = c.env.db;
	const token = randomToken();
	const tokenHash = await hashToken(token);
	const now = Date.now();
	await db
		.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
		.bind(tokenHash, userId, now, now + SESSION_TTL_SECONDS * 1000)
		.run();

	const secure = new URL(c.req.url).protocol === 'https:';
	setCookie(c, SESSION_COOKIE, token, {
		httpOnly: true,
		sameSite: 'Lax',
		secure,
		path: '/',
		maxAge: SESSION_TTL_SECONDS
	});
}

/** Remove the current session, if any. */
export async function endSession(c: Context<{ Bindings: Env }>): Promise<void> {
	const token = getCookie(c, SESSION_COOKIE);
	if (token) {
		const tokenHash = await hashToken(token);
		await c.env.db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
	}
	deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export interface SessionUser {
	id: string;
	handle: string;
	displayName: string;
}

/** Resolve the signed-in user, or null. */
export async function currentUser(c: Context<{ Bindings: Env }>): Promise<SessionUser | null> {
	const token = getCookie(c, SESSION_COOKIE);
	if (!token) {
		return null;
	}
	const tokenHash = await hashToken(token);
	const row = await c.env.db
		.prepare(
			`SELECT u.id, u.handle, u.display_name AS displayName, s.expires_at AS expiresAt
			 FROM sessions s JOIN users u ON u.id = s.user_id
			 WHERE s.token_hash = ?`
		)
		.bind(tokenHash)
		.first<SessionUser & { expiresAt: number }>();

	if (!row) {
		return null;
	}
	if (row.expiresAt < Date.now()) {
		await c.env.db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
		return null;
	}
	return { id: row.id, handle: row.handle, displayName: row.displayName };
}

/** Reject the request unless a session is present. */
export async function requireUser(c: Context<{ Bindings: Env }>): Promise<SessionUser | null> {
	const user = await currentUser(c);
	if (!user) {
		c.status(401);
		return null;
	}
	return user;
}
