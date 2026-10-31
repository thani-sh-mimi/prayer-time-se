CREATE TABLE `friendships` (
	`id` text PRIMARY KEY NOT NULL,
	`requester_id` text NOT NULL,
	`addressee_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`responded_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_friendships_pair` ON `friendships` (`requester_id`,`addressee_id`);--> statement-breakpoint
CREATE INDEX `idx_friendships_requester` ON `friendships` (`requester_id`);--> statement-breakpoint
CREATE INDEX `idx_friendships_addressee` ON `friendships` (`addressee_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`subject_user_id` text,
	`context` text,
	`dedupe_key` text,
	`created_at` integer NOT NULL,
	`read_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_notifications_dedupe` ON `notifications` (`dedupe_key`);--> statement-breakpoint
CREATE TABLE `nudges` (
	`id` text PRIMARY KEY NOT NULL,
	`from_user_id` text NOT NULL,
	`to_user_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	`read_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_nudges_to` ON `nudges` (`to_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_nudges_from` ON `nudges` (`from_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `prayer_marks` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`prayer` text NOT NULL,
	`jamaah` integer DEFAULT 0 NOT NULL,
	`marked_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `day`, `prayer`)
);
--> statement-breakpoint
CREATE INDEX `idx_prayer_marks_user_day` ON `prayer_marks` (`user_id`,`day`);--> statement-breakpoint
CREATE INDEX `idx_prayer_marks_day` ON `prayer_marks` (`day`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`handle` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle_unique` ON `users` (`handle`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_prayer_times_city` ON `prayer_times` (`city`);