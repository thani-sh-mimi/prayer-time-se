import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { etag } from 'hono/etag';
import { logger } from 'hono/logger';
import { registerV1 } from './routes/v1';
import { registerV2 } from './routes/v2';
import { runDailySweep } from './lib/sweep';
import { Env } from '../cf-types';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use(cors());
app.use(etag());
app.use(logger());

// API Routes
registerV1(app);
registerV2(app);

export default {
	fetch: app.fetch,
	/**
	 * Evening sweep: once a day, look for friends who have gone quiet over the
	 * last three days and tell the people who can support them.
	 */
	async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		ctx.waitUntil(runDailySweep(env.db));
	}
} satisfies ExportedHandler<Env>;
