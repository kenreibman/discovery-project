CREATE TABLE `generated_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`pattern` text NOT NULL,
	`objection_types` text,
	`response_text` text NOT NULL,
	`cross_reference_number` integer,
	`created_at` integer,
	FOREIGN KEY (`request_id`) REFERENCES `extracted_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
