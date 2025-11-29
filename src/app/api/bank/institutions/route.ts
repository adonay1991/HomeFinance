import { NextRequest, NextResponse } from 'next/server'
import { getEnableBankingClient } from '@/lib/enablebanking/client'

// ==========================================
// GET /api/bank/institutions
// Lista las instituciones bancarias disponibles
// Este endpoint es público (solo lista bancos, no datos sensibles)
// ==========================================

export async function GET(request: NextRequest) {
  try {
    // Obtener país del query param (default: ES)
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country') || 'ES'

    // Obtener instituciones de Enable Banking
    const client = getEnableBankingClient()
    const institutions = await client.getInstitutions(country.toUpperCase())

    // Debug: log la respuesta raw
    console.log('[Bank Institutions] Raw response:', JSON.stringify(institutions[0], null, 2))

    // Mapear a formato simplificado
    // Enable Banking usa "name" como identificador único del banco
    const mapped = institutions.map(inst => ({
      name: inst.name,
      fullName: inst.name, // En Enable Banking, "name" es el identificador único
      country: inst.country,
      logo: inst.logo,
      maxDays: inst.transactionTotalDays,
    }))

    return NextResponse.json({
      institutions: mapped,
      country,
      count: mapped.length,
    })
  } catch (error) {
    console.error('[Bank Institutions] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    )
  }
}
