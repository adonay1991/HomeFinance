'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CURRENCY_SYMBOL } from '@/lib/constants'
import { createSavingsGoal } from '@/lib/actions/savings'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'

// ==========================================
// FORMULARIO PARA CREAR META DE AHORRO
// ==========================================

export function SavingsGoalForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [deadline, setDeadline] = useState('')

  function resetForm() {
    setName('')
    setTargetAmount('')
    setCurrentAmount('')
    setDeadline('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name || !targetAmount) {
      toast.error('Completa los campos requeridos')
      return
    }

    setIsPending(true)

    const result = await createSavingsGoal({
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
      deadline: deadline || undefined,
    })

    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Meta creada')
      resetForm()
      setIsOpen(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva meta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear meta de ahorro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la meta</Label>
            <Input
              id="name"
              placeholder="Ej: Vacaciones de verano"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          {/* Objetivo */}
          <div className="space-y-2">
            <Label htmlFor="targetAmount">Objetivo</Label>
            <div className="relative">
              <Input
                id="targetAmount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="pr-10"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                {CURRENCY_SYMBOL}
              </span>
            </div>
          </div>

          {/* Cantidad inicial (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="currentAmount">
              Ahorrado actualmente <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <div className="relative">
              <Input
                id="currentAmount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                {CURRENCY_SYMBOL}
              </span>
            </div>
          </div>

          {/* Fecha límite (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="deadline">
              Fecha objetivo <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Botón submit */}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear meta'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
