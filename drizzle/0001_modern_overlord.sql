CREATE TABLE `extracted_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`request_number` integer NOT NULL,
	`text` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `documents` ADD `sub_type` text;