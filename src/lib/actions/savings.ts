'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_HOUSEHOLD_ID } from '@/lib/constants'
import { z } from 'zod'

// ==========================================
// SERVER ACTIONS PARA METAS DE AHORRO
// ==========================================

const savingsGoalSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido' }).max(100),
  targetAmount: z.number().positive({ message: 'El objetivo debe ser mayor a 0' }),
  currentAmount: z.number().min(0).optional().default(0),
  deadline: z.string().optional(),
})

export type SavingsGoalFormData = z.infer<typeof savingsGoalSchema>

export interface SavingsGoal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  percentage: number
  remaining: number
}

export async function createSavingsGoal(data: SavingsGoalFormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  const validated = savingsGoalSchema.safeParse(data)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const { error } = await supabase
    .from('savings_goals')
    .insert({
      household_id: DEFAULT_HOUSEHOLD_ID,
      name: validated.data.name,
      target_amount: validated.data.targetAmount,
      current_amount: validated.data.currentAmount || 0,
      deadline: validated.data.deadline || null,
      status: 'active',
    })

  if (error) {
    console.error('Error creating savings goal:', error)
    return { error: 'Error al crear la meta' }
  }

  revalidatePath('/goals')
  return { success: true }
}

export async function getSavingsGoals(includeAll = false) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado', data: [] }
  }

  let query = supabase
    .from('savings_goals')
    .select('*')
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .order('created_at', { ascending: false })

  if (!includeAll) {
    query = query.in('status', ['active', 'completed'])
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching savings goals:', error)
    return { error: 'Error al cargar las metas', data: [] }
  }

  // Calcular porcentaje y restante para cada meta
  const goalsWithProgress = (data || []).map(goal => ({
    ...goal,
    target_amount: Number(goal.target_amount),
    current_amount: Number(goal.current_amount),
    percentage: Number(goal.target_amount) > 0
      ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100
      : 0,
    remaining: Number(goal.target_amount) - Number(goal.current_amount),
  }))

  return { data: goalsWithProgress as SavingsGoal[] }
}

export async function updateSavingsGoal(
  id: string,
  data: Partial<SavingsGoalFormData> & { status?: 'active' | 'completed' | 'cancelled' }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.targetAmount !== undefined) updateData.target_amount = data.targetAmount
  if (data.currentAmount !== undefined) updateData.current_amount = data.currentAmount
  if (data.deadline !== undefined) updateData.deadline = data.deadline
  if (data.status !== undefined) updateData.status = data.status

  const { error } = await supabase
    .from('savings_goals')
    .update(updateData)
    .eq('id', id)
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)

  if (error) {
    console.error('Error updating savings goal:', error)
    return { error: 'Error al actualizar la meta' }
  }

  revalidatePath('/goals')
  return { success: true }
}

export async function addToSavingsGoal(id: string, amount: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  // Obtener meta actual
  const { data: goal, error: fetchError } = await supabase
    .from('savings_goals')
    .select('current_amount, target_amount')
    .eq('id', id)
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .single()

  if (fetchError || !goal) {
    return { error: 'Meta no encontrada' }
  }

  const newAmount = Number(goal.current_amount) + amount
  const isCompleted = newAmount >= Number(goal.target_amount)

  const { error } = await supabase
    .from('savings_goals')
    .update({
      current_amount: newAmount,
      status: isCompleted ? 'completed' : 'active',
    })
    .eq('id', id)

  if (error) {
    console.error('Error adding to savings goal:', error)
    return { error: 'Error al añadir ahorro' }
  }

  revalidatePath('/goals')
  return { success: true, completed: isCompleted }
}

export async function deleteSavingsGoal(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('savings_goals')
    .delete()
    .eq('id', id)
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)

  if (error) {
    console.error('Error deleting savings goal:', error)
    return { error: 'Error al eliminar la meta' }
  }

  revalidatePath('/goals')
  revalidatePath('/')
  return { success: true }
}

// Retirar dinero de una meta
export async function withdrawFromGoal(id: string, amount: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  if (amount <= 0) {
    return { error: 'La cantidad debe ser mayor que 0' }
  }

  // Obtener meta actual
  const { data: goal, error: fetchError } = await supabase
    .from('savings_goals')
    .select('current_amount')
    .eq('id', id)
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .single()

  if (fetchError || !goal) {
    return { error: 'Meta no encontrada' }
  }

  const currentAmount = Number(goal.current_amount)
  if (amount > currentAmount) {
    return { error: 'No puedes retirar más de lo ahorrado' }
  }

  const newAmount = currentAmount - amount

  const { error } = await supabase
    .from('savings_goals')
    .update({
      current_amount: newAmount,
      status: 'active', // Reactivar si estaba completada
    })
    .eq('id', id)

  if (error) {
    console.error('Error withdrawing from goal:', error)
    return { error: 'Error al retirar de la meta' }
  }

  revalidatePath('/goals')
  revalidatePath('/')
  return { success: true }
}

// Obtener resumen de ahorro (para dashboard)
export async function getSavingsSummary() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado', data: null }
  }

  const { data, error } = await supabase
    .from('savings_goals')
    .select('target_amount, current_amount, status')
    .eq('household_id', DEFAULT_HOUSEHOLD_ID)
    .eq('status', 'active')

  if (error) {
    console.error('Error fetching savings summary:', error)
    return { error: 'Error al cargar resumen', data: null }
  }

  const totalTarget = (data || []).reduce((sum, g) => sum + Number(g.target_amount), 0)
  const totalSaved = (data || []).reduce((sum, g) => sum + Number(g.current_amount), 0)
  const activeGoals = data?.length || 0

  return {
    data: {
      totalTarget,
      totalSaved,
      totalRemaining: totalTarget - totalSaved,
      activeGoals,
      overallPercentage: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
    }
  }
}
