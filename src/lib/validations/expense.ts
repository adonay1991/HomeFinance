import { z } from 'zod'
import { CATEGORIES } from '@/lib/constants'

// ==========================================
// VALIDACIÓN DE GASTOS CON ZOD v4
// ==========================================

const categoryKeys = Object.keys(CATEGORIES) as [string, ...string[]]

export const expenseSchema = z.object({
  amount: z
    .number({ message: 'El importe es requerido' })
    .positive({ message: 'El importe debe ser mayor a 0' })
    .multipleOf(0.01, { message: 'Máximo 2 decimales' }),
  description: z
    .string()
    .max(200, { message: 'Máximo 200 caracteres' })
    .optional(),
  category: z.enum(categoryKeys, {
    message: 'Selecciona una categoría',
  }),
  tags: z
    .array(z.string().max(30, { message: 'Máximo 30 caracteres por tag' }))
    .max(5, { message: 'Máximo 5 tags' })
    .optional()
    .default([]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato de fecha inválido' }),
})

export type ExpenseFormData = z.infer<typeof expenseSchema>

// Schema para actualizar (todos los campos opcionales excepto id)
export const updateExpenseSchema = expenseSchema.partial().extend({
  id: z.string().uuid(),
})

export type UpdateExpenseData = z.infer<typeof updateExpenseSchema>
