import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// ── sellers ───────────────────────────────────────────────────────────────────
// Vendedores / responsables que emiten presupuestos.
// El campo `responsable` en BudgetMeta es una snapshot string; este FK es optional.

export const sellers = pgTable('sellers', {
  id:        uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(), // 'bemec' | 'bamore'
  name:      text('name').notNull(),
  email:     text('email'),
  phone:     text('phone'),
  active:    boolean('active').notNull().default(true),
  // Plain-text email signature appended automatically to outgoing emails.
  signature: text('signature'),
  // Optional file attached alongside the signature (e.g. logo image).
  // Stored as base64 so it's self-contained and works without external storage.
  signatureFileName: text('signature_file_name'),
  signatureFileBase64: text('signature_file_base64'), // base64-encoded file content
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('sellers_company_id_idx').on(t.companyId),
]);

// ── customers ─────────────────────────────────────────────────────────────────
// Clientes. companyId = null → visible en todas las empresas (legacy / shared).

export const customers = pgTable('customers', {
  id:        uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id'),             // nullable → shared across companies
  name:      text('name').notNull(),
  attention: text('attention'),              // Persona de contacto (Atención a:)
  email:     text('email'),
  phone:     text('phone'),
  cuit:      text('cuit'),
  address:   text('address'),
  locality:  text('locality'),
  province:  text('province'),
  notes:     text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('customers_company_id_idx').on(t.companyId),
  index('customers_name_idx').on(t.name),
]);

// ── templates ─────────────────────────────────────────────────────────────────
// Plantillas de observaciones reutilizables (Notas frecuentes).
// companyId = null → shared across companies.

export const templates = pgTable('templates', {
  id:        uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id'),             // nullable → shared
  name:      text('name').notNull(),
  content:   text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('templates_company_id_idx').on(t.companyId),
]);

// ── budgets ───────────────────────────────────────────────────────────────────
// Presupuestos de reparación y venta de equipo nuevo.
//
// Estrategia de persistencia:
//   • Campos escalares (meta, totales, status) → columnas nativas para queries rápidas.
//   • Estructuras anidadas complejas (secciones, items, impuestos) → JSONB.
//   • customer_snapshot: snapshot del cliente al momento de crear el presupuesto
//     (garantiza inmutabilidad histórica aunque el cliente cambie luego).
//   • customer_id: FK opcional al registro vivo del cliente (para joins y búsquedas).
//   • seller_id: FK opcional al vendedor (el campo meta.responsable es la snapshot).

export const budgets = pgTable('budgets', {
  id:         uuid('id').primaryKey().defaultRandom(),
  companyId:  text('company_id').notNull(),          // 'bemec' | 'bamore'
  budgetType: text('budget_type').notNull(),          // 'reparacion' | 'equipo_nuevo'

  // ── Status ──────────────────────────────────────────────────────────────────
  status:  text('status').notNull().default('draft'), // 'draft' | 'pending' | 'approved'
  sentAt:  timestamp('sent_at', { withTimezone: true }),

  // ── Meta (flattened from BudgetMeta) ─────────────────────────────────────
  number:             text('number').notNull(),
  date:               text('date').notNull(),         // ISO date string 'YYYY-MM-DD'
  validUntil:         text('valid_until').notNull(),  // ISO date string
  exchangeRate:       numeric('exchange_rate', { precision: 12, scale: 2 }).notNull(),
  currency:           text('currency').notNull().default('ARS'), // 'ARS' | 'USD'
  paymentTerms:       text('payment_terms'),
  commercialValidity: text('commercial_validity'),
  generalNotes:       text('general_notes'),
  ivaCondition:       text('iva_condition'),
  pideNumber:         text('pide_number'),
  responsable:        text('responsable'),            // snapshot string del vendedor

  // ── Customer refs ─────────────────────────────────────────────────────────
  customerId:       uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  customerSnapshot: jsonb('customer_snapshot'),       // Partial<Customer> snapshot

  // ── Seller ref ────────────────────────────────────────────────────────────
  sellerId: uuid('seller_id').references(() => sellers.id, { onDelete: 'set null' }),

  // ── Totals ────────────────────────────────────────────────────────────────
  subtotalLabor:      numeric('subtotal_labor',      { precision: 16, scale: 2 }).notNull().default('0'),
  subtotalBearings:   numeric('subtotal_bearings',   { precision: 16, scale: 2 }).notNull().default('0'),
  subtotalSpareParts: numeric('subtotal_spare_parts',{ precision: 16, scale: 2 }).notNull().default('0'),
  subtotalMachining:  numeric('subtotal_machining',  { precision: 16, scale: 2 }).notNull().default('0'),
  subtotalGeneral:    numeric('subtotal_general',    { precision: 16, scale: 2 }).notNull().default('0'),
  subtotalItems:      numeric('subtotal_items',      { precision: 16, scale: 2 }).notNull().default('0'), // equipo nuevo
  totalTax:           numeric('total_tax',           { precision: 16, scale: 2 }).notNull().default('0'),
  totalFinal:         numeric('total_final',         { precision: 16, scale: 2 }).notNull().default('0'),

  // ── Complex nested data (JSONB) ───────────────────────────────────────────
  // reparacion: allSections = RepairSection[] (includes workItems, bearings, spareParts, machining, labor per section)
  allSections: jsonb('all_sections').notNull().default([]),
  // equipo_nuevo: items = NewEquipmentItem[]
  items:       jsonb('items').notNull().default([]),
  // shared
  taxes:       jsonb('taxes').notNull().default([]),  // TaxLine[]

  // ── Timestamps ────────────────────────────────────────────────────────────
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('budgets_company_id_idx').on(t.companyId),
  index('budgets_number_idx').on(t.number),
  index('budgets_status_idx').on(t.status),
  index('budgets_customer_id_idx').on(t.customerId),
  index('budgets_created_at_idx').on(t.createdAt),
]);

// ── work_items ────────────────────────────────────────────────────────────────
// Trabajos frecuentes personalizados agregados por los vendedores.
// companyId = null → compartido entre empresas (no se usa por ahora).

export const workItems = pgTable('work_items', {
  id:        uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('work_items_company_id_idx').on(t.companyId),
]);

// ── Inferred types ────────────────────────────────────────────────────────────

export type Seller         = typeof sellers.$inferSelect;
export type NewSeller      = typeof sellers.$inferInsert;
export type Customer       = typeof customers.$inferSelect;
export type NewCustomer    = typeof customers.$inferInsert;
export type Template       = typeof templates.$inferSelect;
export type NewTemplate    = typeof templates.$inferInsert;
export type WorkItem       = typeof workItems.$inferSelect;
export type NewWorkItem    = typeof workItems.$inferInsert;
export type Budget         = typeof budgets.$inferSelect;
export type NewBudget      = typeof budgets.$inferInsert;
