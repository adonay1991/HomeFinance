import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { CURRENCY_SYMBOL } from '@/lib/constants'
import { getExpenses, getMonthlyStats, getMonthlyHistory } from '@/lib/actions/expenses'
import { getBudgetSummary, getCategoryBudgets } from '@/lib/actions/budgets'
import { getRecurringExpenses, getRecurringExpensesSummary } from '@/lib/actions/recurring-expenses'
import { getUserProfile } from '@/lib/auth/actions'
import { hasBankConnection, getIncomeVsExpensesHistory } from '@/lib/actions/banking'
import { getUserHousehold, getHouseholdMembers, getHouseholdBalances } from '@/lib/actions/household'
import { ExpenseList } from '@/components/expenses'
import { CategoryChart, MonthlyChart, IncomeVsExpensesChart } from '@/components/charts'
import { BudgetAlert } from '@/components/alerts'
import { BudgetSetup, CategoryBudgets } from '@/components/budgets'
import { RecurringExpenseCard } from '@/components/recurring'
import { BalanceCard, MonthlySummaryCards, RecentTransactions } from '@/components/dashboard'
import { TrendingUp, TrendingDown, Wallet, PieChart, Building2, Users, ArrowRight, Home } from 'lucide-react'
import Link from 'next/link'

// ==========================================
// DASHBOARD - PÁGINA PRINCIPAL
// Vista híbrida: banco conectado vs manual
// ==========================================

export default async function DashboardPage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Verificar si tiene banco conectado
  const hasBankConnected = await hasBankConnection()

  // Obtener datos en paralelo
  const [
    { data: currentStats },
    { data: prevStats },
    { data: recentExpenses },
    { data: monthlyHistory },
    { data: budgetSummary },
    { data: categoryBudgets },
    { data: recurringExpenses },
    { data: recurringSummary },
    userProfile,
    incomeVsExpensesHistory,
    householdResult,
    membersResult,
    balancesResult,
  ] = await Promise.all([
    getMonthlyStats(currentYear, currentMonth),
    getMonthlyStats(
      currentMonth === 1 ? currentYear - 1 : currentYear,
      currentMonth === 1 ? 12 : currentMonth - 1
    ),
    getExpenses({ limit: 5 }),
    getMonthlyHistory(6),
    getBudgetSummary(currentYear, currentMonth),
    getCategoryBudgets(currentYear, currentMonth),
    getRecurringExpenses(),
    getRecurringExpensesSummary(),
    getUserProfile(),
    // Solo obtener datos de ingresos vs gastos si tiene banco conectado
    hasBankConnected ? getIncomeVsExpensesHistory(6) : Promise.resolve([]),
    getUserHousehold(),
    getHouseholdMembers(),
    getHouseholdBalances(),
  ])

  const household = householdResult.data
  const members = membersResult.data
  const balances = balancesResult.data
  const hasMultipleMembers = (members?.length || 0) > 1

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

      {/* Card de Hogar Compartido (si tiene múltiples miembros o deudas) */}
      {household && hasMultipleMembers && (
        <Link href="/household">
          <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20 hover:border-violet-500/40 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-violet-500/10">
                    <Home className="h-5 w-5 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{household.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{members?.length} miembros</span>
                      {balances && balances.simplifiedDebts.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {balances.simplifiedDebts.length} pagos pendientes
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* ========================================== */}
      {/* VISTA CON BANCO CONECTADO                 */}
      {/* ========================================== */}
      {hasBankConnected ? (
        <>
          {/* Card de saldo actual (prominente) */}
          <BalanceCard />

          {/* Cards de resumen mensual: Ingresos, Gastos, Balance */}
          <Suspense fallback={<MonthlySummaryCardsSkeleton />}>
            <MonthlySummaryCards />
          </Suspense>

          {/* Alerta de presupuesto (si lo tiene configurado) */}
          {hasBudget && (
            <BudgetAlert spent={totalSpent} budget={budget} />
          )}

          {/* Progreso del presupuesto (si lo tiene) */}
          {hasBudget && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Presupuesto mensual</span>
                    <span className="font-medium">{percentUsed.toFixed(0)}% de {budget.toLocaleString('es-ES')}{CURRENCY_SYMBOL}</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
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
                  <p className="text-xs text-muted-foreground">
                    Disponible: {remaining.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Últimos movimientos bancarios */}
          <Suspense fallback={<RecentTransactionsSkeleton />}>
            <RecentTransactions />
          </Suspense>

          {/* Presupuestos por categoría */}
          <CategoryBudgets
            budgets={categoryBudgets || []}
            year={currentYear}
            month={currentMonth}
          />

          {/* Gastos recurrentes */}
          <RecurringExpenseCard
            expenses={recurringExpenses || []}
            pendingTotal={recurringSummary?.totalPending || 0}
            pendingCount={recurringSummary?.count || 0}
          />

          {/* Gráficos */}
          <div className="space-y-4">
            {/* Gráfico de Ingresos vs Gastos (solo banco conectado) */}
            {incomeVsExpensesHistory && incomeVsExpensesHistory.length > 0 && (
              <IncomeVsExpensesChart data={incomeVsExpensesHistory} />
            )}
            {currentStats?.byCategory && Object.keys(currentStats.byCategory).length > 0 && (
              <CategoryChart data={currentStats.byCategory} total={totalSpent} />
            )}
            {monthlyHistory && monthlyHistory.length > 0 && (
              <MonthlyChart data={monthlyHistory} budget={hasBudget ? budget : undefined} />
            )}
          </div>
        </>
      ) : (
        /* ========================================== */
        /* VISTA SIN BANCO - MODO MANUAL              */
        /* ========================================== */
        <>
          {/* Banner para conectar banco */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Conecta tu banco</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sincroniza automáticamente tus transacciones y ve tu saldo real.
                  </p>
                  <Link
                    href="/profile"
                    className="inline-block mt-3 text-sm font-medium text-primary hover:underline"
                  >
                    Conectar ahora →
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerta de presupuesto */}
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

          {/* Presupuestos por categoría */}
          <CategoryBudgets
            budgets={categoryBudgets || []}
            year={currentYear}
            month={currentMonth}
          />

          {/* Gastos recurrentes */}
          <RecurringExpenseCard
            expenses={recurringExpenses || []}
            pendingTotal={recurringSummary?.totalPending || 0}
            pendingCount={recurringSummary?.count || 0}
          />

          {/* Gráficos */}
          <div className="space-y-4">
            {currentStats?.byCategory && Object.keys(currentStats.byCategory).length > 0 && (
              <CategoryChart data={currentStats.byCategory} total={totalSpent} />
            )}
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
        </>
      )}
    </div>
  )
}

// ==========================================
// SKELETONS
// ==========================================

function MonthlySummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RecentTransactionsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
