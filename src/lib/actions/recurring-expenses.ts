'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_HOUSEHOLD_ID, type CategoryKey } from '@/lib/constants'

// ==========================================
// SERVER ACTIONS PARA GASTOS RECURRENTES
// ==========================================

export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface RecurringExpenseData {
  amount: number
  description?: string
  category: CategoryKey
  tags?: string[]
  frequency: Frequency
  dayOfMonth?: number // Para mensual/anual
  dayOfWeek?: number // Para semanal (0=domingo)
  monthOfYear?: number // Para anual
  startDate: string
  endDate?: string
}

export interface RecurringExpense {
  id: string
  amount: number
  description: string | null
  category: string
  tags: string[] | null
  frequency: Frequency
  dayOfMonth: number | null
  dayOfWeek: number | null
  monthOfYear: number | null
  startDate: string
  endDate: string | null
  lastExecutedDate: string | null
  nextExecutionDate: string
  isActive: boolean
  createdAt: string
}

// Calcular la próxima fecha de ejecución
function calculateNextExecutionDate(
  frequency: Frequency,
  startDate: string,
  dayOfMonth?: number,
  dayOfWeek?: number,
  monthOfYear?: number
): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  // Si la fecha de inicio es en el futuro, usar esa
  if (start >= today) {
    return startDate
  }

  let nextDate = new Date(today)

  switch (frequency) {
    case 'weekly': {
      const targetDay = dayOfWeek ?? 1 // Por defecto lunes
      const currentDay = nextDate.getDay()
      const daysToAdd = (targetDay - currentDay + 7) % 7 || 7
      nextDate.setDate(nextDate.getDate() + daysToAdd)
      break
    }
    case 'biweekly': {
      const targetDay = dayOfWeek ?? 1
      const currentDay = nextDate.getDay()
      const daysToAdd = (targetDay - currentDay + 7) % 7 || 7
      nextDate.setDate(nextDate.getDate() + daysToAdd)
      // Si han pasado más de una semana, saltar a la próxima quincena
      const weeksSinceStart = Math.floor((nextDate.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
      if (weeksSinceStart % 2 !== 0) {
        nextDate.setDate(nextDate.getDate() + 7)
      }
      break
    }
    case 'monthly': {
      const targetDay = dayOfMonth ?? 1
      nextDate.setDate(targetDay)
      if (nextDate <= today) {
        nextDate.setMonth(nextDate.getMonth() + 1)
      }
      // Ajustar si el día no existe en el mes (ej: 31 de febrero)
      while (nextDate.getDate() !== targetDay) {
        nextDate.setDate(0) // Último día del mes anterior
      }
      break
    }
    case 'yearly': {
      const targetMonth = (monthOfYear ?? 1) - 1 // 0-indexed
      const targetDay = dayOfMonth ?? 1
      nextDate.setMonth(targetMonth, targetDay)
      if (nextDate <= today) {
        nextDate.setFullYear(nextDate.getFullYear() + 1)
      }
      break
    }
  }

  return nextDate.toISOString().split('T')[0]
}

// Crear gasto recurrente
export async function createRecurringExpense(data: RecurringExpenseData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  const nextExecutionDate = calculateNextExecutionDate(
    data.frequency,
    data.startDate,
    data.dayOfMonth,
    data.dayOfWeek,
    data.monthOfYear
  )

  const { error } = await supabase
    .from('recurring_expenses')
    .insert({
      household_id: DEFAULT_HOUSEHOLD_ID,
      amount: data.amount,
      description: data.description || null,
      category: data.category,
      tags: data.tags || [],
      frequency: data.frequency,
      day_of_month: data.dayOfMonth || null,
      day_of_week: data.dayOfWeek ?? null,
      month_of_year: data.monthOfYear || null,
      start_date: data.startDate,
      end_date: data.endDate || null,
      next_execution_date: nextExecutionDate,
      created_by: user.id,
    })

  if (error) {
    console.error('Error creating recurring expense:', error)
    return { error: 'Error al crear el gasto recurrente' }
  }

  revalidatePath('/')
  return { success: true }
}

// Obtener todos los gastos recurrentes
export async function getRecurringExpenses(includeInactive = false) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado', data: [] }
  }

  let query = supabase
    .from('recurring_expenses')
    .select('*')
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .order('next_execution_date', { ascending: true })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching recurring expenses:', error)
    return { error: 'Error al cargar los gastos recurrentes', data: [] }
  }

  return {
    data: (data || []).map(item => ({
      id: item.id,
      amount: Number(item.amount),
      description: item.description,
      category: item.category,
      tags: item.tags,
      frequency: item.frequency as Frequency,
      dayOfMonth: item.day_of_month,
      dayOfWeek: item.day_of_week,
      monthOfYear: item.month_of_year,
      startDate: item.start_date,
      endDate: item.end_date,
      lastExecutedDate: item.last_executed_date,
      nextExecutionDate: item.next_execution_date,
      isActive: item.is_active,
      createdAt: item.created_at,
    })) as RecurringExpense[]
  }
}

