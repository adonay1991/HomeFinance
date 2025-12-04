'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import { ArrowRight, Wallet, CheckCircle2, Loader2 } from 'lucide-react'
import { settleBalance, type BalancesResult, type SimplifiedDebt } from '@/lib/actions/household'
import { cn } from '@/lib/utils'

// ==========================================
// COMPONENTE: BalancesCard
// Muestra balances y deudas simplificadas
// ==========================================

interface BalancesCardProps {
  balances: BalancesResult
  currentUserId: string
}

export function BalancesCard({ balances, currentUserId }: BalancesCardProps) {
  const [selectedDebt, setSelectedDebt] = useState<SimplifiedDebt | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }

  const handleSettleDebt = () => {
    if (!selectedDebt) return

    const settleAmount = parseFloat(amount) || selectedDebt.amount

    if (settleAmount <= 0) {
      toast.error('El importe debe ser mayor que 0')
      return
    }

    startTransition(async () => {
      const result = await settleBalance({
        toUserId: selectedDebt.toUserId,
        amount: settleAmount,
        note: note || undefined,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Pago registrado correctamente')
      setSelectedDebt(null)
      setAmount('')
      setNote('')
    })
  }

  const userBalance = balances.userBalances.find((b) => b.userId === currentUserId)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Balances
              </CardTitle>
              <CardDescription>
                Resumen de gastos y deudas del hogar
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumen general */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total gastos</p>
              <p className="text-xl font-semibold">
                {formatCurrency(balances.totalExpenses)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Por persona</p>
              <p className="text-xl font-semibold">
                {formatCurrency(balances.perPersonShare)}
              </p>
            </div>
          </div>

          {/* Tu balance */}
          {userBalance && (
            <div
              className={cn(
                'rounded-lg p-4 border-2',
                userBalance.balance > 0
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900'
                  : userBalance.balance < 0
                    ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900'
                    : 'bg-muted border-muted'
              )}
            >
              <p className="text-sm text-muted-foreground mb-1">Tu balance</p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  userBalance.balance > 0
                    ? 'text-green-600 dark:text-green-400'
                    : userBalance.balance < 0
                      ? 'text-red-600 dark:text-red-400'
                      : ''
                )}
              >
                {userBalance.balance > 0 ? '+' : ''}
                {formatCurrency(userBalance.balance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {userBalance.balance > 0
                  ? 'Te deben dinero'
                  : userBalance.balance < 0
                    ? 'Debes dinero'
                    : 'Estás al día'}
              </p>
            </div>
          )}

          {/* Deudas simplificadas */}
          {balances.simplifiedDebts.length > 0 ? (
            <div>
              <p className="text-sm font-medium mb-3">Pagos pendientes</p>
              <div className="space-y-2">
                {balances.simplifiedDebts.map((debt, index) => {
                  const isYouDebtor = debt.fromUserId === currentUserId
                  const isYouCreditor = debt.toUserId === currentUserId

                  return (
                    <div
                      key={index}
                      className={cn(
                        'flex items-center justify-between py-2 px-3 rounded-lg',
                        isYouDebtor
                          ? 'bg-red-50 dark:bg-red-950/30'
                          : isYouCreditor
                            ? 'bg-green-50 dark:bg-green-950/30'
                            : 'bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={isYouDebtor ? 'destructive' : isYouCreditor ? 'default' : 'secondary'}>
                          {isYouDebtor ? 'Tú' : debt.fromUserName}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant={isYouCreditor ? 'default' : 'secondary'}>
                          {isYouCreditor ? 'Tú' : debt.toUserName}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {formatCurrency(debt.amount)}
                        </span>
                        {isYouDebtor && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDebt(debt)
                              setAmount(debt.amount.toFixed(2))
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Pagar
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>¡Todos están al día!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet para registrar pago */}
      <Sheet open={!!selectedDebt} onOpenChange={(open) => !open && setSelectedDebt(null)}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader className="px-4">
            <SheetTitle>Registrar pago</SheetTitle>
            <SheetDescription>
              Pago a {selectedDebt?.toUserName}
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Importe</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={selectedDebt?.amount.toFixed(2)}
                step="0.01"
                min="0.01"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deuda total: {formatCurrency(selectedDebt?.amount || 0)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Nota (opcional)</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej: Bizum, efectivo..."
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedDebt(null)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSettleDebt}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Registrar pago'
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
