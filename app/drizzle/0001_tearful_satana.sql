CREATE TABLE `planning_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`input` text NOT NULL,
	`result` text NOT NULL,
	`selected_need` text,
	`case_id` text,
	`created_at` text NOT NULL
);
