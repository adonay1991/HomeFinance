'use server'

import { db, expenses, bankTransactions, bankAccounts, bankConnections } from '@/lib/db/client'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { DEFAULT_HOUSEHOLD_ID, CATEGORIES, type CategoryKey } from '@/lib/constants'

// ==========================================
// SERVER ACTIONS: Analytics y Reportes
// Funciones para el dashboard de análisis
// ==========================================

/**
 * Obtiene comparativa del mes actual vs mes anterior
 */
export async function getMonthOverMonthComparison() {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado', data: null }
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

  // Fechas del mes actual
  const currentStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
  const currentEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

  // Fechas del mes anterior
  const prevStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
  const prevEnd = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0]

  // Obtener gastos de ambos meses
  const [currentExpenses, prevExpenses] = await Promise.all([
    db
      .select({ amount: expenses.amount, category: expenses.category })
      .from(expenses)
      .where(
        and(
          eq(expenses.householdId, DEFAULT_HOUSEHOLD_ID),
          gte(expenses.date, currentStart),
          lte(expenses.date, currentEnd)
        )
      ),
    db
      .select({ amount: expenses.amount, category: expenses.category })
      .from(expenses)
      .where(
        and(
          eq(expenses.householdId, DEFAULT_HOUSEHOLD_ID),
          gte(expenses.date, prevStart),
          lte(expenses.date, prevEnd)
        )
      ),
  ])

  const currentTotal = currentExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const prevTotal = prevExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)

  const change = prevTotal > 0
    ? ((currentTotal - prevTotal) / prevTotal) * 100
    : 0

  // Por categoría
  const currentByCategory = currentExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount)
    return acc
  }, {} as Record<string, number>)

  const prevByCategory = prevExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount)
    return acc
  }, {} as Record<string, number>)

  return {
    data: {
      current: {
        total: Math.round(currentTotal * 100) / 100,
        count: currentExpenses.length,
        byCategory: currentByCategory,
      },
      previous: {
        total: Math.round(prevTotal * 100) / 100,
        count: prevExpenses.length,
        byCategory: prevByCategory,
      },
      changePercent: Math.round(change * 10) / 10,
      monthNames: {
        current: getMonthName(currentMonth),
        previous: getMonthName(prevMonth),
      },
    }
  }
}

/**
 * Obtiene tendencias de categorías (últimos 6 meses)
 */
export async function getCategoryTrends(months: number = 6) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado', data: [] }
  }

  const results: Array<{
    month: string
    monthLabel: string
    categories: Record<string, number>
  }> = []

  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const monthExpenses = await db
      .select({ amount: expenses.amount, category: expenses.category })
      .from(expenses)
      .where(
        and(
          eq(expenses.householdId, DEFAULT_HOUSEHOLD_ID),
          gte(expenses.date, startDate),
          lte(expenses.date, endDate)
        )
      )

    const byCategory = monthExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount)
      return acc
    }, {} as Record<string, number>)

    results.push({
      month: `${year}-${String(month).padStart(2, '0')}`,
      monthLabel: getMonthName(month),
      categories: byCategory,
    })
  }

  return { data: results }
}

/**
 * Obtiene los top comercios donde más se gasta (requiere banco conectado)
 */
export async function getTopMerchants(limit: number = 5) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado', data: [] }
  }

  // Obtener cuentas del usuario
  const connections = await db
    .select({ id: bankConnections.id })
    .from(bankConnections)
    .where(
      and(
        eq(bankConnections.userId, user.id),
        eq(bankConnections.status, 'active')
      )
    )

  if (connections.length === 0) {
    return { data: [] }
  }

  const connectionIds = connections.map(c => c.id)

  const accounts = await db
    .select({ id: bankAccounts.id })
    .from(bankAccounts)
    .where(
      sql`${bankAccounts.connectionId} IN (${sql.join(connectionIds.map(id => sql`${id}`), sql`, `)})`
    )

  if (accounts.length === 0) {
    return { data: [] }
  }

  const accountIds = accounts.map(a => a.id)

  // Últimos 3 meses
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const startDate = threeMonthsAgo.toISOString().split('T')[0]

  // Obtener transacciones con nombre de comercio (gastos = amount < 0)
  const transactions = await db
    .select({
      creditorName: bankTransactions.creditorName,
      amount: bankTransactions.amount,
    })
    .from(bankTransactions)
    .where(
      and(
        sql`${bankTransactions.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`,
        gte(bankTransactions.bookingDate, startDate),
        sql`CAST(${bankTransactions.amount} AS DECIMAL) < 0` // Solo gastos
      )
    )

  // Agrupar por comercio
  const merchantTotals = new Map<string, { total: number; count: number }>()

  for (const tx of transactions) {
    const name = tx.creditorName || 'Desconocido'
    const amount = Math.abs(parseFloat(tx.amount || '0'))

    const existing = merchantTotals.get(name) || { total: 0, count: 0 }
    merchantTotals.set(name, {
      total: existing.total + amount,
      count: existing.count + 1,
    })
  }

  // Ordenar y limitar
  const sorted = Array.from(merchantTotals.entries())
    .filter(([name]) => name !== 'Desconocido')
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit)
    .map(([name, data]) => ({
      name,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
    }))

  return { data: sorted }
}

