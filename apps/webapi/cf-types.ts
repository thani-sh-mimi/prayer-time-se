import type { D1Database } from '@cloudflare/workers-types';

export interface Env {
	db: D1Database;
	/** Public origin of the site, e.g. https://xn--bnetider-n4a.nu. */
	BETTER_AUTH_URL?: string;
	/** Signing secret for Better Auth sessions; set with `wrangler secret put`. */
	BETTER_AUTH_SECRET?: string;
	/** Comma-separated extra origins allowed to call the auth endpoints. */
	AUTH_TRUSTED_ORIGINS?: string;
}
