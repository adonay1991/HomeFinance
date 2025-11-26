'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_HOUSEHOLD_ID } from '@/lib/constants'

// ==========================================
// SERVER ACTIONS PARA PRESUPUESTO MENSUAL
// ==========================================

// Categoría especial para el presupuesto total
const TOTAL_BUDGET_CATEGORY = '_total'

export interface MonthlyBudget {
  id: string
  amount: number
  year: number
  month: number
}

// Obtener el presupuesto del mes
export async function getMonthlyBudget(year: number, month: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado', data: null }
  }

  const { data, error } = await supabase
    .from('budgets')
    .select('id, monthly_limit, year, month')
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .eq('category', TOTAL_BUDGET_CATEGORY)
    .eq('year', year)
    .eq('month', month)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching budget:', error)
    return { error: 'Error al cargar presupuesto', data: null }
  }

  if (!data) {
    return { data: null }
  }

  return {
    data: {
      id: data.id,
      amount: Number(data.monthly_limit),
      year: data.year,
      month: data.month,
    }
  }
}

// Establecer o actualizar el presupuesto del mes
export async function setMonthlyBudget(amount: number, year: number, month: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  if (amount <= 0) {
    return { error: 'El presupuesto debe ser mayor que 0' }
  }

  // Buscar si ya existe
  const { data: existing } = await supabase
    .from('budgets')
    .select('id')
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .eq('category', TOTAL_BUDGET_CATEGORY)
    .eq('year', year)
    .eq('month', month)
    .single()

  if (existing) {
    // Actualizar
    const { error } = await supabase
      .from('budgets')
      .update({ monthly_limit: amount })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating budget:', error)
      return { error: 'Error al actualizar presupuesto' }
    }
  } else {
    // Crear nuevo
    const { error } = await supabase
      .from('budgets')
      .insert({
        household_id: DEFAULT_HOUSEHOLD_ID,
        category: TOTAL_BUDGET_CATEGORY,
        monthly_limit: amount,
        year,
        month,
      })

    if (error) {
      console.error('Error creating budget:', error)
      return { error: 'Error al crear presupuesto' }
    }
  }

  revalidatePath('/')
  revalidatePath('/expenses')

  return { success: true }
}

// Eliminar el presupuesto del mes
export async function deleteMonthlyBudget(year: number, month: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .eq('category', TOTAL_BUDGET_CATEGORY)
    .eq('year', year)
    .eq('month', month)

  if (error) {
    console.error('Error deleting budget:', error)
    return { error: 'Error al eliminar presupuesto' }
  }

  revalidatePath('/')
  revalidatePath('/expenses')

  return { success: true }
}

// Obtener resumen del presupuesto: presupuesto, gastado, disponible
export async function getBudgetSummary(year: number, month: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado', data: null }
  }

  // Obtener presupuesto
  const budgetResult = await getMonthlyBudget(year, month)
  const budget = budgetResult.data?.amount || 0

  // Calcular fechas del mes
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  // Obtener total gastado
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('amount')
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) {
    console.error('Error fetching expenses:', error)
    return { error: 'Error al cargar gastos', data: null }
  }

  const spent = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0)
  const remaining = budget - spent
  const percentage = budget > 0 ? (spent / budget) * 100 : 0

  return {
    data: {
      budget,
      spent,
      remaining,
      percentage,
      hasBudget: budget > 0,
    }
  }
}
