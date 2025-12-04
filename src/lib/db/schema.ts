import { pgTable, uuid, text, decimal, date, timestamp, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'

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
  source: text('source').default('manual').notNull(), // 'manual' | 'bank_sync'
  bankTransactionId: uuid('bank_transaction_id'), // Referencia a la transacción bancaria original
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_expenses_household_date').on(table.householdId, table.date),
  index('idx_expenses_category').on(table.category),
  index('idx_expenses_paid_by').on(table.paidBy),
  index('idx_expenses_source').on(table.source),
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

// ==========================================
// TABLA: recurring_expenses
// Plantillas de gastos que se repiten automáticamente
// ==========================================
export const recurringExpenses = pgTable('recurring_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  category: text('category').notNull(),
  tags: text('tags').array(),

  // Configuración de recurrencia
  frequency: text('frequency').notNull(), // 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  dayOfMonth: integer('day_of_month'), // 1-31 para mensual/anual
  dayOfWeek: integer('day_of_week'), // 0-6 para semanal (0=domingo)
  monthOfYear: integer('month_of_year'), // 1-12 para anual

  // Control de ejecución
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  lastExecutedDate: date('last_executed_date'),
  nextExecutionDate: date('next_execution_date').notNull(),

  // Metadata
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_recurring_expenses_household').on(table.householdId),
  index('idx_recurring_expenses_next_execution').on(table.nextExecutionDate),
])

export type RecurringExpense = typeof recurringExpenses.$inferSelect
export type NewRecurringExpense = typeof recurringExpenses.$inferInsert

// ==========================================
// TABLAS: Banking (Enable Banking integration)
// ==========================================

/**
 * Estados de autorización pendientes (temporal)
 * Se crean al iniciar conexión y se eliminan al completarla o expirar (10 min)
 */
export const bankAuthStates = pgTable('bank_auth_states', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  state: text('state').unique().notNull(), // Estado CSRF único
  bankName: text('bank_name').notNull(),
  country: text('country').default('ES'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_bank_auth_states_user').on(table.userId),
  index('idx_bank_auth_states_state').on(table.state),
])

/**
 * Conexiones bancarias activas
 * Representa una sesión de Enable Banking con acceso a las cuentas del usuario
 */
export const bankConnections = pgTable('bank_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sessionId: text('session_id').notNull(), // ID de sesión de Enable Banking
  bankName: text('bank_name').notNull(),
  country: text('country').default('ES'),
  status: text('status').default('active').notNull(), // 'active' | 'expired' | 'error'
  connectedAt: timestamp('connected_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_bank_connections_user').on(table.userId),
  index('idx_bank_connections_status').on(table.status),
])

/**
 * Cuentas bancarias vinculadas
 * Cada conexión puede tener múltiples cuentas (corriente, ahorro, etc.)
 */
export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id').references(() => bankConnections.id, { onDelete: 'cascade' }).notNull(),
  accountUid: text('account_uid').notNull(), // UID de Enable Banking
  iban: text('iban'),
  name: text('name'),
  currency: text('currency').default('EUR'),
  accountType: text('account_type'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_bank_accounts_connection').on(table.connectionId),
])

/**
 * Transacciones bancarias (raw)
 * Almacena todas las transacciones obtenidas del banco
 */
export const bankTransactions = pgTable('bank_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => bankAccounts.id, { onDelete: 'cascade' }).notNull(),
  externalId: text('external_id').notNull(), // transaction_id de Enable Banking
  bookingDate: date('booking_date').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').default('EUR'),
  creditorName: text('creditor_name'),
  debtorName: text('debtor_name'),
  description: text('description'),
  merchantCode: text('merchant_code'), // MCC code
  rawData: jsonb('raw_data'), // JSON completo de la transacción
  expenseId: uuid('expense_id').references(() => expenses.id, { onDelete: 'set null' }),
  isProcessed: boolean('is_processed').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_bank_transactions_account').on(table.accountId),
  index('idx_bank_transactions_date').on(table.bookingDate),
  index('idx_bank_transactions_processed').on(table.isProcessed),
  uniqueIndex('idx_bank_transactions_unique').on(table.accountId, table.externalId),
])

