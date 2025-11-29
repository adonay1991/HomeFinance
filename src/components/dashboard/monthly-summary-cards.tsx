import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Wallet, ArrowUp, ArrowDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getMonthlyComparison } from '@/lib/actions/banking'

// ==========================================
// MONTHLY SUMMARY CARDS - Ingresos, Gastos, Balance del mes
// ==========================================

export async function MonthlySummaryCards() {
  const data = await getMonthlyComparison()

  const { current, incomeChange, expensesChange } = data

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Ingresos del mes */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Ingresos este mes</p>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            +{formatCurrency(current.income)}
          </p>
          {incomeChange !== 0 && (
            <p className={`text-xs mt-1 flex items-center gap-0.5 ${incomeChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {incomeChange > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(incomeChange)}% vs mes anterior
            </p>
          )}
        </CardContent>
      </Card>

      {/* Gastos del mes */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Gastos este mes</p>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            -{formatCurrency(current.expenses)}
          </p>
          {expensesChange !== 0 && (
            <p className={`text-xs mt-1 flex items-center gap-0.5 ${expensesChange < 0 ? 'text-green-600' : 'text-red-500'}`}>
              {expensesChange < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
              {Math.abs(expensesChange)}% vs mes anterior
            </p>
          )}
        </CardContent>
      </Card>

      {/* Balance del mes */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Balance del mes</p>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className={`text-2xl font-bold mt-1 ${current.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {current.balance >= 0 ? '+' : ''}{formatCurrency(current.balance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {current.balance >= 0 ? 'Ahorrando' : 'Gastando más de lo ingresado'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
