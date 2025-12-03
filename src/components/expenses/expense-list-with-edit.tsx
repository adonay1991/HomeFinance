'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExpenseList } from './expense-list'
import { ExpenseForm } from './expense-form'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { CategoryKey } from '@/lib/constants'

// ==========================================
// LISTA DE GASTOS CON MODAL DE EDICIÓN
// ==========================================
// Wrapper que añade funcionalidad de edición a ExpenseList

interface Expense {
  id: string
  amount: number | string
  description: string | null
  category: string
  tags: string[] | null
  date: string
  paid_by: string
  paid_by_user: {
    name: string
    email: string
  } | null
  created_at: string
}

interface ExpenseListWithEditProps {
  expenses: Expense[]
  showUser?: boolean
}

export function ExpenseListWithEdit({ expenses, showUser = true }: ExpenseListWithEditProps) {
  const router = useRouter()
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  function handleEdit(expense: Expense) {
    setEditingExpense(expense)
  }

  function handleEditSuccess() {
    setEditingExpense(null)
    router.refresh()
  }

  return (
    <>
      <ExpenseList
        expenses={expenses}
        showUser={showUser}
        onEdit={handleEdit}
      />

      {/* Sheet de edición */}
      <Sheet open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Editar gasto</SheetTitle>
            <SheetDescription>
              Modifica los datos del gasto
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 px-4">
            {editingExpense && (
              <ExpenseForm
                initialData={{
                  id: editingExpense.id,
                  amount: Number(editingExpense.amount),
                  description: editingExpense.description || undefined,
                  category: editingExpense.category as CategoryKey,
                  tags: editingExpense.tags || undefined,
                  date: editingExpense.date,
                }}
                onSuccess={handleEditSuccess}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
