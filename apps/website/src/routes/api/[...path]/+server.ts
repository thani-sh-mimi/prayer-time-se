import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

/**
 * Same-origin proxy to the prayer-times Worker.
 *
 * The tracker's session cookie must belong to bönetider.nu, not to the API
 * host: Safari drops third-party cookies, and the login would silently fail on
 * every iPhone. Forwarding through this route keeps the cookie first-party and
 * leaves the Worker's CORS story unchanged.
 */
const DEFAULT_ORIGIN = dev ? 'http://127.0.0.1:8787' : 'https://api.xn--bnetider-n4a.nu';

async function proxy(event: Parameters<RequestHandler>[0]): Promise<Response> {
	const origin = (env.API_ORIGIN ?? DEFAULT_ORIGIN).replace(/\/$/, '');
	const target = `${origin}/${event.params.path}${event.url.search}`;

	const headers = new Headers();
	for (const [key, value] of event.request.headers.entries()) {
		if (key === 'host' || key === 'content-length' || key === 'connection') {
			continue;
		}
		headers.set(key, value);
	}

	const method = event.request.method;
	const body =
		method === 'GET' || method === 'HEAD' ? undefined : await event.request.arrayBuffer();

	const response = await fetch(target, { method, headers, body, redirect: 'manual' });

	const responseHeaders = new Headers();
	for (const [key, value] of response.headers.entries()) {
		if (key === 'content-encoding' || key === 'content-length' || key === 'transfer-encoding') {
			continue;
		}
		responseHeaders.set(key, value);
	}

	return new Response(response.body, { status: response.status, headers: responseHeaders });
}

export const GET: RequestHandler = proxy;
export const POST: RequestHandler = proxy;
export const PUT: RequestHandler = proxy;
export const PATCH: RequestHandler = proxy;
export const DELETE: RequestHandler = proxy;
