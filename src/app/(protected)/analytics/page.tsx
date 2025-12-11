import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CURRENCY_SYMBOL, CATEGORIES, type CategoryKey } from '@/lib/constants'
import {
  getMonthOverMonthComparison,
  getCategoryTrends,
  getTopMerchants,
  getAnnualSummary,
  getUnusualExpenses,
} from '@/lib/actions/analytics'
import { hasBankConnection } from '@/lib/actions/banking'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  AlertTriangle,
  Store,
} from 'lucide-react'
import Link from 'next/link'

// ==========================================
// PÁGINA: /analytics
// Dashboard de análisis financiero
// ==========================================

export default async function AnalyticsPage() {
  // Cargar datos en paralelo
  const [
    comparisonResult,
    trendsResult,
    topMerchantsResult,
    annualResult,
    unusualResult,
    hasBankConnected,
  ] = await Promise.all([
    getMonthOverMonthComparison(),
    getCategoryTrends(6),
    getTopMerchants(5),
    getAnnualSummary(),
    getUnusualExpenses(3),
    hasBankConnection(),
  ])

  const comparison = comparisonResult.data
  const trends = trendsResult.data
  const topMerchants = topMerchantsResult.data
  const annual = annualResult.data
  const unusual = unusualResult.data

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-lg font-semibold">Analytics</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6 pb-24 space-y-6">
        {/* Comparativa Mes a Mes */}
        {comparison && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {comparison.monthNames.current} vs {comparison.monthNames.previous}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Este mes</p>
                  <p className="text-2xl font-bold">
                    {comparison.current.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                  </p>
                  <p className="text-xs text-muted-foreground">{comparison.current.count} gastos</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Mes anterior</p>
                  <p className="text-xl font-semibold text-muted-foreground">
                    {comparison.previous.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                  </p>
                  <p className="text-xs text-muted-foreground">{comparison.previous.count} gastos</p>
                </div>
              </div>

              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                comparison.changePercent <= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                {comparison.changePercent <= 0 ? (
                  <TrendingDown className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-red-600" />
                )}
                <span className={`font-semibold ${
                  comparison.changePercent <= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {comparison.changePercent > 0 ? '+' : ''}{comparison.changePercent}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {comparison.changePercent <= 0 ? 'menos' : 'más'} que el mes pasado
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumen Anual */}
        {annual && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Resumen {annual.year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total anual</p>
                  <p className="text-xl font-bold">
                    {annual.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Media mensual</p>
                  <p className="text-xl font-bold">
                    {annual.monthlyAverage.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  <span className="text-muted-foreground">Mes con más gasto:</span>{' '}
                  <span className="font-semibold">{annual.peakMonth.monthName}</span>{' '}
                  <span className="text-muted-foreground">con</span>{' '}
                  <span className="font-semibold">
                    {annual.peakMonth.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                  </span>
                </p>
              </div>

              {/* Top categorías del año */}
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Top categorías</p>
                {Object.entries(annual.byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([category, amount]) => {
                    const categoryInfo = CATEGORIES[category as CategoryKey]
                    const percentage = (amount / annual.total) * 100

                    return (
                      <div key={category} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: categoryInfo?.color ?? '#6b7280' }}
                        />
                        <span className="text-sm flex-1">{categoryInfo?.label ?? category}</span>
                        <span className="text-sm font-medium">
                          {amount.toLocaleString('es-ES', { minimumFractionDigits: 0 })}{CURRENCY_SYMBOL}
                        </span>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Comercios (solo si tiene banco) */}
        {hasBankConnected && topMerchants && topMerchants.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="w-4 h-4" />
                Top comercios (últimos 3 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topMerchants.map((merchant, index) => (
                  <div key={merchant.name} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{merchant.name}</p>
                      <p className="text-xs text-muted-foreground">{merchant.count} transacciones</p>
                    </div>
                    <span className="font-semibold">
                      {merchant.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gastos Inusuales */}
        {unusual && unusual.length > 0 && (
          <Card className="border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                Gastos inusuales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Gastos que superan el doble del promedio en su categoría
              </p>
              <div className="space-y-3">
                {unusual.map((expense) => (
                  <div
                    key={expense.id}
                    className="p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">
                          {expense.description || expense.categoryLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(expense.date).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {' • '}
                          {expense.categoryLabel}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {expense.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                        </p>
                        <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500/50">
                          +{expense.percentAboveAverage}% del promedio
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Promedio en {expense.categoryLabel}: {expense.averageForCategory.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Si no hay datos suficientes */}
        {!comparison && !annual && (
          <Card>
            <CardContent className="py-12 text-center">
              <PieChart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No hay suficientes datos</h3>
              <p className="text-sm text-muted-foreground">
                Añade más gastos para ver el análisis de tus finanzas
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
