import { Suspense } from 'react'
import { ExpenseListWithEdit, ExpenseListSkeleton, ExpenseFilters } from '@/components/expenses'
import { getExpenses, getAllTags } from '@/lib/actions/expenses'
import { CURRENCY_SYMBOL } from '@/lib/constants'

// ==========================================
// PÁGINA: LISTADO DE GASTOS
// ==========================================

interface PageProps {
  searchParams: Promise<{
    category?: string
    startDate?: string
    endDate?: string
    tags?: string
  }>
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  const params = await searchParams

  // Parsear tags desde el query string (separados por coma)
  const activeTags = params.tags ? params.tags.split(',').filter(Boolean) : []

  // Cargar tags disponibles
  const { data: availableTags } = await getAllTags()

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
        activeTags={activeTags}
        availableTags={availableTags}
      />

      {/* Lista de gastos */}
      <Suspense fallback={<ExpenseListSkeleton />}>
        <ExpenseListWrapper
          category={params.category}
          startDate={params.startDate}
          endDate={params.endDate}
          tags={activeTags}
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
  tags,
}: {
  category?: string
  startDate?: string
  endDate?: string
  tags?: string[]
}) {
  const { data: expenses, error } = await getExpenses({
    category,
    startDate,
    endDate,
    tags,
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

      <ExpenseListWithEdit expenses={expenses} />
    </div>
  )
}
