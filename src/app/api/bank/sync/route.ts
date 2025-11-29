import { NextRequest, NextResponse } from 'next/server'
import { getEnableBankingClient } from '@/lib/enablebanking/client'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import {
  db,
  bankConnections,
  bankAccounts,
  bankTransactions,
  bankSyncLog,
  expenses,
} from '@/lib/db/client'
import { eq, and } from 'drizzle-orm'
import {
  isExpense,
  transactionToExpenseData,
  getTransactionExternalId,
} from '@/lib/enablebanking/utils'
import { DEFAULT_HOUSEHOLD_ID } from '@/lib/constants'
import type { SyncResult } from '@/lib/enablebanking/types'

// ==========================================
// POST /api/bank/sync
// Sincroniza TODAS las transacciones bancarias (gastos e ingresos)
// Solo los gastos se importan automáticamente como expenses
// ==========================================

export async function POST(request: NextRequest) {
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

    // Obtener parámetros opcionales
    const body = await request.json().catch(() => ({}))
    const { connectionId, accountId, daysBack = 30 } = body

    // Obtener conexiones activas del usuario
    let connectionsQuery = db
      .select()
      .from(bankConnections)
      .where(
        and(
          eq(bankConnections.userId, user.id),
          eq(bankConnections.status, 'active')
        )
      )

    if (connectionId) {
      connectionsQuery = db
        .select()
        .from(bankConnections)
        .where(
          and(
            eq(bankConnections.userId, user.id),
            eq(bankConnections.id, connectionId),
            eq(bankConnections.status, 'active')
          )
        )
    }

    const connections = await connectionsQuery

    if (connections.length === 0) {
      return NextResponse.json(
        { error: 'No hay conexiones bancarias activas' },
        { status: 400 }
      )
    }

    const client = getEnableBankingClient()
    const results: SyncResult[] = []

    // Calcular fecha desde la cual obtener transacciones
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - daysBack)
    const dateFromStr = dateFrom.toISOString().split('T')[0]

    // Procesar cada conexión
    for (const conn of connections) {
      // Verificar que la sesión no haya expirado
      if (conn.expiresAt && new Date(conn.expiresAt) < new Date()) {
        await db
          .update(bankConnections)
          .set({ status: 'expired' })
          .where(eq(bankConnections.id, conn.id))
        continue
      }

      // Obtener cuentas de la conexión
      let accountsQuery = db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.connectionId, conn.id))

      if (accountId) {
        accountsQuery = db
          .select()
          .from(bankAccounts)
          .where(
            and(
              eq(bankAccounts.connectionId, conn.id),
              eq(bankAccounts.id, accountId)
            )
          )
      }

      const accounts = await accountsQuery

      // Procesar cada cuenta
      for (const account of accounts) {
        const result: SyncResult & { incomesNew: number } = {
          accountId: account.id,
          accountName: account.name || account.iban || 'Cuenta sin nombre',
          transactionsFetched: 0,
          transactionsNew: 0,
          expensesCreated: 0,
          incomesNew: 0,
          errors: [],
        }

        try {
          // Obtener transacciones de Enable Banking
          const transactions = await client.getAllTransactions(
            account.accountUid,
            dateFromStr
          )

          result.transactionsFetched = transactions.length

          // Obtener IDs externos existentes para evitar duplicados
          const existingTxs = await db
            .select({ externalId: bankTransactions.externalId })
            .from(bankTransactions)
            .where(eq(bankTransactions.accountId, account.id))

          const existingIds = new Set(existingTxs.map(t => t.externalId))

          // Filtrar solo transacciones nuevas
          const newTransactions = transactions.filter(
            tx => !existingIds.has(getTransactionExternalId(tx))
          )

          result.transactionsNew = newTransactions.length

          // Procesar cada transacción nueva (gastos E ingresos)
          for (const tx of newTransactions) {
            const externalId = getTransactionExternalId(tx)
            const isExp = isExpense(tx) // amount < 0
            const isIncome = !isExp // amount >= 0

            // Guardar TODAS las transacciones (gastos e ingresos)
            const [savedTx] = await db
              .insert(bankTransactions)
              .values({
                accountId: account.id,
                externalId,
                bookingDate: tx.bookingDate || tx.valueDate || new Date().toISOString().split('T')[0],
                amount: tx.transactionAmount.amount,
                currency: tx.transactionAmount.currency,
                creditorName: tx.creditorName,
                debtorName: tx.debtorName,
                description: tx.remittanceInformationUnstructured || tx.additionalInformation,
                merchantCode: tx.merchantCategoryCode,
                rawData: tx,
                isProcessed: isExp, // Solo marcamos gastos como procesados (creamos expense)
              })
              .returning()

            // Si es un gasto, crear expense automáticamente
            if (isExp) {
              const expenseData = transactionToExpenseData(tx, account.id)

              const [newExpense] = await db
                .insert(expenses)
                .values({
                  householdId: DEFAULT_HOUSEHOLD_ID,
                  amount: expenseData.amount.toString(),
                  description: expenseData.description,
                  category: expenseData.category,
                  date: expenseData.date,
                  paidBy: user.id,
                  source: 'bank_sync',
                  bankTransactionId: savedTx.id,
                })
                .returning()

              // Actualizar referencia en transacción
              await db
                .update(bankTransactions)
                .set({ expenseId: newExpense.id })
                .where(eq(bankTransactions.id, savedTx.id))

              result.expensesCreated++
            }

            // Contar ingresos para el reporte
            if (isIncome) {
              result.incomesNew++
            }
          }

          // Registrar log de sincronización
          await db.insert(bankSyncLog).values({
            accountId: account.id,
            transactionsFetched: result.transactionsFetched,
            transactionsNew: result.transactionsNew,
          })

        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
          result.errors?.push(errorMsg)

          // Registrar error en log
          await db.insert(bankSyncLog).values({
            accountId: account.id,
            transactionsFetched: result.transactionsFetched,
            transactionsNew: result.transactionsNew,
            error: errorMsg,
          })
        }

        results.push(result)
      }

      // Actualizar fecha de última sincronización
      await db
        .update(bankConnections)
        .set({ lastSyncedAt: new Date() })
        .where(eq(bankConnections.id, conn.id))
    }

    // Calcular totales (incluyendo ingresos)
    const totals = {
      transactionsFetched: results.reduce((sum, r) => sum + r.transactionsFetched, 0),
      transactionsNew: results.reduce((sum, r) => sum + r.transactionsNew, 0),
      expensesCreated: results.reduce((sum, r) => sum + r.expensesCreated, 0),
      incomesNew: results.reduce((sum, r) => sum + ((r as { incomesNew?: number }).incomesNew || 0), 0),
      accountsSynced: results.length,
      errors: results.flatMap(r => r.errors || []),
    }

    return NextResponse.json({
      success: true,
      ...totals,
      accounts: results,
    })
  } catch (error) {
    console.error('[Bank Sync] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al sincronizar' },
      { status: 500 }
    )
  }
}
