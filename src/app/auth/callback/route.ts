import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ==========================================
// CALLBACK PARA AUTH (Magic Link, Recovery, etc.)
// ==========================================
// Esta ruta maneja la redirección después de que
// el usuario hace click en enlaces de email.
// Supabase puede enviar:
// - `code`: para flujo PKCE (intercambiar por sesión)
// - `token_hash` + `type`: para verificación de email
// - `error`: si hubo un problema
// - `type=recovery`: para reset de contraseña

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'signup' | 'recovery' | 'invite' | 'magiclink' | null
  const next = searchParams.get('next') ?? '/'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Si hay error de Supabase, redirigir al login
  if (error) {
    console.error('[Auth Callback] Error:', error, error_description)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error)}`)
  }

  const supabase = await createClient()

  // Caso 1: Flujo PKCE con código
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      // Si es recovery, redirigir a la página de establecer contraseña
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password?mode=update`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[Auth Callback] Code exchange error:', exchangeError.message)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
  }

  // Caso 2: Verificación con token_hash (email verification, magic link, recovery)
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    })

    if (!verifyError) {
      // Si es recovery, redirigir a la página de establecer contraseña
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password?mode=update`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[Auth Callback] Token verification error:', verifyError.message)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(verifyError.message)}`)
  }

  // Si no hay code ni token_hash, algo salió mal
  console.error('[Auth Callback] No code or token_hash provided')
  return NextResponse.redirect(`${origin}/login?error=missing_auth_params`)
}
