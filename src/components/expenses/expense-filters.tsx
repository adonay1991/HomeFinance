'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CATEGORY_LIST, type CategoryKey } from '@/lib/constants'
import { Filter, X, Tag } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

// ==========================================
// FILTROS DE GASTOS
// ==========================================

interface ExpenseFiltersProps {
  activeCategory?: string
  startDate?: string
  endDate?: string
  activeTags?: string[]
  availableTags?: string[]
}

export function ExpenseFilters({
  activeCategory,
  startDate,
  endDate,
  activeTags = [],
  availableTags = []
}: ExpenseFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)

  const hasFilters = activeCategory || startDate || endDate || activeTags.length > 0

  function updateFilters(params: Record<string, string | undefined>) {
    const newParams = new URLSearchParams(searchParams.toString())

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value)
      } else {
        newParams.delete(key)
      }
    })

    router.push(`/expenses?${newParams.toString()}`)
  }

  function clearFilters() {
    router.push('/expenses')
    setIsOpen(false)
  }

  function toggleCategory(category: CategoryKey) {
    updateFilters({
      category: activeCategory === category ? undefined : category,
    })
  }

  function toggleTag(tag: string) {
    const newTags = activeTags.includes(tag)
      ? activeTags.filter(t => t !== tag)
      : [...activeTags, tag]

    const newParams = new URLSearchParams(searchParams.toString())
    if (newTags.length > 0) {
      newParams.set('tags', newTags.join(','))
    } else {
      newParams.delete('tags')
    }
    router.push(`/expenses?${newParams.toString()}`)
  }

  return (
    <div className="space-y-3">
      {/* Barra de filtros rápidos - categorías */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!activeCategory ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateFilters({ category: undefined })}
        >
          Todos
        </Button>
        {CATEGORY_LIST.map(({ value, label, color }) => (
          <Button
            key={value}
            variant={activeCategory === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleCategory(value)}
            className="gap-1.5"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            {label}
          </Button>
        ))}
      </div>

      {/* Botón de filtros avanzados */}
      <div className="flex items-center gap-2">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtros
              {hasFilters && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle>Filtrar gastos</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 py-4">
              {/* Rango de fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Desde</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate || ''}
                    onChange={(e) => updateFilters({ startDate: e.target.value || undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Hasta</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate || ''}
                    onChange={(e) => updateFilters({ endDate: e.target.value || undefined })}
                  />
                </div>
              </div>

              {/* Filtro por tags */}
              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={activeTags.includes(tag) ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-primary/80 transition-colors"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                        {activeTags.includes(tag) && (
                          <X className="w-3 h-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={clearFilters}
                >
                  Limpiar filtros
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setIsOpen(false)}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Badge de filtros activos */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="w-3 h-3" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  )
}
