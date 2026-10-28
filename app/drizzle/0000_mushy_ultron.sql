CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`metadata` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `recovery_cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payment_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`kind` text NOT NULL,
	`request_id` text NOT NULL,
	`path` text NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`resource_id` text,
	`error` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `recovery_cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operation_case_kind` ON `payment_operations` (`case_id`,`kind`);--> statement-breakpoint
CREATE UNIQUE INDEX `operation_request` ON `payment_operations` (`request_id`);--> statement-breakpoint
CREATE TABLE `recovery_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`currency` text NOT NULL,
	`deposit` integer NOT NULL,
	`replacement` integer NOT NULL,
	`refund` integer NOT NULL,
	`costs` integer NOT NULL,
	`contingency` integer NOT NULL,
	`agreement_hash` text NOT NULL,
	`approvals` text DEFAULT '{}' NOT NULL,
	`original_order_id` text,
	`original_capture_id` text,
	`replacement_order_id` text,
	`authorization_id` text,
	`replacement_capture_id` text,
	`refund_id` text,
	`merchant_id` text,
	`original_status` text DEFAULT 'NOT_STARTED' NOT NULL,
	`replacement_status` text DEFAULT 'NOT_STARTED' NOT NULL,
	`refund_status` text DEFAULT 'NOT_STARTED' NOT NULL,
	`active_operation` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webhook_inbox` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`body` text NOT NULL,
	`headers` text NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_event` ON `webhook_inbox` (`event_id`);