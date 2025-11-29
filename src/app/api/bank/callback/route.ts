import { NextRequest, NextResponse } from 'next/server'
import { getEnableBankingClient } from '@/lib/enablebanking/client'
import { db, bankAuthStates, bankConnections, bankAccounts } from '@/lib/db/client'
import { eq, and, gt } from 'drizzle-orm'

// ==========================================
// GET /api/bank/callback
// Procesa el callback después de autorización bancaria
// ==========================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // URL de redirección al perfil con mensajes
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const redirectBase = `${siteUrl}/profile`

  // Si hay error del banco
  if (error) {
    console.error('[Bank Callback] Error from bank:', error)
    return NextResponse.redirect(
      `${redirectBase}?bank_error=${encodeURIComponent(error)}`
    )
  }

  // Validar parámetros requeridos
  if (!code || !state) {
    return NextResponse.redirect(
      `${redirectBase}?bank_error=${encodeURIComponent('Parámetros inválidos en callback')}`
    )
  }

  try {
    // Buscar el estado en DB
    const [authState] = await db
      .select()
      .from(bankAuthStates)
      .where(
        and(
          eq(bankAuthStates.state, state),
          gt(bankAuthStates.expiresAt, new Date())
        )
      )

    if (!authState) {
      return NextResponse.redirect(
        `${redirectBase}?bank_error=${encodeURIComponent('Estado de autorización inválido o expirado')}`
      )
    }

    // Crear sesión con Enable Banking
    const client = getEnableBankingClient()
    const session = await client.createSession(code)

    // Calcular fecha de expiración de la sesión
    const expiresAt = new Date(session.validUntil)

    // Guardar conexión en DB
    const [connection] = await db
      .insert(bankConnections)
      .values({
        userId: authState.userId,
        sessionId: session.sessionId,
        bankName: authState.bankName,
        country: authState.country || 'ES',
        status: 'active',
        expiresAt,
      })
      .returning()

    // Guardar cuentas
    if (session.accounts.length > 0) {
      await db.insert(bankAccounts).values(
        session.accounts.map(acc => ({
          connectionId: connection.id,
          accountUid: acc.uid,
          iban: acc.iban,
          name: acc.name || acc.ownerName,
          currency: acc.currency || 'EUR',
          accountType: acc.accountType,
        }))
      )
    }

    // Eliminar estado de auth (ya no es necesario)
    await db
      .delete(bankAuthStates)
      .where(eq(bankAuthStates.id, authState.id))

    // Redirigir a perfil con éxito
    return NextResponse.redirect(
      `${redirectBase}?bank_connected=true&accounts=${session.accounts.length}`
    )
  } catch (err) {
    console.error('[Bank Callback] Error:', err)
    return NextResponse.redirect(
      `${redirectBase}?bank_error=${encodeURIComponent(
        err instanceof Error ? err.message : 'Error al procesar autorización'
      )}`
    )
  }
}
