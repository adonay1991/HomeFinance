'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, RefreshCw, Loader2, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ==========================================
// BALANCE CARD - Saldo actual de la cuenta bancaria
// Con manejo de rate limits y cache local
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

// Clave para localStorage
const BALANCE_CACHE_KEY = 'homefinance_balance_cache'
const BALANCE_CACHE_TIME_KEY = 'homefinance_balance_cache_time'
const LAST_SYNC_KEY = 'homefinance_last_sync'
const MIN_SYNC_INTERVAL = 60 * 60 * 1000 // 1 hora en milisegundos
const CACHE_MAX_AGE = 60 * 60 * 1000 // Cache válido por 1 hora

export function BalanceCard() {
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimitError, setRateLimitError] = useState<string | null>(null)
  const [canSync, setCanSync] = useState(true)

  // Verificar si el cache es válido (menos de 1 hora)
  const isCacheValid = useCallback((): boolean => {
    const cacheTime = localStorage.getItem(BALANCE_CACHE_TIME_KEY)
    if (!cacheTime) return false

    const elapsed = Date.now() - parseInt(cacheTime, 10)
    return elapsed < CACHE_MAX_AGE
  }, [])

  // Cargar balance del cache primero, solo actualizar si es necesario
  const loadBalance = useCallback(async (forceRefresh = false) => {
    try {
      setError(null)
      setIsLoading(true)

      // Intentar cargar del cache primero
      const cachedData = localStorage.getItem(BALANCE_CACHE_KEY)
      if (cachedData) {
        const cached = JSON.parse(cachedData) as BalanceData
        setBalance(cached)

        // Si el cache es válido y no forzamos refresh, no hacer llamada a API
        // Esto evita consumir las 4 llamadas diarias del banco
        if (!forceRefresh && isCacheValid()) {
          console.log('[BalanceCard] Usando cache válido, no se llama a la API del banco')
          setIsLoading(false)
          return
        }
      }

      // Solo hacer fetch si no hay cache, cache expirado, o forceRefresh
      console.log('[BalanceCard] Cache expirado o forceRefresh, llamando a API del banco')
      const res = await fetch('/api/bank/balance', { credentials: 'include' })

      if (res.status === 404) {
        // No hay banco conectado - esto NO es un error, simplemente no hay banco
        setBalance(null)
        setError(null) // Importante: limpiar error
        localStorage.removeItem(BALANCE_CACHE_KEY)
        return
      }

      if (res.status === 429) {
        // Rate limit - mostrar mensaje pero mantener datos en cache
        const data = await res.json()
        setRateLimitError(data.message || 'Límite de consultas alcanzado. Intenta más tarde.')
        // No borrar el balance cacheado, solo mostrar el error
        return
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al cargar saldo')
      }

      const data = await res.json()
      setBalance(data)
      setRateLimitError(null)
      setError(null)

      // Guardar en cache con timestamp
      localStorage.setItem(BALANCE_CACHE_KEY, JSON.stringify(data))
      localStorage.setItem(BALANCE_CACHE_TIME_KEY, Date.now().toString())
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString())
    } catch (err) {
      console.error('[BalanceCard] Error:', err)
      setRateLimitError(null)
      // Mostrar error - si hay cache, se mostrará con el error superpuesto
      setError(err instanceof Error ? err.message : 'Error al conectar con el banco')
    } finally {
      setIsLoading(false)
    }
  }, [isCacheValid])

  // Verificar si podemos sincronizar (cooldown)
  const checkCanSync = useCallback(() => {
    const lastSync = localStorage.getItem(LAST_SYNC_KEY)
    if (!lastSync) {
      setCanSync(true)
      return true
    }

    const elapsed = Date.now() - parseInt(lastSync, 10)
    const canSyncNow = elapsed >= MIN_SYNC_INTERVAL
    setCanSync(canSyncNow)
    return canSyncNow
  }, [])

  useEffect(() => {
    loadBalance()
    checkCanSync()

    // Verificar cada minuto si podemos sincronizar
    const interval = setInterval(checkCanSync, 60000)
    return () => clearInterval(interval)
  }, [loadBalance, checkCanSync])

  async function handleSync() {
    // Verificar cooldown
    if (!checkCanSync()) {
      const lastSync = localStorage.getItem(LAST_SYNC_KEY)
      if (lastSync) {
        const elapsed = Date.now() - parseInt(lastSync, 10)
        const remaining = Math.ceil((MIN_SYNC_INTERVAL - elapsed) / 60000)
        setRateLimitError(`Espera ${remaining} minutos antes de sincronizar de nuevo.`)
      }
      return
    }

    setIsSyncing(true)
    setRateLimitError(null)

    try {
      // Sincronizar transacciones
      const syncRes = await fetch('/api/bank/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ daysBack: 30 }),
      })

      if (syncRes.status === 429) {
        const data = await syncRes.json()
        setRateLimitError(data.message || 'Límite de consultas del banco alcanzado. Intenta en 1 hora.')
        return
      }

      // Actualizar timestamp de sync
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString())

      // Recargar balance (forzar refresh)
      await loadBalance(true)
    } catch (err) {
      console.error('[BalanceCard] Sync error:', err)
      setRateLimitError('Error al sincronizar. Intenta más tarde.')
    } finally {
      setIsSyncing(false)
      checkCanSync()
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

  // Si hay error o rate limit pero no hay balance cacheado, mostrar card con error
  if ((error || rateLimitError) && !balance) {
    const isRateLimit = !!rateLimitError
    return (
      <Card className={`bg-gradient-to-br ${isRateLimit ? 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20' : 'from-red-500/10 to-red-500/5 border-red-500/20'}`}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Saldo actual
              </p>
              <p className="text-2xl font-bold tracking-tight mt-1 text-muted-foreground">
                --,-- €
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadBalance(true)}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground"
              title="Reintentar"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className={`flex items-start gap-2 mt-3 p-2 rounded-md ${isRateLimit ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isRateLimit ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`} />
            <p className={`text-xs ${isRateLimit ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300'}`}>
              {isRateLimit
                ? rateLimitError
                : 'No se pudo conectar con el banco. Intenta de nuevo más tarde.'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!balance && !error && !rateLimitError) {
    return null // No hay banco conectado (404)
  }

  // Si llegamos aquí sin balance pero con error, no deberíamos llegar, pero por seguridad:
  if (!balance) {
    return null
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
            disabled={isSyncing || !canSync}
            className="text-muted-foreground hover:text-foreground"
            title={canSync ? 'Sincronizar' : 'Espera antes de sincronizar'}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className={`h-4 w-4 ${!canSync ? 'opacity-50' : ''}`} />
            )}
          </Button>
        </div>

        {/* Mensaje de error (no rate limit) */}
        {error && !rateLimitError && (
          <div className="flex items-start gap-2 mt-3 p-2 rounded-md bg-orange-500/10 border border-orange-500/20">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Usando datos guardados. No se pudo actualizar el saldo.
            </p>
          </div>
        )}

        {/* Mensaje de rate limit */}
        {rateLimitError && (
          <div className="flex items-start gap-2 mt-3 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              {rateLimitError}
            </p>
          </div>
        )}

        {balance.lastSyncedAt && !rateLimitError && !error && (
          <p className="text-xs text-muted-foreground mt-3">
            Última sync: {formatRelativeTime(balance.lastSyncedAt)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