// Actualizar gasto recurrente
export async function updateRecurringExpense(id: string, data: Partial<RecurringExpenseData>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  const updateData: Record<string, unknown> = {}

  if (data.amount !== undefined) updateData.amount = data.amount
  if (data.description !== undefined) updateData.description = data.description
  if (data.category !== undefined) updateData.category = data.category
  if (data.tags !== undefined) updateData.tags = data.tags
  if (data.frequency !== undefined) updateData.frequency = data.frequency
  if (data.dayOfMonth !== undefined) updateData.day_of_month = data.dayOfMonth
  if (data.dayOfWeek !== undefined) updateData.day_of_week = data.dayOfWeek
  if (data.monthOfYear !== undefined) updateData.month_of_year = data.monthOfYear
  if (data.startDate !== undefined) updateData.start_date = data.startDate
  if (data.endDate !== undefined) updateData.end_date = data.endDate

  // Recalcular próxima ejecución si cambió la frecuencia
  if (data.frequency || data.startDate || data.dayOfMonth !== undefined || data.dayOfWeek !== undefined) {
    // Obtener datos actuales para completar
    const { data: current } = await supabase
      .from('recurring_expenses')
      .select('frequency, start_date, day_of_month, day_of_week, month_of_year')
      .eq('id', id)
      .single()

    if (current) {
      const frequency = data.frequency || current.frequency
      const startDate = data.startDate || current.start_date
      const dayOfMonth = data.dayOfMonth ?? current.day_of_month
      const dayOfWeek = data.dayOfWeek ?? current.day_of_week
      const monthOfYear = data.monthOfYear ?? current.month_of_year

      updateData.next_execution_date = calculateNextExecutionDate(
        frequency as Frequency,
        startDate,
        dayOfMonth ?? undefined,
        dayOfWeek ?? undefined,
        monthOfYear ?? undefined
      )
    }
  }

  const { error } = await supabase
    .from('recurring_expenses')
    .update(updateData)
    .eq('id', id)
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)

  if (error) {
    console.error('Error updating recurring expense:', error)
    return { error: 'Error al actualizar el gasto recurrente' }
  }

  revalidatePath('/')
  return { success: true }
}

// Pausar/Reactivar gasto recurrente
export async function toggleRecurringExpense(id: string, isActive: boolean) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('recurring_expenses')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)

  if (error) {
    console.error('Error toggling recurring expense:', error)
    return { error: 'Error al actualizar el gasto recurrente' }
  }

  revalidatePath('/')
  return { success: true }
}

// Eliminar gasto recurrente
export async function deleteRecurringExpense(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', id)
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)

  if (error) {
    console.error('Error deleting recurring expense:', error)
    return { error: 'Error al eliminar el gasto recurrente' }
  }

  revalidatePath('/')
  return { success: true }
}

// Ejecutar gastos recurrentes pendientes (llamar periódicamente)
export async function executeRecurringExpenses() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado', created: 0 }
  }

  const today = new Date().toISOString().split('T')[0]

  // Obtener gastos recurrentes que deben ejecutarse hoy o antes
  const { data: pending, error: fetchError } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .eq('is_active', true)
    .lte('next_execution_date', today)

  if (fetchError) {
    console.error('Error fetching pending recurring expenses:', fetchError)
    return { error: 'Error al procesar gastos recurrentes', created: 0 }
  }

  let created = 0

  for (const recurring of pending || []) {
    // Verificar si ya pasó la fecha de fin
    if (recurring.end_date && recurring.end_date < today) {
      // Desactivar el gasto recurrente
      await supabase
        .from('recurring_expenses')
        .update({ is_active: false })
        .eq('id', recurring.id)
      continue
    }

    // Crear el gasto
    const { error: insertError } = await supabase
      .from('expenses')
      .insert({
        household_id: DEFAULT_HOUSEHOLD_ID,
        amount: recurring.amount,
        description: recurring.description,
        category: recurring.category,
        tags: recurring.tags,
        date: recurring.next_execution_date,
        paid_by: user.id,
        source: 'recurring',
      })

    if (insertError) {
      console.error('Error creating expense from recurring:', insertError)
      continue
    }

    created++

    // Calcular próxima fecha de ejecución
    const nextDate = calculateNextExecutionDate(
      recurring.frequency as Frequency,
      recurring.next_execution_date, // Usar la fecha actual como base
      recurring.day_of_month ?? undefined,
      recurring.day_of_week ?? undefined,
      recurring.month_of_year ?? undefined
    )

    // Actualizar el gasto recurrente
    await supabase
      .from('recurring_expenses')
      .update({
        last_executed_date: recurring.next_execution_date,
        next_execution_date: nextDate,
      })
      .eq('id', recurring.id)
  }

  revalidatePath('/')
  revalidatePath('/expenses')

  return { success: true, created }
}

// Obtener resumen de gastos recurrentes (próximos del mes)
export async function getRecurringExpensesSummary() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado', data: null }
  }

  const now = new Date()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const endOfMonthStr = endOfMonth.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('amount, next_execution_date')
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .eq('is_active', true)
    .lte('next_execution_date', endOfMonthStr)

  if (error) {
    console.error('Error fetching recurring expenses summary:', error)
    return { error: 'Error al cargar resumen', data: null }
  }

  const totalPending = (data || []).reduce((sum, item) => sum + Number(item.amount), 0)
  const count = data?.length || 0

  return {
    data: {
      count,
      totalPending,
    }
  }
}
