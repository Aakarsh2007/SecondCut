CREATE TABLE `fulfillment_records` (
	`case_id` text PRIMARY KEY NOT NULL,
	`stage` text DEFAULT 'NOT_STARTED' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`evidence` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `recovery_cases`(`id`) ON UPDATE no action ON DELETE no action
);
