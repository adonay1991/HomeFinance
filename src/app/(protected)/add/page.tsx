import { ExpenseForm } from '@/components/expenses'

// ==========================================
// PÁGINA: AÑADIR GASTO
// ==========================================

export default function AddExpensePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Añadir gasto</h1>
        <p className="text-muted-foreground text-sm">
          Registra un nuevo gasto compartido
        </p>
      </div>

      <ExpenseForm />
    </div>
  )
}
