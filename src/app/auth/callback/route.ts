import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ==========================================
// CALLBACK PARA AUTH (Email verification, etc.)
// ==========================================
// Esta ruta maneja la redirección después de que
// el usuario hace click en enlaces de email.
//
// Nota: El flujo de reset password ahora usa OTP
// directamente en /reset-password, sin redirects.

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email' | null
  const next = searchParams.get('next') ?? '/'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  console.log('[Auth Callback] Params:', { code: !!code, token_hash: !!token_hash, type, next, error })

  // Si hay error de Supabase, redirigir al login
  if (error) {
    console.error('[Auth Callback] Error:', error, error_description)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error)}`)
  }

  const supabase = await createClient()

  // Caso 1: Flujo PKCE con código (email verification, signup confirmation)
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[Auth Callback] Code exchange error:', exchangeError?.message)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError?.message || 'Error de autenticación')}`)
  }

  // Caso 2: Verificación con token_hash (email verification)
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    })

    if (!verifyError) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[Auth Callback] Token verification error:', verifyError.message)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(verifyError.message)}`)
  }

  // Si no hay code ni token_hash, algo salió mal
  console.error('[Auth Callback] No code or token_hash provided')
  return NextResponse.redirect(`${origin}/login?error=missing_auth_params`)
}