/**
 * Obtiene resumen anual de gastos
 */
export async function getAnnualSummary(year?: number) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado', data: null }
  }

  const targetYear = year || new Date().getFullYear()
  const startDate = `${targetYear}-01-01`
  const endDate = `${targetYear}-12-31`

  const yearExpenses = await db
    .select({
      amount: expenses.amount,
      category: expenses.category,
      date: expenses.date,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.householdId, DEFAULT_HOUSEHOLD_ID),
        gte(expenses.date, startDate),
        lte(expenses.date, endDate)
      )
    )

  const total = yearExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)

  // Por categoría
  const byCategory = yearExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount)
    return acc
  }, {} as Record<string, number>)

  // Por mes
  const byMonth = yearExpenses.reduce((acc, e) => {
    const month = parseInt(e.date.split('-')[1])
    acc[month] = (acc[month] || 0) + parseFloat(e.amount)
    return acc
  }, {} as Record<number, number>)

  // Promedios
  const monthsWithData = Object.keys(byMonth).length
  const monthlyAverage = monthsWithData > 0 ? total / monthsWithData : 0

  // Mes con más gasto
  let maxMonth = 1
  let maxAmount = 0
  for (const [month, amount] of Object.entries(byMonth)) {
    if (amount > maxAmount) {
      maxAmount = amount
      maxMonth = parseInt(month)
    }
  }

  return {
    data: {
      year: targetYear,
      total: Math.round(total * 100) / 100,
      count: yearExpenses.length,
      monthlyAverage: Math.round(monthlyAverage * 100) / 100,
      byCategory,
      byMonth,
      peakMonth: {
        month: maxMonth,
        monthName: getMonthName(maxMonth),
        amount: Math.round(maxAmount * 100) / 100,
      },
    }
  }
}

/**
 * Detecta gastos inusuales (> 2x promedio de la categoría)
 */
export async function getUnusualExpenses(months: number = 3) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado', data: [] }
  }

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)
  const startDateStr = startDate.toISOString().split('T')[0]

  const recentExpenses = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.householdId, DEFAULT_HOUSEHOLD_ID),
        gte(expenses.date, startDateStr)
      )
    )
    .orderBy(desc(expenses.date))

  // Calcular promedio por categoría
  const categoryStats = new Map<string, { total: number; count: number; expenses: typeof recentExpenses }>()

  for (const expense of recentExpenses) {
    const stats = categoryStats.get(expense.category) || { total: 0, count: 0, expenses: [] }
    stats.total += parseFloat(expense.amount)
    stats.count += 1
    stats.expenses.push(expense)
    categoryStats.set(expense.category, stats)
  }

  // Detectar inusuales
  const unusual: Array<{
    id: string
    amount: number
    description: string | null
    category: string
    categoryLabel: string
    date: string
    averageForCategory: number
    percentAboveAverage: number
  }> = []

  for (const [category, stats] of categoryStats.entries()) {
    if (stats.count < 3) continue // Necesitamos al menos 3 gastos para comparar

    const average = stats.total / stats.count

    for (const expense of stats.expenses) {
      const amount = parseFloat(expense.amount)
      if (amount > average * 2) {
        unusual.push({
          id: expense.id,
          amount: Math.round(amount * 100) / 100,
          description: expense.description,
          category,
          categoryLabel: CATEGORIES[category as CategoryKey]?.label ?? category,
          date: expense.date,
          averageForCategory: Math.round(average * 100) / 100,
          percentAboveAverage: Math.round(((amount - average) / average) * 100),
        })
      }
    }
  }

  // Ordenar por fecha más reciente
  unusual.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return { data: unusual.slice(0, 10) }
}

// ==========================================
// UTILIDADES
// ==========================================

function getMonthName(month: number): string {
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return names[month - 1] ?? ''
}
