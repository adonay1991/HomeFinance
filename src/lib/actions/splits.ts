'use server'

import { db, expenseSplits, expenses, users } from '@/lib/db/client'
import { eq, and, inArray } from 'drizzle-orm'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// SERVER ACTIONS: Splits de Gastos
// Permite dividir gastos entre miembros del hogar
// ==========================================

interface SplitData {
  userId: string
  amount: number
  percentage?: number
}

interface CreateSplitsInput {
  expenseId: string
  splits: SplitData[]
}

/**
 * Crea splits para un gasto existente
 * @param input Datos de los splits a crear
 */
export async function createExpenseSplits(input: CreateSplitsInput) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  // Verificar que el gasto existe
  const [expense] = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, input.expenseId))
    .limit(1)

  if (!expense) {
    return { error: 'Gasto no encontrado' }
  }

  // Verificar que la suma de los splits no exceda el monto del gasto
  const totalSplitAmount = input.splits.reduce((sum, s) => sum + s.amount, 0)
  const expenseAmount = parseFloat(expense.amount)

  if (Math.abs(totalSplitAmount - expenseAmount) > 0.01) {
    return { error: 'La suma de los splits debe ser igual al monto del gasto' }
  }

  try {
    // Eliminar splits existentes para este gasto
    await db
      .delete(expenseSplits)
      .where(eq(expenseSplits.expenseId, input.expenseId))

    // Crear nuevos splits
    const splitsToInsert = input.splits.map(split => ({
      expenseId: input.expenseId,
      userId: split.userId,
      amount: split.amount.toString(),
      percentage: split.percentage?.toString(),
      isPaid: split.userId === expense.paidBy, // El que pagó ya tiene su parte "pagada"
      paidAt: split.userId === expense.paidBy ? new Date() : null,
    }))

    await db.insert(expenseSplits).values(splitsToInsert)

    revalidatePath('/')
    revalidatePath('/expenses')
    revalidatePath('/household')

    return { success: true }
  } catch (error) {
    console.error('[Splits] Error creating splits:', error)
    return { error: 'Error al crear los splits' }
  }
}

/**
 * Obtiene los splits de un gasto específico
 */
export async function getExpenseSplits(expenseId: string) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado', data: [] }
  }

  const splits = await db
    .select({
      id: expenseSplits.id,
      userId: expenseSplits.userId,
      userName: users.name,
      userEmail: users.email,
      amount: expenseSplits.amount,
      percentage: expenseSplits.percentage,
      isPaid: expenseSplits.isPaid,
      paidAt: expenseSplits.paidAt,
    })
    .from(expenseSplits)
    .innerJoin(users, eq(expenseSplits.userId, users.id))
    .where(eq(expenseSplits.expenseId, expenseId))

  return { data: splits }
}

/**
 * Obtiene todos los splits pendientes de pago del usuario actual
 */
export async function getMyPendingSplits() {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado', data: [] }
  }

  const pendingSplits = await db
    .select({
      splitId: expenseSplits.id,
      amount: expenseSplits.amount,
      expenseId: expenseSplits.expenseId,
      expenseDescription: expenses.description,
      expenseCategory: expenses.category,
      expenseDate: expenses.date,
      paidByUserId: expenses.paidBy,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(
      and(
        eq(expenseSplits.userId, user.id),
        eq(expenseSplits.isPaid, false)
      )
    )

  // Obtener nombres de quienes pagaron
  const paidByIds = [...new Set(pendingSplits.map(s => s.paidByUserId))]

  if (paidByIds.length === 0) {
    return { data: [] }
  }

  const paidByUsers = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, paidByIds))

  const paidByMap = new Map(paidByUsers.map(u => [u.id, u.name]))

  const result = pendingSplits.map(split => ({
    ...split,
    amount: parseFloat(split.amount),
    paidByName: paidByMap.get(split.paidByUserId) ?? 'Desconocido',
  }))

  return { data: result }
}

/**
 * Obtiene splits pendientes que otros deben al usuario actual
 */
export async function getSplitsOwedToMe() {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado', data: [] }
  }

  // Buscar gastos pagados por el usuario que tienen splits pendientes de otros
  const owedSplits = await db
    .select({
      splitId: expenseSplits.id,
      amount: expenseSplits.amount,
      userId: expenseSplits.userId,
      expenseId: expenseSplits.expenseId,
      expenseDescription: expenses.description,
      expenseCategory: expenses.category,
      expenseDate: expenses.date,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(
      and(
        eq(expenses.paidBy, user.id),
        eq(expenseSplits.isPaid, false),
        // No incluir el split del propio pagador (que ya está marcado como pagado)
      )
    )

  // Obtener nombres de quienes deben
  const debtorIds = [...new Set(owedSplits.map(s => s.userId).filter(id => id !== user.id))]

  if (debtorIds.length === 0) {
    return { data: [] }
  }

  const debtorUsers = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, debtorIds))

  const debtorMap = new Map(debtorUsers.map(u => [u.id, u.name]))

  const result = owedSplits
    .filter(split => split.userId !== user.id) // Excluir mi propia parte
    .map(split => ({
      ...split,
      amount: parseFloat(split.amount),
      debtorName: debtorMap.get(split.userId) ?? 'Desconocido',
    }))

  return { data: result }
}

/**
 * Marca un split como pagado
 */
export async function markSplitAsPaid(splitId: string) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  try {
    await db
      .update(expenseSplits)
      .set({
        isPaid: true,
        paidAt: new Date(),
      })
      .where(eq(expenseSplits.id, splitId))

    revalidatePath('/')
    revalidatePath('/expenses')
    revalidatePath('/household')

    return { success: true }
  } catch (error) {
    console.error('[Splits] Error marking split as paid:', error)
    return { error: 'Error al marcar como pagado' }
  }
}

/**
 * Elimina los splits de un gasto (vuelve a ser un gasto simple)
 */
export async function removeExpenseSplits(expenseId: string) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  try {
    await db
      .delete(expenseSplits)
      .where(eq(expenseSplits.expenseId, expenseId))

    revalidatePath('/')
    revalidatePath('/expenses')
    revalidatePath('/household')

    return { success: true }
  } catch (error) {
    console.error('[Splits] Error removing splits:', error)
    return { error: 'Error al eliminar los splits' }
  }
}

/**
 * Obtiene un resumen de splits pendientes del usuario
 */
export async function getSplitsSummary() {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: 'No autenticado',
      data: { totalOwed: 0, totalOwedToMe: 0, pendingCount: 0 }
    }
  }

  // Lo que debo a otros
  const myPending = await getMyPendingSplits()
  const totalOwed = myPending.data?.reduce((sum, s) => sum + s.amount, 0) ?? 0

  // Lo que me deben
  const owedToMe = await getSplitsOwedToMe()
  const totalOwedToMe = owedToMe.data?.reduce((sum, s) => sum + s.amount, 0) ?? 0

  return {
    data: {
      totalOwed: Math.round(totalOwed * 100) / 100,
      totalOwedToMe: Math.round(totalOwedToMe * 100) / 100,
      pendingCount: (myPending.data?.length ?? 0) + (owedToMe.data?.length ?? 0),
    }
  }
}
