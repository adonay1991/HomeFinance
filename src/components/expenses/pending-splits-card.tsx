'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CURRENCY_SYMBOL, CATEGORIES, type CategoryKey } from '@/lib/constants'
import { markSplitAsPaid } from '@/lib/actions/splits'
import { Loader2, Check, ArrowRight, ArrowLeft, Split } from 'lucide-react'

// ==========================================
// CARD DE SPLITS PENDIENTES
// Muestra lo que debo y lo que me deben
// ==========================================

interface PendingSplit {
  splitId: string
  amount: number
  expenseId: string
  expenseDescription: string | null
  expenseCategory: string
  expenseDate: string
  paidByName?: string
  debtorName?: string
}

interface PendingSplitsCardProps {
  splitsIowe: PendingSplit[]
  splitsOwedToMe: PendingSplit[]
  onSplitPaid?: () => void
}

export function PendingSplitsCard({
  splitsIowe,
  splitsOwedToMe,
  onSplitPaid,
}: PendingSplitsCardProps) {
  const [payingId, setPayingId] = useState<string | null>(null)

  const totalOwed = splitsIowe.reduce((sum, s) => sum + s.amount, 0)
  const totalOwedToMe = splitsOwedToMe.reduce((sum, s) => sum + s.amount, 0)
  const netBalance = totalOwedToMe - totalOwed

  async function handleMarkAsPaid(splitId: string) {
    setPayingId(splitId)
    const result = await markSplitAsPaid(splitId)
    setPayingId(null)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Marcado como pagado')
    onSplitPaid?.()
  }

  function getCategoryLabel(category: string): string {
    return CATEGORIES[category as CategoryKey]?.label ?? category
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  if (splitsIowe.length === 0 && splitsOwedToMe.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Split className="w-4 h-4" />
            Gastos divididos
          </CardTitle>
          <Badge
            variant={netBalance >= 0 ? 'default' : 'destructive'}
            className="text-xs"
          >
            {netBalance >= 0 ? 'Te deben' : 'Debes'} {Math.abs(netBalance).toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lo que debo */}
        {splitsIowe.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <ArrowRight className="w-4 h-4" />
              <span>Debo pagar ({totalOwed.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL})</span>
            </div>
            <div className="space-y-2">
              {splitsIowe.map(split => (
                <div
                  key={split.splitId}
                  className="flex items-center justify-between p-2 bg-destructive/5 rounded-lg text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {split.expenseDescription || getCategoryLabel(split.expenseCategory)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      A {split.paidByName} • {formatDate(split.expenseDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="font-semibold text-destructive whitespace-nowrap">
                      {split.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleMarkAsPaid(split.splitId)}
                      disabled={payingId === split.splitId}
                    >
                      {payingId === split.splitId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lo que me deben */}
        {splitsOwedToMe.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <ArrowLeft className="w-4 h-4" />
              <span>Me deben ({totalOwedToMe.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL})</span>
            </div>
            <div className="space-y-2">
              {splitsOwedToMe.map(split => (
                <div
                  key={split.splitId}
                  className="flex items-center justify-between p-2 bg-green-500/5 rounded-lg text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {split.expenseDescription || getCategoryLabel(split.expenseCategory)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      De {split.debtorName} • {formatDate(split.expenseDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="font-semibold text-green-600 whitespace-nowrap">
                      {split.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{CURRENCY_SYMBOL}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleMarkAsPaid(split.splitId)}
                      disabled={payingId === split.splitId}
                      title="Marcar como recibido"
                    >
                      {payingId === split.splitId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
