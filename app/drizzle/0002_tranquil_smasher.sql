CREATE TABLE `ai_extractions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`source` text NOT NULL,
	`notes` text NOT NULL,
	`result` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `negotiations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`run_id` text NOT NULL,
	`need_id` text NOT NULL,
	`rounds` text DEFAULT '[]' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
