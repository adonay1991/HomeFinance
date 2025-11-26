import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CURRENCY_SYMBOL } from '@/lib/constants'
import { PiggyBank, Target, TrendingUp } from 'lucide-react'

// ==========================================
// RESUMEN DE AHORRO
// ==========================================

interface SavingsSummaryProps {
  totalTarget: number
  totalSaved: number
  activeGoals: number
}

export function SavingsSummary({ totalTarget, totalSaved, activeGoals }: SavingsSummaryProps) {
  const percentage = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0
  const remaining = totalTarget - totalSaved

  if (activeGoals === 0) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <PiggyBank className="w-4 h-4" />
          Resumen de ahorro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total ahorrado */}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">
            {totalSaved.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-xl text-muted-foreground">{CURRENCY_SYMBOL}</span>
          <span className="text-sm text-muted-foreground ml-2">ahorrado</span>
        </div>

        {/* Barra de progreso */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progreso total</span>
            <span>
              {percentage.toFixed(0)}% de {totalTarget.toLocaleString('es-ES')}{CURRENCY_SYMBOL}
            </span>
          </div>
          <Progress value={Math.min(percentage, 100)} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{activeGoals}</p>
              <p className="text-xs text-muted-foreground">
                {activeGoals === 1 ? 'Meta activa' : 'Metas activas'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {remaining.toLocaleString('es-ES', { minimumFractionDigits: 0 })}{CURRENCY_SYMBOL}
              </p>
              <p className="text-xs text-muted-foreground">Por ahorrar</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
