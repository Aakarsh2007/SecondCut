CREATE TABLE `participant_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`role` text NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`agreement_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`actor` text,
	`status` text DEFAULT 'INVITED' NOT NULL,
	`decision_ref` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `recovery_cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `participant_token` ON `participant_invites` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `participant_case_role` ON `participant_invites` (`case_id`,`role`);--> statement-breakpoint
CREATE UNIQUE INDEX `participant_case_actor` ON `participant_invites` (`case_id`,`actor`);--> statement-breakpoint
ALTER TABLE `recovery_cases` ADD `approval_mode` text DEFAULT 'OWNER_CONTROLLED_DEMO' NOT NULL;--> statement-breakpoint
ALTER TABLE `recovery_cases` ADD `agreement_details` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `recovery_cases` ADD `agreement_expires_at` text;--> statement-breakpoint
ALTER TABLE `recovery_cases` ADD `recovery_status` text DEFAULT 'ACTIVE' NOT NULL;