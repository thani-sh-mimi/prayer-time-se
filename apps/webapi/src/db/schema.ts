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

export const metadata = sqliteTable(
	'metadata',
	{
		key: text('key').primaryKey(),
		value: text('value').notNull()
	}
);

/**
 * A tracked account. Handles are stored lowercase and are the only public
 * identifier a friend needs; the numeric id never leaves the server.
 */
export const users = sqliteTable(
	'users',
	{
		id: text('id').primaryKey(),
		handle: text('handle').notNull().unique(),
		displayName: text('display_name').notNull(),
		passwordHash: text('password_hash').notNull(),
		createdAt: integer('created_at').notNull()
	}
);

/**
 * Sessions are stored as a hash of the cookie token, so a database leak does
 * not hand out live sessions.
 */
export const sessions = sqliteTable(
	'sessions',
	{
		tokenHash: text('token_hash').primaryKey(),
		userId: text('user_id').notNull(),
		createdAt: integer('created_at').notNull(),
		expiresAt: integer('expires_at').notNull()
	},
	(table) => ({
		userIndex: index('idx_sessions_user').on(table.userId)
	})
);

/**
 * One row per prayer a user has marked. `day` is the local (Europe/Stockholm)
 * date as YYYY-MM-DD, so a mark made after midnight belongs to the right day.
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
