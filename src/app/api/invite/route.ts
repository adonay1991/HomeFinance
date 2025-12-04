import { NextRequest, NextResponse } from 'next/server'
import { createInvitation } from '@/lib/actions/invitations'

// ==========================================
// API ROUTE: POST /api/invite
// Endpoint alternativo para crear invitaciones
// Útil para integraciones externas o webhooks
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email es requerido' },
        { status: 400 }
      )
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Formato de email inválido' },
        { status: 400 }
      )
    }

    // Usar el server action existente
    const result = await createInvitation(email)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[API /api/invite] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
