import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { SavingsGoalCard, SavingsGoalForm } from '@/components/savings'
import { getSavingsGoals } from '@/lib/actions/savings'
import { CURRENCY_SYMBOL } from '@/lib/constants'
import { Target, CheckCircle2, XCircle } from 'lucide-react'

// ==========================================
// PÁGINA: METAS DE AHORRO
// ==========================================

export default async function GoalsPage() {
  const { data: goals, error } = await getSavingsGoals(true) // incluir todas

  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')
  const cancelledGoals = goals.filter(g => g.status === 'cancelled')

  // Calcular totales
  const totalTarget = activeGoals.reduce((sum, g) => sum + Number(g.target_amount), 0)
  const totalSaved = activeGoals.reduce((sum, g) => sum + Number(g.current_amount), 0)
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Error al cargar las metas</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metas de ahorro</h1>
          <p className="text-muted-foreground text-sm">
            Objetivos financieros del hogar
          </p>
        </div>
        <SavingsGoalForm />
      </div>

      {/* Resumen general */}
      {activeGoals.length > 0 && (
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total ahorrado</p>
                <p className="text-2xl font-bold">
                  {totalSaved.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                  <span className="text-base font-normal text-muted-foreground">
                    {' '}/ {totalTarget.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                  </span>
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(overallProgress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {overallProgress.toFixed(0)}% del objetivo total
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs de metas */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="gap-1.5">
            <Target className="w-4 h-4" />
            Activas ({activeGoals.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Completadas ({completedGoals.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="gap-1.5">
            <XCircle className="w-4 h-4" />
            Canceladas ({cancelledGoals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeGoals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tienes metas activas</p>
                <p className="text-sm mt-1">Crea una nueva meta para empezar a ahorrar</p>
              </CardContent>
            </Card>
          ) : (
            activeGoals.map((goal) => (
              <SavingsGoalCard key={goal.id} goal={goal} />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedGoals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay metas completadas</p>
                <p className="text-sm mt-1">¡Sigue ahorrando para completar tus metas!</p>
              </CardContent>
            </Card>
          ) : (
            completedGoals.map((goal) => (
              <SavingsGoalCard key={goal.id} goal={goal} />
            ))
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {cancelledGoals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay metas canceladas</p>
              </CardContent>
            </Card>
          ) : (
            cancelledGoals.map((goal) => (
              <SavingsGoalCard key={goal.id} goal={goal} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
