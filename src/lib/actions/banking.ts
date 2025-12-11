'use server'

import { db, bankConnections, bankAccounts, bankTransactions, bankBalanceHistory } from '@/lib/db/client'
import { eq, and, gte, lte, desc, sql, asc } from 'drizzle-orm'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'

// ==========================================
// SERVER ACTIONS: Banking Dashboard Data
// ==========================================

/**
 * Verifica si el usuario tiene banco conectado
 */
export async function hasBankConnection(): Promise<boolean> {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const connections = await db
    .select({ id: bankConnections.id })
    .from(bankConnections)
    .where(
      and(
        eq(bankConnections.userId, user.id),
        eq(bankConnections.status, 'active')
      )
    )
    .limit(1)

  return connections.length > 0
}

/**
 * Obtiene información de la conexión bancaria activa
 */
export async function getBankConnectionInfo() {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [connection] = await db
    .select()
    .from(bankConnections)
    .where(
      and(
        eq(bankConnections.userId, user.id),
        eq(bankConnections.status, 'active')
      )
    )
    .limit(1)

  if (!connection) return null

  // Obtener cuentas
  const accounts = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.connectionId, connection.id))

  return {
    id: connection.id,
    bankName: connection.bankName,
    lastSyncedAt: connection.lastSyncedAt,
    expiresAt: connection.expiresAt,
    accounts: accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      iban: acc.iban ? maskIban(acc.iban) : null,
      currency: acc.currency,
    })),
  }
}

/**
 * Obtiene resumen mensual de transacciones bancarias
 * @param year Año
 * @param month Mes (1-12)
 */
export async function getMonthlyBankSummary(year: number, month: number) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { income: 0, expenses: 0, balance: 0, transactionCount: 0 }
  }

  // Calcular fechas del mes
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0) // Último día del mes
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  // Obtener IDs de cuentas del usuario
  const accountIds = await getUserAccountIds(user.id)

  if (accountIds.length === 0) {
    return { income: 0, expenses: 0, balance: 0, transactionCount: 0 }
  }

  // Calcular ingresos y gastos del mes
  const transactions = await db
    .select({
      amount: bankTransactions.amount,
    })
    .from(bankTransactions)
    .where(
      and(
        sql`${bankTransactions.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`,
        gte(bankTransactions.bookingDate, startDateStr),
        lte(bankTransactions.bookingDate, endDateStr)
      )
    )

  let income = 0
  let expenses = 0

  for (const tx of transactions) {
    const amount = parseFloat(tx.amount || '0')
    if (amount > 0) {
      income += amount
    } else {
      expenses += Math.abs(amount)
    }
  }

  return {
    income: Math.round(income * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    balance: Math.round((income - expenses) * 100) / 100,
    transactionCount: transactions.length,
  }
}

/**
 * Obtiene los últimos movimientos (ingresos y gastos mezclados)
 * @param limit Número de transacciones a obtener
 */
export async function getRecentBankTransactions(limit: number = 10) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  // Obtener IDs de cuentas del usuario
  const accountIds = await getUserAccountIds(user.id)

  if (accountIds.length === 0) return []

  const transactions = await db
    .select({
      id: bankTransactions.id,
      amount: bankTransactions.amount,
      currency: bankTransactions.currency,
      description: bankTransactions.description,
      creditorName: bankTransactions.creditorName,
      debtorName: bankTransactions.debtorName,
      bookingDate: bankTransactions.bookingDate,
      merchantCode: bankTransactions.merchantCode,
    })
    .from(bankTransactions)
    .where(
      sql`${bankTransactions.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`
    )
    .orderBy(desc(bankTransactions.bookingDate), desc(bankTransactions.createdAt))
    .limit(limit)

  return transactions.map(tx => {
    const amount = parseFloat(tx.amount || '0')
    const isIncome = amount > 0

    return {
      id: tx.id,
      amount: Math.abs(amount),
      currency: tx.currency || 'EUR',
      description: tx.description || tx.creditorName || tx.debtorName || 'Movimiento',
      date: tx.bookingDate,
      type: (isIncome ? 'income' : 'expense') as 'income' | 'expense',
      merchantCode: tx.merchantCode,
    }
  })
}

/**
 * Obtiene datos históricos para el gráfico de ingresos vs gastos
 * @param months Número de meses hacia atrás
 */
export async function getIncomeVsExpensesHistory(months: number = 6) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const accountIds = await getUserAccountIds(user.id)
  if (accountIds.length === 0) return []

  const results: Array<{
    month: string
    year: number
    monthNum: number
    income: number
    expenses: number
  }> = []

  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    const transactions = await db
      .select({ amount: bankTransactions.amount })
      .from(bankTransactions)
      .where(
        and(
          sql`${bankTransactions.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`,
          gte(bankTransactions.bookingDate, startDateStr),
          lte(bankTransactions.bookingDate, endDateStr)
        )
      )

    let income = 0
    let expenses = 0

    for (const tx of transactions) {
      const amount = parseFloat(tx.amount || '0')
      if (amount > 0) {
        income += amount
      } else {
        expenses += Math.abs(amount)
      }
    }

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    results.push({
      month: monthNames[month - 1],
      year,
      monthNum: month,
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
    })
  }

  return results
}

/**
 * Obtiene comparación con el mes anterior
 */
