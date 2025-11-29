import { NextResponse } from 'next/server'
import { getEnableBankingClient } from '@/lib/enablebanking/client'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { db, bankConnections, bankAccounts } from '@/lib/db/client'
import { eq, and } from 'drizzle-orm'

// ==========================================
// GET /api/bank/balance
// Obtiene el saldo actual de las cuentas conectadas
// ==========================================

interface AccountBalance {
  accountId: string
  accountName: string | null
  iban: string | null
  currency: string
  balance: number
  balanceType: string
}

interface BalanceResponse {
  totalBalance: number
  currency: string
  accounts: AccountBalance[]
  bankName: string
  lastSyncedAt: string | null
}

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

    // Obtener conexiones activas del usuario
    const connections = await db
      .select()
      .from(bankConnections)
      .where(
        and(
          eq(bankConnections.userId, user.id),
          eq(bankConnections.status, 'active')
        )
      )

    if (connections.length === 0) {
      return NextResponse.json(
        { error: 'No hay conexiones bancarias activas' },
        { status: 404 }
      )
    }

    const client = getEnableBankingClient()
    const allBalances: AccountBalance[] = []
    let totalBalance = 0
    let primaryCurrency = 'EUR'

    // Procesar cada conexión
    for (const conn of connections) {
      // Verificar que la sesión no haya expirado
      if (conn.expiresAt && new Date(conn.expiresAt) < new Date()) {
        continue
      }

      // Obtener cuentas de la conexión
      const accounts = await db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.connectionId, conn.id))

      // Obtener balance de cada cuenta desde Enable Banking
      for (const account of accounts) {
        try {
          const balances = await client.getBalances(account.accountUid)

          console.log(`[Bank Balance] Cuenta ${account.id} - balances raw:`, JSON.stringify(balances, null, 2))

          // Si no hay balances, saltar esta cuenta
          if (!balances || balances.length === 0) {
            console.warn(`[Bank Balance] No hay balances para la cuenta ${account.id}`)
            continue
          }

          // Buscar el balance más relevante (closingAvailable o interimAvailable)
          const relevantBalance = balances.find(b =>
            b.balanceType === 'closingAvailable' ||
            b.balanceType === 'interimAvailable'
          ) || balances[0]

          // Verificar que balanceAmount existe
          if (!relevantBalance?.balanceAmount?.amount) {
            console.warn(`[Bank Balance] Balance sin monto para cuenta ${account.id}:`, relevantBalance)
            continue
          }

          const balanceAmount = parseFloat(relevantBalance.balanceAmount.amount)

          allBalances.push({
            accountId: account.id,
            accountName: account.name,
            iban: account.iban ? maskIban(account.iban) : null,
            currency: relevantBalance.balanceAmount.currency,
            balance: balanceAmount,
            balanceType: relevantBalance.balanceType,
          })

          totalBalance += balanceAmount
          primaryCurrency = relevantBalance.balanceAmount.currency
        } catch (err) {
          console.error(`[Bank Balance] Error obteniendo balance de cuenta ${account.id}:`, err)
          // Continuar con la siguiente cuenta
        }
      }
    }

    if (allBalances.length === 0) {
      return NextResponse.json(
        { error: 'No se pudo obtener el saldo de ninguna cuenta' },
        { status: 500 }
      )
    }

    const response: BalanceResponse = {
      totalBalance,
      currency: primaryCurrency,
      accounts: allBalances,
      bankName: connections[0].bankName,
      lastSyncedAt: connections[0].lastSyncedAt?.toISOString() || null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Bank Balance] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener saldo' },
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
