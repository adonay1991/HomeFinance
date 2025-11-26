import { Card, CardContent } from '@/components/ui/card'
import { SavingsGoalCard } from './savings-goal-card'
import type { SavingsGoal } from '@/lib/actions/savings'
import { Target } from 'lucide-react'

// ==========================================
// LISTA DE METAS DE AHORRO
// ==========================================

interface GoalsListProps {
  goals: SavingsGoal[]
}

export function GoalsList({ goals }: GoalsListProps) {
  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No tienes metas de ahorro</p>
          <p className="text-sm mt-1">
            Crea tu primera meta para empezar a ahorrar
          </p>
        </CardContent>
      </Card>
    )
  }

  // Separar metas activas y completadas
  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')

  return (
    <div className="space-y-6">
      {/* Metas activas */}
      {activeGoals.length > 0 && (
        <div className="space-y-3">
          {activeGoals.map((goal) => (
            <SavingsGoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      {/* Metas completadas */}
      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Metas completadas ({completedGoals.length})
          </h3>
          {completedGoals.map((goal) => (
            <SavingsGoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  )
}
