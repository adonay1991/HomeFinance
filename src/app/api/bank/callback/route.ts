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

    console.log('[Bank Callback] Session created:', JSON.stringify(session, null, 2))
    console.log('[Bank Callback] validUntil raw value:', session.validUntil, 'type:', typeof session.validUntil)

    // Parsear fecha de expiración de forma robusta
    // Enable Banking puede devolver formatos como:
    // - "2025-02-27T12:00:00.000000+00:00" (RFC3339 con microsegundos)
    // - "2025-02-27T12:00:00Z" (ISO 8601)
    // - "2025-02-27" (solo fecha)
    let expiresAt: Date | null = null
    if (session.validUntil) {
      try {
        // Normalizar formato: remover microsegundos excesivos si existen
        let dateString = session.validUntil
        // Convertir "+00:00" a "Z" para mejor compatibilidad
        dateString = dateString.replace(/\+00:00$/, 'Z')
        // Reducir microsegundos a milisegundos (de .000000 a .000)
        dateString = dateString.replace(/\.(\d{6})/, (_, ms) => '.' + ms.slice(0, 3))

        const parsed = new Date(dateString)
        if (!isNaN(parsed.getTime())) {
          expiresAt = parsed
          console.log('[Bank Callback] Parsed expiresAt:', expiresAt.toISOString())
        } else {
          console.warn('[Bank Callback] Could not parse validUntil after normalization:', dateString)
        }
      } catch (dateError) {
        console.warn('[Bank Callback] Error parsing validUntil:', session.validUntil, dateError)
      }
    }

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
