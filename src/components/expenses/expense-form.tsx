'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CATEGORIES, CATEGORY_LIST, CURRENCY_SYMBOL, type CategoryKey } from '@/lib/constants'
import { createExpense, updateExpense } from '@/lib/actions/expenses'
import { checkBudgetAlert, type BudgetAlertLevel } from '@/lib/actions/budgets'
import { Loader2, X, Plus } from 'lucide-react'
import {
  Utensils,
  FileText,
  Car,
  Gamepad2,
  Home,
  HeartPulse,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'

// Mapa de iconos para categorías
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Utensils,
  FileText,
  Car,
  Gamepad2,
  Home,
  HeartPulse,
  MoreHorizontal,
}

// ==========================================
// FORMULARIO DE GASTOS
// ==========================================
// Componente reutilizable para crear y editar gastos.
// Diseño mobile-first con selección visual de categorías.

interface ExpenseFormProps {
  initialData?: {
    id: string
    amount: number
    description?: string
    category: CategoryKey
    tags?: string[]
    date: string
  }
  onSuccess?: () => void
}

export function ExpenseForm({ initialData, onSuccess }: ExpenseFormProps) {
  const router = useRouter()
  const isEditing = !!initialData

  const [isPending, setIsPending] = useState(false)
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [category, setCategory] = useState<CategoryKey | ''>(initialData?.category || '')
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!amount || !category) {
      toast.error('Completa los campos requeridos')
      return
    }

    setIsPending(true)

    const formData = {
      amount: parseFloat(amount),
      description: description || undefined,
      category,
      tags,
      date,
    }

    const result = isEditing
      ? await updateExpense(initialData.id, formData)
      : await createExpense(formData)

    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(isEditing ? 'Gasto actualizado' : 'Gasto añadido')

    // Verificar alertas de presupuesto después de crear/actualizar
    if (!isEditing) {
      const dateObj = new Date(date)
      const alertResult = await checkBudgetAlert(dateObj.getFullYear(), dateObj.getMonth() + 1)

      if (alertResult.data && alertResult.data.level !== 'ok') {
        const { level, message, percentage, remaining } = alertResult.data

        // Mostrar toast según nivel de alerta
        if (level === 'exceeded') {
          toast.error(message, {
            duration: 6000,
            description: `Te has pasado del presupuesto mensual`,
          })
        } else if (level === 'danger') {
          toast.warning(message, {
            duration: 5000,
            description: `Has llegado al 100% de tu presupuesto`,
          })
        } else if (level === 'warning') {
          toast.warning(message, {
            duration: 4000,
            description: `Te quedan ${remaining.toFixed(2)}€ este mes`,
          })
        }
      }
    }

    if (onSuccess) {
      onSuccess()
    } else {
      router.push('/')
    }
  }

  function addTag() {
    const newTag = tagInput.trim().toLowerCase()
    if (newTag && !tags.includes(newTag) && tags.length < 5) {
      setTags([...tags, newTag])
      setTagInput('')
    }
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  // Renderizar icono dinámicamente
  function CategoryIcon({ iconName }: { iconName: string }) {
    const Icon = CATEGORY_ICONS[iconName]
    return Icon ? <Icon className="w-5 h-5" /> : null
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Importe - Grande y prominente */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-sm font-medium">
          Importe
        </Label>
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
            className="text-3xl h-16 pl-4 pr-12 font-bold"
            required
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">
            {CURRENCY_SYMBOL}
          </span>
        </div>
      </div>

      {/* Categoría - Grid visual */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Categoría</Label>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORY_LIST.map(({ value, label, color, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                category === value
                  ? 'border-primary bg-primary/10'
                  : 'border-muted hover:border-muted-foreground/30'
              }`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
                style={{ backgroundColor: `${color}20` }}
              >
                <span style={{ color }}>
                  <CategoryIcon iconName={icon} />
                </span>
              </div>
              <span className="text-[10px] font-medium text-center leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Descripción <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id="description"
          type="text"
          placeholder="Ej: Compra semanal en Mercadona"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Tags <span className="text-muted-foreground">(opcional, máx 5)</span>
        </Label>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Añadir tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
            maxLength={30}
            disabled={tags.length >= 5}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addTag}
            disabled={tags.length >= 5 || !tagInput.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button type="button" onClick={() => removeTag(tag)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Fecha */}
      <div className="space-y-2">
        <Label htmlFor="date" className="text-sm font-medium">
          Fecha
        </Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          required
        />
      </div>

      {/* Botón submit */}
      <Button type="submit" className="w-full h-12" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isEditing ? 'Actualizando...' : 'Guardando...'}
          </>
        ) : (
          isEditing ? 'Actualizar gasto' : 'Añadir gasto'
        )}
      </Button>
    </form>
  )
}
