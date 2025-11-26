'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CURRENCY_SYMBOL } from '@/lib/constants'
import { setMonthlyBudget, deleteMonthlyBudget } from '@/lib/actions/budgets'
import { toast } from 'sonner'
import { Loader2, Wallet, Settings, Trash2, Pencil } from 'lucide-react'

// ==========================================
// CONFIGURACIÓN DE PRESUPUESTO SIMPLE
// ==========================================

interface BudgetSetupProps {
  budget: number
  spent: number
  year: number
  month: number
}

export function BudgetSetup({ budget, spent, year, month }: BudgetSetupProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [newBudget, setNewBudget] = useState(budget > 0 ? String(budget) : '')
  const [isPending, setIsPending] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const hasBudget = budget > 0
  const remaining = budget - spent
  const percentage = budget > 0 ? (spent / budget) * 100 : 0

  async function handleSave() {
    const amount = parseFloat(newBudget)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Introduce un presupuesto válido')
      return
    }

    setIsPending(true)
    const result = await setMonthlyBudget(amount, year, month)
    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(hasBudget ? 'Presupuesto actualizado' : 'Presupuesto establecido')
      setIsEditing(false)
      router.refresh()
    }
  }

  async function handleDelete() {
    setIsPending(true)
    const result = await deleteMonthlyBudget(year, month)
    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Presupuesto eliminado')
      setNewBudget('')
      router.refresh()
    }
  }

  function startEditing() {
    setNewBudget(budget > 0 ? String(budget) : '')
    setIsEditing(true)
  }

  function cancelEditing() {
    setNewBudget(budget > 0 ? String(budget) : '')
    setIsEditing(false)
  }

  // Obtener nombre del mes
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const monthName = monthNames[month - 1]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Presupuesto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Presupuesto de {monthName}
          </DialogTitle>
          <DialogDescription>
            Define cuánto quieres gastar este mes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Estado actual o formulario */}
          {hasBudget && !isEditing ? (
            // Mostrar presupuesto actual
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-4">
                {/* Monto del presupuesto */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Presupuesto mensual</p>
                  <p className="text-3xl font-bold">
                    {budget.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    <span className="text-xl text-muted-foreground ml-1">{CURRENCY_SYMBOL}</span>
                  </p>
                </div>

                {/* Barra de progreso */}
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentage > 100
                          ? 'bg-destructive'
                          : percentage > 80
                          ? 'bg-yellow-500'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Gastado: {spent.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                    </span>
                    <span className="font-medium">{percentage.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Disponible */}
                <div className={`text-center p-3 rounded-lg ${
                  remaining < 0 ? 'bg-destructive/10' : 'bg-primary/10'
                }`}>
                  <p className="text-sm text-muted-foreground mb-1">
                    {remaining >= 0 ? 'Disponible' : 'Excedido'}
                  </p>
                  <p className={`text-2xl font-bold ${remaining < 0 ? 'text-destructive' : ''}`}>
                    {Math.abs(remaining).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    <span className="text-lg text-muted-foreground ml-1">{CURRENCY_SYMBOL}</span>
                  </p>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={startEditing}
                  >
                    <Pencil className="w-4 h-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive gap-2"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Formulario para establecer/editar presupuesto
            <div className="space-y-4">
              {!hasBudget && (
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="py-6 text-center text-muted-foreground">
                    <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Sin presupuesto configurado</p>
                    <p className="text-sm mt-1">
                      Establece un límite para controlar tus gastos
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="budget">
                  {hasBudget ? 'Nuevo presupuesto' : 'Presupuesto mensual'}
                </Label>
                <div className="relative">
                  <Input
                    id="budget"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="pr-12 text-lg h-12"
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    {CURRENCY_SYMBOL}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cada gasto que registres se restará de este monto
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isPending || !newBudget}
                  className="flex-1"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    hasBudget ? 'Actualizar' : 'Establecer presupuesto'
                  )}
                </Button>
                {isEditing && (
                  <Button variant="outline" onClick={cancelEditing}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Eliminar presupuesto"
        description="¿Estás seguro de que quieres eliminar el presupuesto de este mes? Tus gastos no se eliminarán."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </Dialog>
  )
}
