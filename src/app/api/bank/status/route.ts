import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { db, bankConnections, bankAccounts, bankSyncLog } from '@/lib/db/client'
import { eq, desc } from 'drizzle-orm'

// ==========================================
// GET /api/bank/status
// Obtiene el estado de las conexiones bancarias del usuario
// ==========================================

export async function GET() {
  try {
    // Verificar autenticación
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener conexiones del usuario
    const connections = await db
      .select()
      .from(bankConnections)
      .where(eq(bankConnections.userId, user.id))
      .orderBy(desc(bankConnections.connectedAt))

    // Si no hay conexiones
    if (connections.length === 0) {
      return NextResponse.json({
        connected: false,
        connections: [],
      })
    }

    // Obtener cuentas y última sincronización para cada conexión
    const connectionsWithDetails = await Promise.all(
      connections.map(async (conn) => {
        // Obtener cuentas
        const accounts = await db
          .select()
          .from(bankAccounts)
          .where(eq(bankAccounts.connectionId, conn.id))

        // Obtener última sincronización de cualquier cuenta
        const accountIds = accounts.map(a => a.id)
        let lastSync = null

        if (accountIds.length > 0) {
          const [syncLog] = await db
            .select()
            .from(bankSyncLog)
            .where(eq(bankSyncLog.accountId, accountIds[0]))
            .orderBy(desc(bankSyncLog.syncedAt))
            .limit(1)

          lastSync = syncLog
        }

        // Verificar si la sesión ha expirado
        const isExpired = conn.expiresAt ? new Date(conn.expiresAt) < new Date() : false
        const status = isExpired ? 'expired' : conn.status

        return {
          id: conn.id,
          bankName: conn.bankName,
          country: conn.country,
          status,
          connectedAt: conn.connectedAt,
          expiresAt: conn.expiresAt,
          lastSyncedAt: conn.lastSyncedAt,
          accounts: accounts.map(acc => ({
            id: acc.id,
            iban: acc.iban ? maskIban(acc.iban) : null,
            name: acc.name,
            currency: acc.currency,
            type: acc.accountType,
          })),
          lastSync: lastSync ? {
            syncedAt: lastSync.syncedAt,
            transactionsFetched: lastSync.transactionsFetched,
            transactionsNew: lastSync.transactionsNew,
            error: lastSync.error,
          } : null,
        }
      })
    )

    // Determinar si hay al menos una conexión activa
    const hasActiveConnection = connectionsWithDetails.some(c => c.status === 'active')

    return NextResponse.json({
      connected: hasActiveConnection,
      connections: connectionsWithDetails,
    })
  } catch (error) {
    console.error('[Bank Status] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    )
  }
}

/**
 * Enmascara un IBAN mostrando solo los primeros 4 y últimos 4 caracteres
 */
function maskIban(iban: string): string {
  if (iban.length <= 8) return iban
  return `${iban.slice(0, 4)}${'*'.repeat(iban.length - 8)}${iban.slice(-4)}`
}
