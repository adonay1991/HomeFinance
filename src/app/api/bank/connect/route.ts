import { NextRequest, NextResponse } from 'next/server'
import { getEnableBankingClient } from '@/lib/enablebanking/client'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { db, bankAuthStates } from '@/lib/db/client'
import { randomBytes } from 'crypto'

// ==========================================
// POST /api/bank/connect
// Inicia el proceso de conexión bancaria
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

    // Obtener parámetros del body
    const body = await request.json()
    const { bankName, country = 'ES' } = body

    if (!bankName) {
      return NextResponse.json(
        { error: 'bankName es requerido' },
        { status: 400 }
      )
    }

    // Generar estado único para CSRF protection
    const state = randomBytes(32).toString('hex')

    // Calcular expiración (10 minutos)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    // Guardar estado en DB
    await db.insert(bankAuthStates).values({
      userId: user.id,
      state,
      bankName,
      country,
      expiresAt,
    })

    // Construir URL de callback
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUrl = `${appUrl}/api/bank/callback`

    // Obtener IP del usuario (para algunos bancos que lo requieren)
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip')

    // Iniciar autorización con Enable Banking
    const client = getEnableBankingClient()
    const authResponse = await client.startAuth({
      aspsp: bankName,
      country: country.toUpperCase(),
      state,
      redirectUrl,
      access: {
        balances: true,
        transactions: true,
      },
      psuIpAddress: ip || undefined,
      psuType: 'personal',
    })

    return NextResponse.json({
      authUrl: authResponse.url,
      state,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('[Bank Connect] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al iniciar conexión' },
      { status: 500 }
    )
  }
}
