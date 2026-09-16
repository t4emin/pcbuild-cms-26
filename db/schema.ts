import { integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  title: text("title").notNull(),
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  price: integer("price").notNull().default(0),
  affiliateUrl: text("affiliate_url").notNull().default(""),
  shopName: text("shop_name").notNull().default(""),
  images: text("images", { mode: "json" }).$type<string[]>().notNull().default([]),
  attributes: text("attributes", { mode: "json" }).$type<Record<string, string | number | boolean | string[]>>().notNull().default({}),
  performanceScore: integer("performance_score").notNull().default(0),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("products_slug_idx").on(table.slug)]);

export const attributeDefinitions = sqliteTable("attribute_definitions", {
  id: text("id").primaryKey(), code: text("code").notNull(), label: text("label").notNull(), valueType: text("value_type").notNull(),
  allowMultiple: integer("allow_multiple", { mode: "boolean" }).notNull().default(false), unit: text("unit"),
  useForDisplay: integer("use_for_display", { mode: "boolean" }).notNull().default(true),
  useForCompatibility: integer("use_for_compatibility", { mode: "boolean" }).notNull().default(false), createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("attribute_definitions_code_idx").on(table.code)]);

export const attributeOptions = sqliteTable("attribute_options", {
  id: text("id").primaryKey(), attributeId: text("attribute_id").notNull().references(() => attributeDefinitions.id, { onDelete: "cascade" }),
  value: text("value").notNull(), label: text("label").notNull(), sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [uniqueIndex("attribute_options_value_idx").on(table.attributeId, table.value)]);

export const categoryAttributes = sqliteTable("category_attributes", {
  category: text("category").notNull(), attributeId: text("attribute_id").notNull().references(() => attributeDefinitions.id, { onDelete: "cascade" }),
  required: integer("required", { mode: "boolean" }).notNull().default(false), sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.category, table.attributeId] })]);

export const compatibilityRules = sqliteTable("compatibility_rules", {
  id: text("id").primaryKey(), leftCategory: text("left_category").notNull(), leftAttributeCode: text("left_attribute_code").notNull(), operator: text("operator").notNull(),
  rightCategory: text("right_category").notNull(), rightAttributeCode: text("right_attribute_code").notNull(), severity: text("severity").notNull().default("error"),
  message: text("message").notNull(), active: integer("active", { mode: "boolean" }).notNull().default(true), createdAt: text("created_at").notNull(),
});

export const imageObjects = sqliteTable("image_objects", {
  key: text("key").primaryKey(), filename: text("filename").notNull(), contentType: text("content_type").notNull(), size: integer("size").notNull(), createdAt: text("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordIterations: integer("password_iterations").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  approvedAt: text("approved_at"),
  approvedBy: text("approved_by"),
  lastLoginAt: text("last_login_at"),
}, (table) => [uniqueIndex("users_username_idx").on(table.username)]);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const loginAttempts = sqliteTable("login_attempts", {
  username: text("username").primaryKey(),
  failures: integer("failures").notNull().default(0),
  windowStartedAt: text("window_started_at").notNull(),
  lockedUntil: text("locked_until"),
});
