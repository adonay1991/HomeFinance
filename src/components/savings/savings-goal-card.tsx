'use client'

import { useState } from 'react'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CURRENCY_SYMBOL } from '@/lib/constants'
import { addToSavingsGoal, deleteSavingsGoal, updateSavingsGoal } from '@/lib/actions/savings'
import { toast } from 'sonner'
import {
  Target,
  MoreVertical,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Calendar,
  Loader2,
} from 'lucide-react'

// ==========================================
// CARD DE META DE AHORRO
// ==========================================

interface SavingsGoal {
  id: string
  name: string
  target_amount: number | string
  current_amount: number | string
  deadline: string | null
  status: string
  created_at: string
}

interface SavingsGoalCardProps {
  goal: SavingsGoal
}

export function SavingsGoalCard({ goal }: SavingsGoalCardProps) {
  const [isAddingOpen, setIsAddingOpen] = useState(false)
  const [addAmount, setAddAmount] = useState('')
  const [isPending, setIsPending] = useState(false)

  const targetAmount = Number(goal.target_amount)
  const currentAmount = Number(goal.current_amount)
  const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0
  const remaining = targetAmount - currentAmount

  const daysLeft = goal.deadline
    ? differenceInDays(new Date(goal.deadline), new Date())
    : null

  async function handleAddSavings() {
    const amount = parseFloat(addAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Introduce un importe válido')
      return
    }

    setIsPending(true)
    const result = await addToSavingsGoal(goal.id, amount)
    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.completed ? '¡Meta completada! 🎉' : 'Ahorro añadido')
      setAddAmount('')
      setIsAddingOpen(false)
    }
  }

  async function handleComplete() {
    setIsPending(true)
    const result = await updateSavingsGoal(goal.id, { status: 'completed' })
    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Meta completada')
    }
  }

  async function handleCancel() {
    if (!confirm('¿Cancelar esta meta de ahorro?')) return

    setIsPending(true)
    const result = await updateSavingsGoal(goal.id, { status: 'cancelled' })
    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Meta cancelada')
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta meta permanentemente?')) return

    setIsPending(true)
    const result = await deleteSavingsGoal(goal.id)
    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Meta eliminada')
    }
  }

  const isActive = goal.status === 'active'
  const isCompleted = goal.status === 'completed'

  return (
    <Card className={`transition-opacity ${isPending ? 'opacity-50' : ''} ${!isActive ? 'opacity-70' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-primary/10'
            }`}>
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <Target className="w-4 h-4 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">{goal.name}</CardTitle>
              {goal.deadline && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3" />
                  {daysLeft !== null && daysLeft > 0
                    ? `${daysLeft} días restantes`
                    : daysLeft === 0
                    ? 'Vence hoy'
                    : 'Vencida'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!isActive && (
              <Badge variant={isCompleted ? 'default' : 'secondary'}>
                {isCompleted ? 'Completada' : 'Cancelada'}
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isActive && (
                  <>
                    <DropdownMenuItem onClick={handleComplete}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Marcar completada
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCancel}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelar meta
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progreso */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">
              {currentAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
            </span>
            <span className="text-muted-foreground">
              de {targetAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isCompleted ? 'bg-green-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress.toFixed(0)}% completado</span>
            {remaining > 0 && (
              <span>Faltan {remaining.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}</span>
            )}
          </div>
        </div>

        {/* Botón añadir ahorro */}
        {isActive && (
          <Dialog open={isAddingOpen} onOpenChange={setIsAddingOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Añadir ahorro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir a "{goal.name}"</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="text-2xl h-14 pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">
                    {CURRENCY_SYMBOL}
                  </span>
                </div>
                <Button
                  onClick={handleAddSavings}
                  className="w-full"
                  disabled={isPending || !addAmount}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Añadiendo...
                    </>
                  ) : (
                    'Añadir'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}
