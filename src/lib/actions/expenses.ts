'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { expenseSchema, type ExpenseFormData } from '@/lib/validations/expense'
import { DEFAULT_HOUSEHOLD_ID } from '@/lib/constants'

// ==========================================
// SERVER ACTIONS PARA GASTOS
// ==========================================

export async function createExpense(data: ExpenseFormData) {
  const supabase = await createClient()

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  // Validar datos
  const validated = expenseSchema.safeParse(data)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  // Insertar gasto
  const { error } = await supabase
    .from('expenses')
    .insert({
      household_id: DEFAULT_HOUSEHOLD_ID,
      amount: validated.data.amount,
      description: validated.data.description || null,
      category: validated.data.category,
      tags: validated.data.tags || [],
      date: validated.data.date,
      paid_by: user.id,
    })

  if (error) {
    console.error('Error creating expense:', error)
    return { error: 'Error al guardar el gasto' }
  }

  revalidatePath('/')
  revalidatePath('/expenses')

  return { success: true }
}

export async function getExpenses(options?: {
  limit?: number
  offset?: number
  category?: string
  startDate?: string
  endDate?: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado', data: [] }
  }

  let query = supabase
    .from('expenses')
    .select(`
      *,
      paid_by_user:users!paid_by(name, email)
    `)
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (options?.category) {
    query = query.eq('category', options.category)
  }

  if (options?.startDate) {
    query = query.gte('date', options.startDate)
  }

  if (options?.endDate) {
    query = query.lte('date', options.endDate)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching expenses:', error)
    return { error: 'Error al cargar los gastos', data: [] }
  }

  return { data: data || [] }
}

export async function getExpenseById(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      paid_by_user:users!paid_by(name, email)
    `)
    .eq('id', id)
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .single()

  if (error) {
    console.error('Error fetching expense:', error)
    return { error: 'Gasto no encontrado' }
  }

  return { data }
}

export async function updateExpense(id: string, data: Partial<ExpenseFormData>) {
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
  if (data.date !== undefined) updateData.date = data.date

  const { error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', id)
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)

  if (error) {
    console.error('Error updating expense:', error)
    return { error: 'Error al actualizar el gasto' }
  }

  revalidatePath('/')
  revalidatePath('/expenses')

  return { success: true }
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)

  if (error) {
    console.error('Error deleting expense:', error)
    return { error: 'Error al eliminar el gasto' }
  }

  revalidatePath('/')
  revalidatePath('/expenses')

  return { success: true }
}

export async function getMonthlyStats(year: number, month: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  // Calcular fechas del mes
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('expenses')
    .select('amount, category')
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) {
    console.error('Error fetching monthly stats:', error)
    return { error: 'Error al cargar estadísticas' }
  }

  // Calcular totales
  const total = data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

  // Agrupar por categoría
  const byCategory = data?.reduce((acc, e) => {
    const cat = e.category
    acc[cat] = (acc[cat] || 0) + Number(e.amount)
    return acc
  }, {} as Record<string, number>) || {}

  return {
    data: {
      total,
      byCategory,
      count: data?.length || 0,
    }
  }
}

// Obtener estadísticas de los últimos N meses
export async function getMonthlyHistory(months: number = 6) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado', data: [] }
  }

  const now = new Date()
  const result = []

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('household_id', DEFAULT_HOUSEHOLD_ID)
      .gte('date', startDate)
      .lte('date', endDate)

    if (!error) {
      const total = data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

      result.push({
        month: `${year}-${String(month).padStart(2, '0')}`,
        monthLabel: monthNames[month - 1],
        total,
      })
    }
  }

  return { data: result }
}
