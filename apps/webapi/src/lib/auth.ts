import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { username } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import type { Env } from '../../cf-types';

/**
 * Authentication is Better Auth's job: password hashing (scrypt), session
 * tokens, cookie signing and the sign-in/throttling endpoints.
 *
 * The app still has no email: an account is a handle plus a password. Better
 * Auth's schema requires an email, so one is derived from the handle in a
 * domain that can never receive mail (RFC 2606 `.invalid`). Nothing is ever
 * sent to it, and it is never shown.
 */
export const EMAIL_DOMAIN = 'tracker.invalid';

export function emailForHandle(handle: string): string {
	return `${handle.toLowerCase()}@${EMAIL_DOMAIN}`;
}

const DEV_SECRET = 'dev-only-secret-not-for-production-0123456789';

function createAuth(env: Env) {
	const baseURL = env.BETTER_AUTH_URL ?? 'http://localhost:5173';
	const secure = baseURL.startsWith('https://');
	const trustedOrigins = (env.AUTH_TRUSTED_ORIGINS ?? baseURL)
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);

	return betterAuth({
		appName: 'Bönetider',
		baseURL,
		basePath: '/auth',
		secret: env.BETTER_AUTH_SECRET ?? DEV_SECRET,
		trustedOrigins,
		database: drizzleAdapter(drizzle(env.db), {
			provider: 'sqlite',
			schema
		}),
		emailAndPassword: {
			enabled: true,
			minPasswordLength: 8,
			maxPasswordLength: 200,
			requireEmailVerification: false
		},
		session: {
			expiresIn: 60 * 60 * 24 * 30,
			updateAge: 60 * 60 * 24
		},
		user: {
			changeEmail: { enabled: false },
			deleteUser: { enabled: false }
		},
		plugins: [
			username({
				minUsernameLength: 3,
				maxUsernameLength: 20,
				usernameValidator: (value) => /^[a-z0-9_]{3,20}$/.test(value)
			})
		],
		advanced: {
			cookiePrefix: 'bt',
			// `useSecureCookies` would otherwise follow NODE_ENV, which is not
			// set in a Worker: the cookie would be marked Secure while local
			// development runs over http and the browser would drop it.
			useSecureCookies: secure
		}
	});
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * One instance per Worker environment. Building the config on every request
 * would re-create the adapter and the schema validation each time.
 */
const cache = new WeakMap<object, Auth>();

export function getAuth(env: Env): Auth {
	const key = env as unknown as object;
	const existing = cache.get(key);
	if (existing) {
		return existing;
	}
	const created = createAuth(env);
	cache.set(key, created);
	return created;
}

export interface SessionUser {
	id: string;
	handle: string;
	displayName: string;
}

/** The signed-in user, or null. */
export async function currentUser(
	env: Env,
	headers: Headers
): Promise<SessionUser | null> {
	const result = await getAuth(env).api.getSession({ headers });
	if (!result) {
		return null;
	}
	const { user } = result;
	return {
		id: user.id,
		handle: user.username ?? user.email.split('@')[0],
		displayName: user.name
	};
}
