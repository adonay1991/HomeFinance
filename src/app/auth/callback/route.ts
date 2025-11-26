import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ==========================================
// CALLBACK PARA MAGIC LINK
// ==========================================
// Esta ruta maneja la redirección después de que
// el usuario hace click en el magic link del email.
// Intercambia el código por una sesión y redirige
// al dashboard.

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Éxito: redirigir al dashboard o a la ruta especificada
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Error: redirigir al login con mensaje de error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
