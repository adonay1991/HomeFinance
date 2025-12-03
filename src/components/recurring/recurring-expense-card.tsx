'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CATEGORIES, CURRENCY_SYMBOL, type CategoryKey } from '@/lib/constants'
import {
  type RecurringExpense,
  type Frequency,
  toggleRecurringExpense,
  deleteRecurringExpense,
  executeRecurringExpenses,
} from '@/lib/actions/recurring-expenses'
import { toast } from 'sonner'
import {
  Plus,
  Repeat,
  Calendar,
  Pause,
  Play,
  Trash2,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { RecurringExpenseForm } from './recurring-expense-form'

// ==========================================
// CARD DE GASTOS RECURRENTES
// ==========================================

const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  yearly: 'Anual',
}

interface RecurringExpenseCardProps {
  expenses: RecurringExpense[]
  pendingTotal: number
  pendingCount: number
}

export function RecurringExpenseCard({ expenses, pendingTotal, pendingCount }: RecurringExpenseCardProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<RecurringExpense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecurringExpense | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  async function handleToggle(expense: RecurringExpense) {
    const result = await toggleRecurringExpense(expense.id, !expense.isActive)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(expense.isActive ? 'Gasto pausado' : 'Gasto activado')
      router.refresh()
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const result = await deleteRecurringExpense(deleteTarget.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Gasto recurrente eliminado')
      setDeleteTarget(null)
      router.refresh()
    }
  }

  async function handleExecutePending() {
    setIsProcessing(true)
    const result = await executeRecurringExpenses()
    setIsProcessing(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.created > 0) {
      toast.success(`${result.created} gasto(s) creado(s)`)
      router.refresh()
    } else {
      toast.info('No hay gastos pendientes por procesar')
    }
  }

  function handleFormSuccess() {
    setIsOpen(false)
    setSelectedExpense(null)
    router.refresh()
  }

  function formatNextDate(dateStr: string) {
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Mañana'
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="w-4 h-4" />
            Gastos recurrentes
          </CardTitle>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={handleExecutePending}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Procesar
              </Button>
            )}
            <Sheet open={isOpen && !selectedExpense} onOpenChange={(open) => {
              setIsOpen(open)
              if (!open) setSelectedExpense(null)
            }}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  Añadir
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Nuevo gasto recurrente</SheetTitle>
                  <SheetDescription>
                    Configura un gasto que se repita automáticamente
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4 px-4">
                  <RecurringExpenseForm onSuccess={handleFormSuccess} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Resumen de pendientes */}
        {pendingCount > 0 && (
          <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-2 mt-2">
            <span className="text-muted-foreground">
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''} este mes
            </span>
            <span className="font-medium text-primary">
              {pendingTotal.toFixed(2)}{CURRENCY_SYMBOL}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {expenses.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Repeat className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sin gastos recurrentes</p>
            <p className="text-xs">Añade gastos que se repitan cada mes</p>
          </div>
        ) : (
          expenses.map((expense) => {
            const category = CATEGORIES[expense.category as CategoryKey]

            return (
              <div
                key={expense.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                  !expense.isActive ? 'opacity-50' : ''
                }`}
                onClick={() => {
                  setSelectedExpense(expense)
                  setIsOpen(true)
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: category?.color || '#6b7280' }}
                >
                  {expense.amount.toFixed(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {expense.description || category?.label || 'Gasto'}
                    </p>
                    {!expense.isActive && (
                      <Badge variant="secondary" className="text-xs">Pausado</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Repeat className="w-3 h-3" />
                      {FREQUENCY_LABELS[expense.frequency]}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatNextDate(expense.nextExecutionDate)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {expense.amount.toFixed(2)}{CURRENCY_SYMBOL}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            )
          })
        )}
      </CardContent>

      {/* Sheet de edición */}
      <Sheet open={isOpen && !!selectedExpense} onOpenChange={(open) => {
        if (!open) {
          setIsOpen(false)
          setSelectedExpense(null)
        }
      }}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar gasto recurrente</SheetTitle>
            <SheetDescription>
              Modifica la configuración del gasto
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 px-4 space-y-4">
            {selectedExpense && (
              <>
                <RecurringExpenseForm
                  initialData={selectedExpense}
                  onSuccess={handleFormSuccess}
                />
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => handleToggle(selectedExpense)}
                  >
                    {selectedExpense.isActive ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Activar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive gap-2"
                    onClick={() => setDeleteTarget(selectedExpense)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar gasto recurrente"
        description={`¿Eliminar "${deleteTarget?.description || 'este gasto'}"? Los gastos ya creados no se eliminarán.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </Card>
  )
}
