import { pgTable, index, uuid, text, timestamp, foreignKey, numeric, jsonb, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const templates = pgTable("templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: text("company_id"),
	name: text().notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("templates_company_id_idx").using("btree", table.companyId.asc().nullsLast().op("text_ops")),
]);

export const customers = pgTable("customers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: text("company_id"),
	name: text().notNull(),
	attention: text(),
	email: text(),
	phone: text(),
	cuit: text(),
	address: text(),
	locality: text(),
	province: text(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("customers_company_id_idx").using("btree", table.companyId.asc().nullsLast().op("text_ops")),
	index("customers_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

export const budgets = pgTable("budgets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: text("company_id").notNull(),
	budgetType: text("budget_type").notNull(),
	status: text().default('draft').notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	number: text().notNull(),
	date: text().notNull(),
	validUntil: text("valid_until").notNull(),
	exchangeRate: numeric("exchange_rate", { precision: 12, scale:  2 }).notNull(),
	currency: text().default('ARS').notNull(),
	paymentTerms: text("payment_terms"),
	commercialValidity: text("commercial_validity"),
	generalNotes: text("general_notes"),
	ivaCondition: text("iva_condition"),
	pideNumber: text("pide_number"),
	responsable: text(),
	customerId: uuid("customer_id"),
	customerSnapshot: jsonb("customer_snapshot"),
	sellerId: uuid("seller_id"),
	subtotalLabor: numeric("subtotal_labor", { precision: 16, scale:  2 }).default('0').notNull(),
	subtotalBearings: numeric("subtotal_bearings", { precision: 16, scale:  2 }).default('0').notNull(),
	subtotalSpareParts: numeric("subtotal_spare_parts", { precision: 16, scale:  2 }).default('0').notNull(),
	subtotalMachining: numeric("subtotal_machining", { precision: 16, scale:  2 }).default('0').notNull(),
	subtotalGeneral: numeric("subtotal_general", { precision: 16, scale:  2 }).default('0').notNull(),
	subtotalItems: numeric("subtotal_items", { precision: 16, scale:  2 }).default('0').notNull(),
	totalTax: numeric("total_tax", { precision: 16, scale:  2 }).default('0').notNull(),
	totalFinal: numeric("total_final", { precision: 16, scale:  2 }).default('0').notNull(),
	allSections: jsonb("all_sections").default([]).notNull(),
	items: jsonb().default([]).notNull(),
	taxes: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("budgets_company_id_idx").using("btree", table.companyId.asc().nullsLast().op("text_ops")),
	index("budgets_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("budgets_customer_id_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("budgets_number_idx").using("btree", table.number.asc().nullsLast().op("text_ops")),
	index("budgets_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "budgets_customer_id_customers_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [sellers.id],
			name: "budgets_seller_id_sellers_id_fk"
		}).onDelete("set null"),
]);

export const sellers = pgTable("sellers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: text("company_id").notNull(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("sellers_company_id_idx").using("btree", table.companyId.asc().nullsLast().op("text_ops")),
]);
