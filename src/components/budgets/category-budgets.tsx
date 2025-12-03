'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CATEGORIES, CATEGORY_LIST, CURRENCY_SYMBOL, type CategoryKey } from '@/lib/constants'
import { setCategoryBudget, deleteCategoryBudget, type CategoryBudget } from '@/lib/actions/budgets'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, PiggyBank, TrendingUp, AlertTriangle } from 'lucide-react'

// ==========================================
// PRESUPUESTOS POR CATEGORÍA
// ==========================================

interface CategoryBudgetsProps {
  budgets: CategoryBudget[]
  year: number
  month: number
}

export function CategoryBudgets({ budgets, year, month }: CategoryBudgetsProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | ''>('')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CategoryKey | null>(null)

  // Categorías que ya tienen presupuesto
  const budgetedCategories = new Set(budgets.map(b => b.category))
  // Categorías disponibles para agregar
  const availableCategories = CATEGORY_LIST.filter(c => !budgetedCategories.has(c.value))

  async function handleSave() {
    if (!selectedCategory || !budgetAmount) {
      toast.error('Selecciona una categoría y un monto')
      return
    }

    const amount = parseFloat(budgetAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('El monto debe ser mayor que 0')
      return
    }

    setIsPending(true)
    const result = await setCategoryBudget(selectedCategory, amount, year, month)
    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Presupuesto guardado')
      setSelectedCategory('')
      setBudgetAmount('')
      setIsOpen(false)
      router.refresh()
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setIsPending(true)
    const result = await deleteCategoryBudget(deleteTarget, year, month)
    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Presupuesto eliminado')
      setDeleteTarget(null)
      router.refresh()
    }
  }

  // Ordenar presupuestos por porcentaje usado (los más gastados primero)
  const sortedBudgets = [...budgets].sort((a, b) => b.percentage - a.percentage)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="w-4 h-4" />
            Presupuestos por categoría
          </CardTitle>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Añadir
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader>
                <SheetTitle>Nuevo presupuesto</SheetTitle>
                <SheetDescription>
                  Establece un límite de gasto para una categoría
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-6 px-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={(v) => setSelectedCategory(v as CategoryKey)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                      {availableCategories.length === 0 && (
                        <SelectItem value="_none" disabled>
                          Todas las categorías tienen presupuesto
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Límite mensual</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {CURRENCY_SYMBOL}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={isPending || !selectedCategory || !budgetAmount}
                  className="w-full"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Guardar presupuesto'
                  )}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedBudgets.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <PiggyBank className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sin presupuestos por categoría</p>
            <p className="text-xs">Añade límites para cada tipo de gasto</p>
          </div>
        ) : (
          sortedBudgets.map((budget) => {
            const category = CATEGORIES[budget.category]
            const isOverBudget = budget.percentage > 100
            const isWarning = budget.percentage > 80 && budget.percentage <= 100

            return (
              <div key={budget.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.label}</span>
                    {isOverBudget && (
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                    )}
                    {isWarning && (
                      <TrendingUp className="w-3.5 h-3.5 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {budget.spent.toFixed(0)} / {budget.limit.toFixed(0)}{CURRENCY_SYMBOL}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(budget.category)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Progress
                    value={Math.min(budget.percentage, 100)}
                    className="h-2"
                    style={{
                      '--progress-color': isOverBudget
                        ? 'var(--destructive)'
                        : isWarning
                        ? '#eab308'
                        : category.color,
                    } as React.CSSProperties}
                  />
                  {isOverBudget && (
                    <div
                      className="absolute top-0 left-0 h-2 bg-destructive/30 rounded-full"
                      style={{ width: '100%' }}
                    />
                  )}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{budget.percentage.toFixed(0)}%</span>
                  <span className={isOverBudget ? 'text-destructive font-medium' : ''}>
                    {isOverBudget ? 'Excedido: ' : 'Disponible: '}
                    {Math.abs(budget.remaining).toFixed(2)}{CURRENCY_SYMBOL}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </CardContent>

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar presupuesto"
        description={`¿Eliminar el presupuesto de ${deleteTarget ? CATEGORIES[deleteTarget].label : ''}?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </Card>
  )
}
