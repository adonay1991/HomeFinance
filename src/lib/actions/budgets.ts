'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_HOUSEHOLD_ID, type CategoryKey } from '@/lib/constants'

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

// ==========================================
// PRESUPUESTOS POR CATEGORÍA
// ==========================================

export interface CategoryBudget {
  category: CategoryKey
  limit: number
  spent: number
  remaining: number
  percentage: number
}

// Establecer presupuesto para una categoría específica
export async function setCategoryBudget(category: CategoryKey, limit: number, year: number, month: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  if (limit <= 0) {
    return { error: 'El presupuesto debe ser mayor que 0' }
  }

  // Upsert: crear o actualizar
  const { error } = await supabase
    .from('budgets')
    .upsert({
      household_id: DEFAULT_HOUSEHOLD_ID,
      category,
      monthly_limit: limit,
      year,
      month,
    }, {
      onConflict: 'household_id,category,year,month',
    })

  if (error) {
    console.error('Error setting category budget:', error)
    return { error: 'Error al guardar el presupuesto' }
  }

  revalidatePath('/')
  revalidatePath('/expenses')

  return { success: true }
}

// Eliminar presupuesto de una categoría
export async function deleteCategoryBudget(category: CategoryKey, year: number, month: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .eq('category', category)
    .eq('year', year)
    .eq('month', month)

  if (error) {
    console.error('Error deleting category budget:', error)
    return { error: 'Error al eliminar el presupuesto' }
  }

  revalidatePath('/')
  revalidatePath('/expenses')

  return { success: true }
}

// Obtener presupuestos por categoría con gasto actual
export async function getCategoryBudgets(year: number, month: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado', data: [] }
  }

  // Obtener presupuestos (excluyendo el _total)
  const { data: budgets, error: budgetsError } = await supabase
    .from('budgets')
    .select('category, monthly_limit')
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .eq('year', year)
    .eq('month', month)
    .neq('category', TOTAL_BUDGET_CATEGORY)

  if (budgetsError) {
    console.error('Error fetching category budgets:', budgetsError)
    return { error: 'Error al cargar presupuestos', data: [] }
  }

  // Calcular fechas del mes
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  // Obtener gastos del mes
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('amount, category')
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .gte('date', startDate)
    .lte('date', endDate)

  if (expensesError) {
    console.error('Error fetching expenses:', expensesError)
    return { error: 'Error al cargar gastos', data: [] }
  }

  // Agrupar gastos por categoría
  const spentByCategory = (expenses || []).reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
    return acc
  }, {} as Record<string, number>)

  // Combinar presupuestos con gastos
  const result: CategoryBudget[] = (budgets || []).map(b => {
    const limit = Number(b.monthly_limit)
    const spent = spentByCategory[b.category] || 0
    return {
      category: b.category as CategoryKey,
      limit,
      spent,
      remaining: limit - spent,
      percentage: (spent / limit) * 100,
    }
  })

  return { data: result }
}

// ==========================================
// VERIFICACIÓN DE ALERTAS DE PRESUPUESTO
// ==========================================

export type BudgetAlertLevel = 'ok' | 'warning' | 'danger' | 'exceeded'

export interface BudgetAlertInfo {
  level: BudgetAlertLevel
  percentage: number
  spent: number
  budget: number
  remaining: number
  message: string
}

/**
 * Verifica el estado del presupuesto y retorna info de alerta
 * Útil para mostrar notificaciones después de crear un gasto
 */
export async function checkBudgetAlert(year?: number, month?: number): Promise<{ data: BudgetAlertInfo | null }> {
  const now = new Date()
  const targetYear = year ?? now.getFullYear()
  const targetMonth = month ?? (now.getMonth() + 1)

  const result = await getBudgetSummary(targetYear, targetMonth)

  if (!result.data || !result.data.hasBudget) {
    return { data: null }
  }

  const { budget, spent, remaining, percentage } = result.data

  let level: BudgetAlertLevel = 'ok'
  let message = ''

  if (percentage > 100) {
    level = 'exceeded'
    message = `Has excedido tu presupuesto en ${Math.abs(remaining).toFixed(2)}€`
  } else if (percentage >= 100) {
    level = 'danger'
    message = `Has llegado al límite de tu presupuesto`
  } else if (percentage >= 80) {
    level = 'warning'
    message = `Has usado el ${percentage.toFixed(0)}% de tu presupuesto`
  }

  return {
    data: {
      level,
      percentage,
      spent,
      budget,
      remaining,
      message,
    }
  }
}

// Copiar presupuestos del mes anterior al actual
export async function copyBudgetsFromPreviousMonth(year: number, month: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  // Calcular mes anterior
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  // Obtener presupuestos del mes anterior
  const { data: prevBudgets, error: fetchError } = await supabase
    .from('budgets')
    .select('category, monthly_limit')
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .eq('year', prevYear)
    .eq('month', prevMonth)

  if (fetchError || !prevBudgets?.length) {
    return { error: 'No hay presupuestos en el mes anterior' }
  }

  // Insertar en el mes actual (upsert para evitar duplicados)
  const newBudgets = prevBudgets.map(b => ({
    household_id: DEFAULT_HOUSEHOLD_ID,
    category: b.category,
    monthly_limit: b.monthly_limit,
    year,
    month,
  }))

  const { error: insertError } = await supabase
    .from('budgets')
    .upsert(newBudgets, {
      onConflict: 'household_id,category,year,month',
    })

  if (insertError) {
    console.error('Error copying budgets:', insertError)
    return { error: 'Error al copiar presupuestos' }
  }

  revalidatePath('/')
  revalidatePath('/expenses')

  return { success: true, count: prevBudgets.length }
}
