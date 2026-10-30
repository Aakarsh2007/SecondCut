CREATE TABLE `commercial_advice` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`run_id` text NOT NULL,
	`need_id` text NOT NULL,
	`session_id` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`result` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `advice_owner_day` ON `commercial_advice` (`owner`,`created_at`);