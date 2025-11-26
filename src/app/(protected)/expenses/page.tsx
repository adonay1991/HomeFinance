import { Suspense } from 'react'
import { ExpenseList, ExpenseListSkeleton, ExpenseFilters } from '@/components/expenses'
import { getExpenses } from '@/lib/actions/expenses'
import { CURRENCY_SYMBOL } from '@/lib/constants'

// ==========================================
// PÁGINA: LISTADO DE GASTOS
// ==========================================

interface PageProps {
  searchParams: Promise<{
    category?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  const params = await searchParams

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Gastos</h1>
        <p className="text-muted-foreground text-sm">
          Historial de gastos compartidos
        </p>
      </div>

      {/* Filtros */}
      <ExpenseFilters
        activeCategory={params.category}
        startDate={params.startDate}
        endDate={params.endDate}
      />

      {/* Lista de gastos */}
      <Suspense fallback={<ExpenseListSkeleton />}>
        <ExpenseListWrapper
          category={params.category}
          startDate={params.startDate}
          endDate={params.endDate}
        />
      </Suspense>
    </div>
  )
}

// Wrapper para cargar los gastos en servidor
async function ExpenseListWrapper({
  category,
  startDate,
  endDate,
}: {
  category?: string
  startDate?: string
  endDate?: string
}) {
  const { data: expenses, error } = await getExpenses({
    category,
    startDate,
    endDate,
    limit: 50,
  })

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Error al cargar los gastos</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  // Calcular total
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="space-y-4">
      {/* Resumen */}
      {expenses.length > 0 && (
        <div className="flex items-center justify-between px-1 py-2 border-b">
          <span className="text-sm text-muted-foreground">
            {expenses.length} gasto{expenses.length !== 1 ? 's' : ''}
          </span>
          <span className="font-semibold">
            Total: {total.toFixed(2)}{CURRENCY_SYMBOL}
          </span>
        </div>
      )}

      <ExpenseList expenses={expenses} />
    </div>
  )
}
