import { integer, sqliteTable, text, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const prayerTimes = sqliteTable(
	'prayer_times',
	{
		month: integer('month').notNull(),
		day: integer('day').notNull(),
		city: text('city').notNull(),
		fajr: integer('fajr').notNull(),
		sunrise: integer('sunrise').notNull(),
		dhuhr: integer('dhuhr').notNull(),
		asr: integer('asr').notNull(),
		maghrib: integer('maghrib').notNull(),
		isha: integer('isha').notNull()
	},
	(table) => ({
		pk: primaryKey({ columns: [table.month, table.day, table.city] }),
		cityIndex: index('idx_prayer_times_city').on(table.city)
	})
);

export const metadata = sqliteTable('metadata', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});

/**
 * The four tables below are Better Auth's core schema. Better Auth owns
 * identity: passwords are hashed with its scrypt implementation, sessions are
 * signed cookies, and the `username` plugin adds the handle people share.
 *
 * `username` is what the app calls a handle; `name` is the display name.
 */
export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
	image: text('image'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
	username: text('username').unique(),
	displayUsername: text('display_username')
});

export const session = sqliteTable(
	'session',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').notNull(),
		token: text('token').notNull().unique(),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
	},
	(table) => ({
		userIndex: index('idx_session_user').on(table.userId)
	})
);

export const account = sqliteTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id').notNull(),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
		refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
		scope: text('scope'),
		password: text('password'),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
	},
	(table) => ({
		userIndex: index('idx_account_user').on(table.userId)
	})
);

export const verification = sqliteTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' }),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
	},
	(table) => ({
		identifierIndex: index('idx_verification_identifier').on(table.identifier)
	})
);

/**
 * One row per prayer a user has marked. `day` is the local (Europe/Stockholm)
 * date as YYYY-MM-DD, so a mark made after midnight belongs to the right day.
 * `user_id` holds Better Auth's user id.
 */
export const prayerMarks = sqliteTable(
	'prayer_marks',
	{
		userId: text('user_id').notNull(),
		day: text('day').notNull(),
		prayer: text('prayer').notNull(),
		jamaah: integer('jamaah').notNull().default(0),
		markedAt: integer('marked_at').notNull()
	},
	(table) => ({
		pk: primaryKey({ columns: [table.userId, table.day, table.prayer] }),
		userDayIndex: index('idx_prayer_marks_user_day').on(table.userId, table.day),
		dayIndex: index('idx_prayer_marks_day').on(table.day)
	})
);

/**
 * A friendship is one row in both directions: requester → addressee. The
 * status moves from `pending` to `accepted`; a decline deletes the row.
 */
export const friendships = sqliteTable(
	'friendships',
	{
		id: text('id').primaryKey(),
		requesterId: text('requester_id').notNull(),
		addresseeId: text('addressee_id').notNull(),
		status: text('status').notNull(),
		createdAt: integer('created_at').notNull(),
		respondedAt: integer('responded_at')
	},
	(table) => ({
		pairIndex: uniqueIndex('idx_friendships_pair').on(table.requesterId, table.addresseeId),
		requesterIndex: index('idx_friendships_requester').on(table.requesterId),
		addresseeIndex: index('idx_friendships_addressee').on(table.addresseeId)
	})
);

/**
 * A nudge is a short, kind message from a friend. It is kept so both sides can
 * see what was sent, and so the same friend cannot be nudged all day.
 */
export const nudges = sqliteTable(
	'nudges',
	{
		id: text('id').primaryKey(),
		fromUserId: text('from_user_id').notNull(),
		toUserId: text('to_user_id').notNull(),
		message: text('message').notNull(),
		createdAt: integer('created_at').notNull(),
		readAt: integer('read_at')
	},
	(table) => ({
		toIndex: index('idx_nudges_to').on(table.toUserId, table.createdAt),
		fromIndex: index('idx_nudges_from').on(table.fromUserId, table.createdAt)
	})
);

/**
 * In-app notifications. `dedupeKey` makes the daily sweep idempotent: a bad
 * cron retry cannot send the same "your friend has been quiet" twice.
 */
export const notifications = sqliteTable(
	'notifications',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').notNull(),
		type: text('type').notNull(),
		subjectUserId: text('subject_user_id'),
		context: text('context'),
		dedupeKey: text('dedupe_key'),
		createdAt: integer('created_at').notNull(),
		readAt: integer('read_at')
	},
	(table) => ({
		userIndex: index('idx_notifications_user').on(table.userId, table.createdAt),
		dedupeIndex: uniqueIndex('idx_notifications_dedupe').on(table.dedupeKey)
	})
);
