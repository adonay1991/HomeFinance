'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORY_LIST, CURRENCY_SYMBOL, type CategoryKey } from '@/lib/constants'
import {
  type RecurringExpense,
  type Frequency,
  createRecurringExpense,
  updateRecurringExpense,
} from '@/lib/actions/recurring-expenses'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

// ==========================================
// FORMULARIO DE GASTO RECURRENTE
// ==========================================

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

interface RecurringExpenseFormProps {
  initialData?: RecurringExpense
  onSuccess: () => void
}

export function RecurringExpenseForm({ initialData, onSuccess }: RecurringExpenseFormProps) {
  const [isPending, setIsPending] = useState(false)

  // Form state
  const [amount, setAmount] = useState(initialData?.amount.toString() || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [category, setCategory] = useState<CategoryKey>(
    (initialData?.category as CategoryKey) || 'otros'
  )
  const [frequency, setFrequency] = useState<Frequency>(initialData?.frequency || 'monthly')
  const [dayOfMonth, setDayOfMonth] = useState(initialData?.dayOfMonth?.toString() || '1')
  const [dayOfWeek, setDayOfWeek] = useState(initialData?.dayOfWeek?.toString() || '1')
  const [monthOfYear, setMonthOfYear] = useState(initialData?.monthOfYear?.toString() || '1')
  const [startDate, setStartDate] = useState(
    initialData?.startDate || new Date().toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(initialData?.endDate || '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('El monto debe ser mayor que 0')
      return
    }

    setIsPending(true)

    const data = {
      amount: amountNum,
      description: description || undefined,
      category,
      frequency,
      dayOfMonth: frequency === 'monthly' || frequency === 'yearly' ? parseInt(dayOfMonth) : undefined,
      dayOfWeek: frequency === 'weekly' || frequency === 'biweekly' ? parseInt(dayOfWeek) : undefined,
      monthOfYear: frequency === 'yearly' ? parseInt(monthOfYear) : undefined,
      startDate,
      endDate: endDate || undefined,
    }

    const result = initialData
      ? await updateRecurringExpense(initialData.id, data)
      : await createRecurringExpense(data)

    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(initialData ? 'Gasto actualizado' : 'Gasto recurrente creado')
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Monto */}
      <div className="space-y-2">
        <Label htmlFor="amount">Monto</Label>
        <div className="relative">
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pr-10 text-lg"
            required
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {CURRENCY_SYMBOL}
          </span>
        </div>
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Input
          id="description"
          type="text"
          placeholder="Ej: Alquiler, Netflix, Gimnasio..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Categoría */}
      <div className="space-y-2">
        <Label>Categoría</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as CategoryKey)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_LIST.map((cat) => (
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
          </SelectContent>
        </Select>
      </div>

      {/* Frecuencia */}
      <div className="space-y-2">
        <Label>Frecuencia</Label>
        <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Día de la semana (para semanal/quincenal) */}
      {(frequency === 'weekly' || frequency === 'biweekly') && (
        <div className="space-y-2">
          <Label>Día de la semana</Label>
          <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((day) => (
                <SelectItem key={day.value} value={day.value.toString()}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Día del mes (para mensual/anual) */}
      {(frequency === 'monthly' || frequency === 'yearly') && (
        <div className="space-y-2">
          <Label>Día del mes</Label>
          <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Si el día no existe (ej: 31 en febrero), se usará el último día del mes
          </p>
        </div>
      )}

      {/* Mes del año (para anual) */}
      {frequency === 'yearly' && (
        <div className="space-y-2">
          <Label>Mes</Label>
          <Select value={monthOfYear} onValueChange={setMonthOfYear}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
              ].map((month, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Fecha de inicio */}
      <div className="space-y-2">
        <Label htmlFor="startDate">Fecha de inicio</Label>
        <Input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </div>

      {/* Fecha de fin (opcional) */}
      <div className="space-y-2">
        <Label htmlFor="endDate">Fecha de fin (opcional)</Label>
        <Input
          id="endDate"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          min={startDate}
        />
        <p className="text-xs text-muted-foreground">
          Deja vacío para que se repita indefinidamente
        </p>
      </div>

      {/* Botón de envío */}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : initialData ? (
          'Guardar cambios'
        ) : (
          'Crear gasto recurrente'
        )}
      </Button>
    </form>
  )
}
