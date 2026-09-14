CREATE TABLE `attribute_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL,
	`value_type` text NOT NULL,
	`allow_multiple` integer DEFAULT false NOT NULL,
	`unit` text,
	`use_for_display` integer DEFAULT true NOT NULL,
	`use_for_compatibility` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attribute_definitions_code_idx` ON `attribute_definitions` (`code`);--> statement-breakpoint
CREATE TABLE `attribute_options` (
	`id` text PRIMARY KEY NOT NULL,
	`attribute_id` text NOT NULL,
	`value` text NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`attribute_id`) REFERENCES `attribute_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attribute_options_value_idx` ON `attribute_options` (`attribute_id`,`value`);--> statement-breakpoint
CREATE TABLE `category_attributes` (
	`category` text NOT NULL,
	`attribute_id` text NOT NULL,
	`required` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`category`, `attribute_id`),
	FOREIGN KEY (`attribute_id`) REFERENCES `attribute_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `compatibility_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`left_category` text NOT NULL,
	`left_attribute_code` text NOT NULL,
	`operator` text NOT NULL,
	`right_category` text NOT NULL,
	`right_attribute_code` text NOT NULL,
	`severity` text DEFAULT 'error' NOT NULL,
	`message` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `image_objects` (
	`key` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`title` text NOT NULL,
	`short_description` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`affiliate_url` text DEFAULT '' NOT NULL,
	`shop_name` text DEFAULT '' NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`attributes` text DEFAULT '{}' NOT NULL,
	`performance_score` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_idx` ON `products` (`slug`);