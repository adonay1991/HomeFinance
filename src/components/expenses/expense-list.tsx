'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CATEGORIES, CURRENCY_SYMBOL, type CategoryKey } from '@/lib/constants'
import { deleteExpense } from '@/lib/actions/expenses'
import {
  MoreVertical,
  Trash2,
  Edit,
  User,
  Utensils,
  FileText,
  Car,
  Gamepad2,
  Home,
  HeartPulse,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

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
// LISTA DE GASTOS
// ==========================================

interface Expense {
  id: string
  amount: number | string
  description: string | null
  category: string
  tags: string[] | null
  date: string
  paid_by: string
  paid_by_user: {
    name: string
    email: string
  } | null
  created_at: string
}

interface ExpenseListProps {
  expenses: Expense[]
  onEdit?: (expense: Expense) => void
  showUser?: boolean
}

export function ExpenseList({ expenses, onEdit, showUser = true }: ExpenseListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este gasto?')) return

    setDeletingId(id)
    const result = await deleteExpense(id)
    setDeletingId(null)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Gasto eliminado')
    }
  }

  // Renderizar icono dinámicamente
  function CategoryIcon({ iconName, className }: { iconName: string; className?: string }) {
    const Icon = CATEGORY_ICONS[iconName]
    return Icon ? <Icon className={className} /> : null
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>No hay gastos registrados</p>
          <p className="text-sm mt-1">Pulsa el botón + para añadir uno</p>
        </CardContent>
      </Card>
    )
  }

  // Agrupar gastos por fecha
  const groupedByDate = expenses.reduce((acc, expense) => {
    const dateKey = expense.date
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(expense)
    return acc
  }, {} as Record<string, Expense[]>)

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([dateKey, dayExpenses]) => (
        <div key={dateKey} className="space-y-2">
          {/* Header de fecha */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-muted-foreground">
              {format(new Date(dateKey), "EEEE, d 'de' MMMM", { locale: es })}
            </h3>
            <span className="text-sm font-semibold">
              {dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)}{CURRENCY_SYMBOL}
            </span>
          </div>

          {/* Lista de gastos del día */}
          <div className="space-y-2">
            {dayExpenses.map((expense) => {
              const cat = CATEGORIES[expense.category as CategoryKey]
              const isDeleting = deletingId === expense.id

              return (
                <Card
                  key={expense.id}
                  className={`transition-opacity ${isDeleting ? 'opacity-50' : ''}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Icono de categoría */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${cat?.color || '#6b7280'}20` }}
                      >
                        <span style={{ color: cat?.color || '#6b7280' }}>
                          <CategoryIcon iconName={cat?.icon || 'MoreHorizontal'} className="w-5 h-5" />
                        </span>
                      </div>

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {expense.description || cat?.label || 'Gasto'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{cat?.label}</span>
                          {showUser && expense.paid_by_user && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {expense.paid_by_user.name}
                              </span>
                            </>
                          )}
                        </div>
                        {/* Tags */}
                        {expense.tags && expense.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {expense.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Importe */}
                      <div className="text-right">
                        <span className="font-semibold">
                          {Number(expense.amount).toFixed(2)}
                          <span className="text-muted-foreground text-sm">{CURRENCY_SYMBOL}</span>
                        </span>
                      </div>

                      {/* Menú de acciones */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(expense)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// Skeleton para loading state
export function ExpenseListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
