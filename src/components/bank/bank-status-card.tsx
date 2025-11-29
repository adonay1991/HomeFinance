'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Building2,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  CreditCard,
} from 'lucide-react'
import { BankConnectButton } from './bank-connect-button'

// ==========================================
// CARD DE ESTADO DE CONEXIÓN BANCARIA
// ==========================================

interface Account {
  id: string
  iban: string | null
  name: string | null
  currency: string
  type: string | null
}

interface Connection {
  id: string
  bankName: string
  country: string
  status: 'active' | 'expired' | 'error'
  connectedAt: string
  expiresAt: string | null
  lastSyncedAt: string | null
  accounts: Account[]
  lastSync: {
    syncedAt: string
    transactionsFetched: number
    transactionsNew: number
    error: string | null
  } | null
}

interface BankStatus {
  connected: boolean
  connections: Connection[]
}

export function BankStatusCard() {
  const [status, setStatus] = useState<BankStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Cargar estado inicial
  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/bank/status', {
        credentials: 'include',
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar estado')
      }

      setStatus(data)
      setError(null)
    } catch (err) {
      // Si hay error de conexión, mostrar como no conectado en lugar de error
      console.warn('[BankStatusCard] Error cargando estado:', err)
      setStatus({ connected: false, connections: [] })
      // No mostrar error al usuario si es problema de red/DB
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSync() {
    setIsSyncing(true)
    setSyncResult(null)

    try {
      const res = await fetch('/api/bank/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ daysBack: 30 }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al sincronizar')
      }

      setSyncResult(
        `Sincronizado: ${data.transactionsNew} nuevas transacciones, ${data.expensesCreated} gastos importados`
      )

      // Recargar estado
      await loadStatus()
    } catch (err) {
      setSyncResult(err instanceof Error ? err.message : 'Error al sincronizar')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleDisconnect(connectionId: string) {
    try {
      const res = await fetch(`/api/bank/disconnect?connectionId=${connectionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al desconectar')
      }

      // Recargar estado
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desconectar')
    }
  }

  // Formatear fecha relativa
  function formatRelativeDate(dateStr: string): string {
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
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sin conexión
  if (!status?.connected || status.connections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Conexión bancaria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Conecta tu cuenta bancaria para importar transacciones automáticamente
            y no tener que añadir gastos manualmente.
          </p>
          <BankConnectButton variant="default" />
        </CardContent>
      </Card>
    )
  }

  // Con conexiones
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5" />
          Conexión bancaria
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}

        {syncResult && (
          <div className="text-sm text-primary bg-primary/10 p-3 rounded-md">
            {syncResult}
          </div>
        )}

        {status.connections.map((conn) => (
          <div
            key={conn.id}
            className="border rounded-lg p-4 space-y-3"
          >
            {/* Header de la conexión */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{conn.bankName}</span>
                <Badge
                  variant={
                    conn.status === 'active' ? 'default' :
                    conn.status === 'expired' ? 'secondary' : 'destructive'
                  }
                  className="text-xs"
                >
                  {conn.status === 'active' && (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  )}
                  {conn.status === 'expired' && (
                    <Clock className="h-3 w-3 mr-1" />
                  )}
                  {conn.status === 'error' && (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {conn.status === 'active' ? 'Activa' :
                   conn.status === 'expired' ? 'Expirada' : 'Error'}
                </Badge>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Desconectar banco?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminará la conexión con {conn.bankName}.
                      Los gastos ya importados se mantendrán, pero no podrás
                      sincronizar nuevas transacciones.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground"
                      onClick={() => handleDisconnect(conn.id)}
                    >
                      Desconectar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Cuentas */}
            {conn.accounts.length > 0 && (
              <div className="space-y-1.5">
                {conn.accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>{acc.name || acc.iban || 'Cuenta'}</span>
                    <span className="text-xs">({acc.currency})</span>
                  </div>
                ))}
              </div>
            )}

            {/* Info de sincronización */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Conectado: {formatRelativeDate(conn.connectedAt)}
              </span>
              {conn.lastSyncedAt && (
                <span>
                  Última sync: {formatRelativeDate(conn.lastSyncedAt)}
                </span>
              )}
            </div>

            {/* Expiración */}
            {conn.status === 'expired' && (
              <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                La conexión ha expirado. Reconecta para seguir sincronizando.
              </div>
            )}
          </div>
        ))}

        {/* Botón para añadir más bancos */}
        <BankConnectButton variant="outline" size="sm" />
      </CardContent>
    </Card>
  )
}
