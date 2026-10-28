CREATE TABLE `admission_budget` (
	`window` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verified_events` (
	`id` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`headers` text NOT NULL,
	`event_type` text NOT NULL,
	`resource_id` text,
	`received_at` text NOT NULL,
	`acknowledged_at` text
);
