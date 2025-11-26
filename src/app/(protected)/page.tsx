import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CURRENCY_SYMBOL } from '@/lib/constants'
import { getExpenses, getMonthlyStats, getMonthlyHistory } from '@/lib/actions/expenses'
import { getBudgetSummary } from '@/lib/actions/budgets'
import { getUserProfile } from '@/lib/auth/actions'
import { ExpenseList } from '@/components/expenses'
import { CategoryChart, MonthlyChart } from '@/components/charts'
import { BudgetAlert } from '@/components/alerts'
import { BudgetSetup } from '@/components/budgets'
import { TrendingUp, TrendingDown, Wallet, PieChart } from 'lucide-react'
import Link from 'next/link'

// ==========================================
// DASHBOARD - PÁGINA PRINCIPAL
// ==========================================

export default async function DashboardPage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Obtener datos en paralelo
  const [
    { data: currentStats },
    { data: prevStats },
    { data: recentExpenses },
    { data: monthlyHistory },
    { data: budgetSummary },
    userProfile,
  ] = await Promise.all([
    getMonthlyStats(currentYear, currentMonth),
    getMonthlyStats(
      currentMonth === 1 ? currentYear - 1 : currentYear,
      currentMonth === 1 ? 12 : currentMonth - 1
    ),
    getExpenses({ limit: 5 }),
    getMonthlyHistory(6),
    getBudgetSummary(currentYear, currentMonth),
    getUserProfile(),
  ])

  // Obtener el primer nombre del usuario
  const firstName = userProfile?.name?.split(' ')[0]

  // Datos del presupuesto
  const budget = budgetSummary?.budget || 0
  const hasBudget = budget > 0
  const totalSpent = currentStats?.total || 0
  const remaining = budget - totalSpent
  const percentUsed = hasBudget ? (totalSpent / budget) * 100 : 0

  // Comparación con mes anterior
  const prevTotalSpent = prevStats?.total || 0
  const comparedToLastMonth = prevTotalSpent > 0
    ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Saludo y fecha */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            ¡Hola{firstName ? `, ${firstName}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground text-sm">
            {now.toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </p>
        </div>
        <BudgetSetup
          budget={budget}
          spent={totalSpent}
          year={currentYear}
          month={currentMonth}
        />
      </div>

      {/* Alerta de presupuesto (solo si hay presupuesto configurado) */}
      {hasBudget && (
        <BudgetAlert spent={totalSpent} budget={budget} />
      )}

      {/* Card principal - Gastos del mes */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Gastos este mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">
                {totalSpent.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xl text-muted-foreground">{CURRENCY_SYMBOL}</span>
            </div>

            {/* Barra de progreso del presupuesto (solo si hay presupuesto) */}
            {hasBudget ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Presupuesto</span>
                  <span>{percentUsed.toFixed(0)}% de {budget.toLocaleString('es-ES')}{CURRENCY_SYMBOL}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      percentUsed > 100
                        ? 'bg-destructive'
                        : percentUsed > 80
                        ? 'bg-yellow-500'
                        : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Configura tu presupuesto para ver el progreso
              </p>
            )}

            {/* Comparación con mes anterior */}
            {prevTotalSpent > 0 && (
              <div className="flex items-center gap-1 text-sm">
                {comparedToLastMonth < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {Math.abs(comparedToLastMonth).toFixed(0)}% menos
                    </span>
                  </>
                ) : comparedToLastMonth > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-red-500" />
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      {comparedToLastMonth.toFixed(0)}% más
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Igual</span>
                )}
                <span className="text-muted-foreground">que el mes pasado</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid de cards secundarias */}
      <div className="grid grid-cols-2 gap-4">
        {/* Disponible este mes (solo si hay presupuesto) */}
        {hasBudget ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Disponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${remaining < 0 ? 'text-destructive' : ''}`}>
                {remaining.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                <span className="text-lg text-muted-foreground">{CURRENCY_SYMBOL}</span>
              </div>
              <p className="text-xs text-muted-foreground">Este mes</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Presupuesto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium text-muted-foreground">Sin configurar</div>
              <p className="text-xs text-muted-foreground">Pulsa "Presupuesto"</p>
            </CardContent>
          </Card>
        )}

        {/* Número de gastos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5" />
              Transacciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats?.count || 0}</div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="space-y-4">
        {/* Gráfico de categorías */}
        {currentStats?.byCategory && Object.keys(currentStats.byCategory).length > 0 && (
          <CategoryChart data={currentStats.byCategory} total={totalSpent} />
        )}

        {/* Gráfico de evolución mensual */}
        {monthlyHistory && monthlyHistory.length > 0 && (
          <MonthlyChart data={monthlyHistory} budget={hasBudget ? budget : undefined} />
        )}
      </div>

      {/* Últimos gastos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Últimos gastos</h2>
          <Link
            href="/expenses"
            className="text-sm text-primary hover:underline"
          >
            Ver todos
          </Link>
        </div>
        <ExpenseList expenses={recentExpenses} showUser={false} />
      </div>
    </div>
  )
}