/**
 * Log de sincronizaciones
 * Historial de cada sincronización para auditoría y debugging
 */
export const bankSyncLog = pgTable('bank_sync_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => bankAccounts.id, { onDelete: 'cascade' }).notNull(),
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
  transactionsFetched: integer('transactions_fetched').default(0),
  transactionsNew: integer('transactions_new').default(0),
  error: text('error'),
}, (table) => [
  index('idx_bank_sync_log_account').on(table.accountId),
  index('idx_bank_sync_log_date').on(table.syncedAt),
])

// ==========================================
// TIPOS INFERIDOS DE DRIZZLE - BANKING
// ==========================================
export type BankAuthState = typeof bankAuthStates.$inferSelect
export type NewBankAuthState = typeof bankAuthStates.$inferInsert

export type BankConnection = typeof bankConnections.$inferSelect
export type NewBankConnection = typeof bankConnections.$inferInsert

export type BankAccount = typeof bankAccounts.$inferSelect
export type NewBankAccount = typeof bankAccounts.$inferInsert

export type BankTransaction = typeof bankTransactions.$inferSelect
export type NewBankTransaction = typeof bankTransactions.$inferInsert

export type BankSyncLog = typeof bankSyncLog.$inferSelect
export type NewBankSyncLog = typeof bankSyncLog.$inferInsert

// ==========================================
// TABLAS: Hogares Compartidos
// ==========================================

/**
 * Hogares/grupos para compartir finanzas
 * Cada usuario pertenece a un único hogar
 */
export const households = pgTable('households', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().default('Mi Hogar'),
  inviteCode: text('invite_code').notNull().unique(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'restrict' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_households_owner').on(table.ownerId),
  index('idx_households_invite_code').on(table.inviteCode),
])

/**
 * Miembros de cada hogar con sus roles
 * owner: puede administrar el hogar
 * member: solo puede participar
 */
export const householdMembers = pgTable('household_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  role: text('role').notNull().default('member'), // 'owner' | 'member'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => [
  index('idx_household_members_household').on(table.householdId),
  index('idx_household_members_user').on(table.userId),
])

/**
 * Invitaciones pendientes para unirse a un hogar
 * Token de 64 chars para links seguros + código de 6 chars para compartir manualmente
 */
export const householdInvitations = pgTable('household_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }).notNull(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  status: text('status').notNull().default('pending'), // 'pending' | 'accepted' | 'cancelled' | 'expired'
  invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_invitations_token').on(table.token),
  index('idx_invitations_email').on(table.email),
  index('idx_invitations_status').on(table.status),
  index('idx_invitations_household').on(table.householdId),
])

/**
 * Registro de pagos/liquidaciones entre miembros
 * Cuando alguien paga a otro para saldar deudas
 */
export const settlements = pgTable('settlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }).notNull(),
  fromUserId: uuid('from_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  toUserId: uuid('to_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  note: text('note'),
  settledAt: timestamp('settled_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_settlements_household').on(table.householdId),
  index('idx_settlements_from_user').on(table.fromUserId),
  index('idx_settlements_to_user').on(table.toUserId),
  index('idx_settlements_date').on(table.settledAt),
])

// ==========================================
// TIPOS INFERIDOS - HOGARES
// ==========================================
export type Household = typeof households.$inferSelect
export type NewHousehold = typeof households.$inferInsert

export type HouseholdMember = typeof householdMembers.$inferSelect
export type NewHouseholdMember = typeof householdMembers.$inferInsert

export type HouseholdInvitation = typeof householdInvitations.$inferSelect
export type NewHouseholdInvitation = typeof householdInvitations.$inferInsert

export type Settlement = typeof settlements.$inferSelect
export type NewSettlement = typeof settlements.$inferInsert

export type HouseholdRole = 'owner' | 'member'
export type InvitationStatus = 'pending' | 'accepted' | 'cancelled' | 'expired'

