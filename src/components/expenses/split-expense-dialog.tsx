'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { CURRENCY_SYMBOL } from '@/lib/constants'
import { createExpenseSplits, getExpenseSplits, removeExpenseSplits } from '@/lib/actions/splits'
import { Loader2, Users, Split, Trash2, Check } from 'lucide-react'

// ==========================================
// DIÁLOGO PARA DIVIDIR GASTOS
// Permite dividir un gasto entre miembros del hogar
// ==========================================

interface Member {
  id: string
  name: string
  email: string
}

interface SplitExpenseDialogProps {
  expenseId: string
  expenseAmount: number
  expenseDescription?: string
  paidByUserId: string
  householdMembers: Member[]
  trigger?: React.ReactNode
  onSplitCreated?: () => void
}

interface SplitAllocation {
  userId: string
  amount: number
  percentage: number
  isIncluded: boolean
}

export function SplitExpenseDialog({
  expenseId,
  expenseAmount,
  expenseDescription,
  paidByUserId,
  householdMembers,
  trigger,
  onSplitCreated,
}: SplitExpenseDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [existingSplits, setExistingSplits] = useState<Array<{
    id: string
    userId: string
    userName: string
    amount: string
    isPaid: boolean
  }>>([])
  const [allocations, setAllocations] = useState<SplitAllocation[]>([])
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')

  // Inicializar allocations cuando se abre el diálogo
  const initializeAllocations = useCallback(() => {
    const equalAmount = expenseAmount / householdMembers.length
    const equalPercentage = 100 / householdMembers.length

    setAllocations(
      householdMembers.map(member => ({
        userId: member.id,
        amount: Math.round(equalAmount * 100) / 100,
        percentage: Math.round(equalPercentage * 100) / 100,
        isIncluded: true,
      }))
    )
  }, [expenseAmount, householdMembers])

  // Cargar splits existentes
  const loadExistingSplits = useCallback(async () => {
    setIsLoading(true)
    const result = await getExpenseSplits(expenseId)
    if (result.data && result.data.length > 0) {
      setExistingSplits(result.data)
    } else {
      setExistingSplits([])
      initializeAllocations()
    }
    setIsLoading(false)
  }, [expenseId, initializeAllocations])

  useEffect(() => {
    if (open) {
      loadExistingSplits()
    }
  }, [open, loadExistingSplits])

  // Recalcular cuando cambia la inclusión de miembros
  function handleMemberToggle(userId: string, isIncluded: boolean) {
    setAllocations(prev => {
      const updated = prev.map(a =>
        a.userId === userId ? { ...a, isIncluded } : a
      )

      // Recalcular si estamos en modo igual
      if (splitMode === 'equal') {
        const includedCount = updated.filter(a => a.isIncluded).length
        if (includedCount > 0) {
          const equalAmount = expenseAmount / includedCount
          const equalPercentage = 100 / includedCount

          return updated.map(a => ({
            ...a,
            amount: a.isIncluded ? Math.round(equalAmount * 100) / 100 : 0,
            percentage: a.isIncluded ? Math.round(equalPercentage * 100) / 100 : 0,
          }))
        }
      }

      return updated
    })
  }

  // Actualizar monto personalizado
  function handleAmountChange(userId: string, amountStr: string) {
    setSplitMode('custom')
    const amount = parseFloat(amountStr) || 0

    setAllocations(prev => {
      const updated = prev.map(a =>
        a.userId === userId
          ? { ...a, amount, percentage: (amount / expenseAmount) * 100 }
          : a
      )
      return updated
    })
  }

  // Dividir en partes iguales
  function splitEqually() {
    setSplitMode('equal')
    const includedMembers = allocations.filter(a => a.isIncluded)
    const equalAmount = expenseAmount / includedMembers.length
    const equalPercentage = 100 / includedMembers.length

    setAllocations(prev =>
      prev.map(a => ({
        ...a,
        amount: a.isIncluded ? Math.round(equalAmount * 100) / 100 : 0,
        percentage: a.isIncluded ? Math.round(equalPercentage * 100) / 100 : 0,
      }))
    )
  }

  // Calcular diferencia
  const totalAllocated = allocations
    .filter(a => a.isIncluded)
    .reduce((sum, a) => sum + a.amount, 0)
  const difference = Math.round((expenseAmount - totalAllocated) * 100) / 100

  // Guardar splits
  async function handleSave() {
    if (Math.abs(difference) > 0.01) {
      toast.error('La suma de los montos debe ser igual al gasto total')
      return
    }

    setIsSaving(true)

    const splits = allocations
      .filter(a => a.isIncluded && a.amount > 0)
      .map(a => ({
        userId: a.userId,
        amount: a.amount,
        percentage: a.percentage,
      }))

    const result = await createExpenseSplits({
      expenseId,
      splits,
    })

    setIsSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Gasto dividido correctamente')
    setOpen(false)
    onSplitCreated?.()
  }

  // Eliminar splits
  async function handleRemoveSplits() {
    setIsSaving(true)
    const result = await removeExpenseSplits(expenseId)
    setIsSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('División eliminada')
    setExistingSplits([])
    initializeAllocations()
    onSplitCreated?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Split className="w-4 h-4 mr-2" />
            Dividir
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Dividir gasto
          </DialogTitle>
          <DialogDescription>
            {expenseDescription || 'Sin descripción'} - {expenseAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : existingSplits.length > 0 ? (
          // Mostrar splits existentes
          <div className="space-y-4">
            <div className="space-y-2">
              {existingSplits.map(split => (
                <div
                  key={split.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{split.userName}</span>
                    {split.isPaid && (
                      <Badge variant="default" className="text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        Pagado
                      </Badge>
                    )}
                  </div>
                  <span className="font-semibold">
                    {parseFloat(split.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                  </span>
                </div>
              ))}
            </div>

            <Button
              variant="destructive"
              className="w-full"
              onClick={handleRemoveSplits}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Eliminar división
            </Button>
          </div>
        ) : (
          // Formulario para crear splits
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={splitMode === 'equal' ? 'default' : 'outline'}
                size="sm"
                onClick={splitEqually}
                className="flex-1"
              >
                Partes iguales
              </Button>
              <Button
                variant={splitMode === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSplitMode('custom')}
                className="flex-1"
              >
                Personalizado
              </Button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {householdMembers.map(member => {
                const allocation = allocations.find(a => a.userId === member.id)
                const isPayer = member.id === paidByUserId

                return (
                  <div
                    key={member.id}
                    className={`p-3 rounded-lg border ${
                      allocation?.isIncluded ? 'bg-background' : 'bg-muted/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Checkbox
                        id={`member-${member.id}`}
                        checked={allocation?.isIncluded ?? true}
                        onCheckedChange={(checked) =>
                          handleMemberToggle(member.id, !!checked)
                        }
                      />
                      <Label
                        htmlFor={`member-${member.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <span className="font-medium">{member.name}</span>
                        {isPayer && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Pagó
                          </Badge>
                        )}
                      </Label>
                    </div>

                    {allocation?.isIncluded && (
                      <div className="flex items-center gap-2 ml-6">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={allocation?.amount || ''}
                          onChange={(e) => handleAmountChange(member.id, e.target.value)}
                          className="w-28 h-8"
                        />
                        <span className="text-sm text-muted-foreground">
                          {CURRENCY_SYMBOL}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          ({allocation?.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Resumen */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Total gasto:</span>
                <span className="font-medium">
                  {expenseAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total asignado:</span>
                <span className={difference !== 0 ? 'text-destructive font-medium' : ''}>
                  {totalAllocated.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                </span>
              </div>
              {difference !== 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Diferencia:</span>
                  <span className="font-medium">
                    {difference > 0 ? '+' : ''}{difference.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                  </span>
                </div>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving || Math.abs(difference) > 0.01}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar división'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
