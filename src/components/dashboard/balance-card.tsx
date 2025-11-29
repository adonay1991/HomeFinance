'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, RefreshCw, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ==========================================
// BALANCE CARD - Saldo actual de la cuenta bancaria
// ==========================================

interface BalanceData {
  totalBalance: number
  currency: string
  bankName: string
  accounts: Array<{
    accountId: string
    accountName: string | null
    iban: string | null
    balance: number
    currency: string
  }>
  lastSyncedAt: string | null
}

export function BalanceCard() {
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBalance()
  }, [])

  async function loadBalance() {
    try {
      setError(null)
      const res = await fetch('/api/bank/balance', { credentials: 'include' })

      if (res.status === 404) {
        // No hay banco conectado - no es un error
        setBalance(null)
        return
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al cargar saldo')
      }

      const data = await res.json()
      setBalance(data)
    } catch (err) {
      console.error('[BalanceCard] Error:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSync() {
    setIsSyncing(true)
    try {
      // Primero sincronizar transacciones
      await fetch('/api/bank/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ daysBack: 30 }),
      })

      // Luego recargar balance
      await loadBalance()
    } catch (err) {
      console.error('[BalanceCard] Sync error:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  // Formatear fecha relativa
  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora mismo'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    return `Hace ${diffDays} días`
  }

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-40 mb-4" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  if (error || !balance) {
    return null // No mostrar nada si no hay banco
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              Saldo actual
            </p>
            <p className="text-3xl font-bold tracking-tight mt-1">
              {formatCurrency(balance.totalBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {balance.bankName}
              {balance.accounts[0]?.iban && (
                <span className="ml-1">• {balance.accounts[0].iban}</span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSync}
            disabled={isSyncing}
            className="text-muted-foreground hover:text-foreground"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {balance.lastSyncedAt && (
          <p className="text-xs text-muted-foreground mt-3">
            Última sync: {formatRelativeTime(balance.lastSyncedAt)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
