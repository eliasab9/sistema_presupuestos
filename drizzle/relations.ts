import { relations } from "drizzle-orm/relations";
import { customers, budgets, sellers } from "./schema";

export const budgetsRelations = relations(budgets, ({one}) => ({
	customer: one(customers, {
		fields: [budgets.customerId],
		references: [customers.id]
	}),
	seller: one(sellers, {
		fields: [budgets.sellerId],
		references: [sellers.id]
	}),
}));

export const customersRelations = relations(customers, ({many}) => ({
	budgets: many(budgets),
}));

export const sellersRelations = relations(sellers, ({many}) => ({
	budgets: many(budgets),
}));