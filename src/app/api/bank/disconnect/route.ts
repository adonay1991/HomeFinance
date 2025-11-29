import { NextRequest, NextResponse } from 'next/server'
import { getEnableBankingClient } from '@/lib/enablebanking/client'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { db, bankConnections } from '@/lib/db/client'
import { eq, and } from 'drizzle-orm'

// ==========================================
// DELETE /api/bank/disconnect
// Desconecta una conexión bancaria
// ==========================================

export async function DELETE(request: NextRequest) {
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

    // Obtener connectionId del body o query
    const { searchParams } = new URL(request.url)
    let connectionId = searchParams.get('connectionId')

    if (!connectionId) {
      const body = await request.json().catch(() => ({}))
      connectionId = body.connectionId
    }

    if (!connectionId) {
      return NextResponse.json(
        { error: 'connectionId es requerido' },
        { status: 400 }
      )
    }

    // Verificar que la conexión pertenece al usuario
    const [connection] = await db
      .select()
      .from(bankConnections)
      .where(
        and(
          eq(bankConnections.id, connectionId),
          eq(bankConnections.userId, user.id)
        )
      )

    if (!connection) {
      return NextResponse.json(
        { error: 'Conexión no encontrada' },
        { status: 404 }
      )
    }

    // Intentar revocar la sesión en Enable Banking
    try {
      const client = getEnableBankingClient()
      await client.deleteSession(connection.sessionId)
    } catch (err) {
      // Si falla la revocación, continuar de todos modos
      // (la sesión puede haber expirado ya)
      console.warn('[Bank Disconnect] Error revocando sesión:', err)
    }

    // Eliminar conexión de la DB (cascade eliminará cuentas, transacciones, etc.)
    await db
      .delete(bankConnections)
      .where(eq(bankConnections.id, connectionId))

    return NextResponse.json({
      success: true,
      message: 'Conexión bancaria eliminada correctamente',
    })
  } catch (error) {
    console.error('[Bank Disconnect] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al desconectar' },
      { status: 500 }
    )
  }
}