export async function getMonthlyComparison() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

  const current = await getMonthlyBankSummary(currentYear, currentMonth)
  const previous = await getMonthlyBankSummary(prevYear, prevMonth)

  const incomeChange = previous.income > 0
    ? Math.round(((current.income - previous.income) / previous.income) * 100)
    : 0

  const expensesChange = previous.expenses > 0
    ? Math.round(((current.expenses - previous.expenses) / previous.expenses) * 100)
    : 0

  return {
    current,
    previous,
    incomeChange,
    expensesChange,
  }
}

// ==========================================
// UTILIDADES INTERNAS
// ==========================================

/**
 * Obtiene IDs de todas las cuentas bancarias del usuario
 */
async function getUserAccountIds(userId: string): Promise<string[]> {
  const connections = await db
    .select({ id: bankConnections.id })
    .from(bankConnections)
    .where(
      and(
        eq(bankConnections.userId, userId),
        eq(bankConnections.status, 'active')
      )
    )

  if (connections.length === 0) return []

  const connectionIds = connections.map(c => c.id)

  const accounts = await db
    .select({ id: bankAccounts.id })
    .from(bankAccounts)
    .where(
      sql`${bankAccounts.connectionId} IN (${sql.join(connectionIds.map(id => sql`${id}`), sql`, `)})`
    )

  return accounts.map(a => a.id)
}

/**
 * Enmascara un IBAN mostrando solo los primeros 4 y últimos 4 caracteres
 */
function maskIban(iban: string): string {
  if (iban.length <= 8) return iban
  return `${iban.slice(0, 4)}${'*'.repeat(iban.length - 8)}${iban.slice(-4)}`
}

// ==========================================
// NUEVAS FUNCIONES: Historial de saldos e ingresos
// ==========================================

/**
 * Obtiene el historial de saldos para gráficos de evolución
 * @param days Número de días hacia atrás (default: 90)
 */
export async function getBalanceHistory(days: number = 90) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const accountIds = await getUserAccountIds(user.id)
  if (accountIds.length === 0) return []

  // Calcular fecha de inicio
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  // Obtener historial de saldos
  const history = await db
    .select({
      balance: bankBalanceHistory.balance,
      currency: bankBalanceHistory.currency,
      referenceDate: bankBalanceHistory.referenceDate,
      fetchedAt: bankBalanceHistory.fetchedAt,
    })
    .from(bankBalanceHistory)
    .where(
      and(
        sql`${bankBalanceHistory.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`,
        gte(bankBalanceHistory.referenceDate, startDateStr)
      )
    )
    .orderBy(asc(bankBalanceHistory.referenceDate))

  // Agrupar por fecha (sumando si hay múltiples cuentas)
  const balanceByDate = new Map<string, { balance: number; currency: string }>()

  for (const record of history) {
    const dateKey = record.referenceDate
    const currentBalance = parseFloat(record.balance || '0')

    if (balanceByDate.has(dateKey)) {
      const existing = balanceByDate.get(dateKey)!
      existing.balance += currentBalance
    } else {
      balanceByDate.set(dateKey, {
        balance: currentBalance,
        currency: record.currency || 'EUR',
      })
    }
  }

  // Convertir a array para el gráfico
  return Array.from(balanceByDate.entries()).map(([date, data]) => ({
    date,
    balance: Math.round(data.balance * 100) / 100,
    currency: data.currency,
  }))
}

/**
 * Obtiene el total de ingresos del mes actual
 */
export async function getMonthlyIncome() {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { income: 0, transactionCount: 0 }
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // Calcular fechas del mes
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  // Obtener IDs de cuentas del usuario
  const accountIds = await getUserAccountIds(user.id)

  if (accountIds.length === 0) {
    return { income: 0, transactionCount: 0 }
  }

  // Obtener solo transacciones con monto positivo (ingresos)
  const transactions = await db
    .select({
      amount: bankTransactions.amount,
    })
    .from(bankTransactions)
    .where(
      and(
        sql`${bankTransactions.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`,
        gte(bankTransactions.bookingDate, startDateStr),
        lte(bankTransactions.bookingDate, endDateStr),
        sql`CAST(${bankTransactions.amount} AS DECIMAL) > 0` // Solo ingresos
      )
    )

  let totalIncome = 0
  for (const tx of transactions) {
    totalIncome += parseFloat(tx.amount || '0')
  }

  return {
    income: Math.round(totalIncome * 100) / 100,
    transactionCount: transactions.length,
  }
}

/**
 * Obtiene los últimos ingresos del usuario
 * @param limit Número de transacciones a obtener
 */
export async function getRecentIncomes(limit: number = 5) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const accountIds = await getUserAccountIds(user.id)
  if (accountIds.length === 0) return []

  const transactions = await db
    .select({
      id: bankTransactions.id,
      amount: bankTransactions.amount,
      currency: bankTransactions.currency,
      description: bankTransactions.description,
      debtorName: bankTransactions.debtorName,
      bookingDate: bankTransactions.bookingDate,
    })
    .from(bankTransactions)
    .where(
      and(
        sql`${bankTransactions.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`,
        sql`CAST(${bankTransactions.amount} AS DECIMAL) > 0` // Solo ingresos
      )
    )
    .orderBy(desc(bankTransactions.bookingDate), desc(bankTransactions.createdAt))
    .limit(limit)

  return transactions.map(tx => ({
    id: tx.id,
    amount: parseFloat(tx.amount || '0'),
    currency: tx.currency || 'EUR',
    description: tx.description || tx.debtorName || 'Ingreso',
    date: tx.bookingDate,
  }))
}
