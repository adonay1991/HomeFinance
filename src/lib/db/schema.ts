import { pgTable, uuid, text, decimal, date, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'

// ==========================================
// TABLA: users
// Sincronizada con Supabase Auth via trigger
// ==========================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // = auth.users.id
  email: text('email').notNull(),
  name: text('name').notNull(),
  householdId: uuid('household_id').notNull(), // Para migración futura a múltiples hogares
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ==========================================
// TABLA: expenses (PRINCIPAL)
// Gastos compartidos del hogar
// ==========================================
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  category: text('category').notNull(), // comida | facturas | transporte | ocio | hogar | salud | otros
  tags: text('tags').array(), // Tags libres como array PostgreSQL
  date: date('date').notNull(),
  paidBy: uuid('paid_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_expenses_household_date').on(table.householdId, table.date),
  index('idx_expenses_category').on(table.category),
  index('idx_expenses_paid_by').on(table.paidBy),
])

// ==========================================
// TABLA: savings_goals
// Objetivos de ahorro del hogar
// ==========================================
export const savingsGoals = pgTable('savings_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull(),
  name: text('name').notNull(),
  targetAmount: decimal('target_amount', { precision: 10, scale: 2 }).notNull(),
  currentAmount: decimal('current_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  deadline: date('deadline'),
  status: text('status').default('active').notNull(), // active | completed | cancelled
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_savings_goals_household').on(table.householdId),
])

// ==========================================
// TABLA: budgets
// Presupuestos mensuales por categoría
// ==========================================
export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull(),
  category: text('category').notNull(),
  monthlyLimit: decimal('monthly_limit', { precision: 10, scale: 2 }).notNull(),
  year: integer('year').notNull(),
  month: integer('month').notNull(), // 1-12
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_budget_unique').on(table.householdId, table.category, table.year, table.month),
])

// ==========================================
// TIPOS INFERIDOS DE DRIZZLE
// ==========================================
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Expense = typeof expenses.$inferSelect
export type NewExpense = typeof expenses.$inferInsert

export type SavingsGoal = typeof savingsGoals.$inferSelect
export type NewSavingsGoal = typeof savingsGoals.$inferInsert

export type Budget = typeof budgets.$inferSelect
export type NewBudget = typeof budgets.$inferInsert
