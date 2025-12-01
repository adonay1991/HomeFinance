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
  const { searchParams, origin, hash } = new URL(request.url)

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

  // Caso 1: Flujo PKCE con código
  if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError && data.session) {
      // Detectar si es recovery usando AMR (Authentication Methods Reference)
      // Supabase NO pasa type=recovery en el redirect después del PKCE exchange,
      // pero sí incluye el método de autenticación en session.user.amr
      // Nota: amr existe en runtime pero no está en los tipos de Supabase
      const user = data.session.user as { amr?: Array<{ method: string }> }
      const amr = user.amr || []
      const isRecoveryByAMR = amr.some((m) => m.method === 'recovery')

      // También verificar por si el type viene en la URL (para otros flujos)
      const isRecoveryByType = type === 'recovery' || type === 'email'

      if (isRecoveryByAMR || isRecoveryByType) {
        console.log('[Auth Callback] Recovery flow detected via AMR:', { amr, type })
        return NextResponse.redirect(`${origin}/reset-password?mode=update`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[Auth Callback] Code exchange error:', exchangeError?.message)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError?.message || 'Error de autenticación')}`)
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
        console.log('[Auth Callback] Recovery OTP verified, redirecting to reset-password')
        return NextResponse.redirect(`${origin}/reset-password?mode=update`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[Auth Callback] Token verification error:', verifyError.message)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(verifyError.message)}`)
  }

  // Caso 3: Si solo viene type=recovery sin code ni token_hash
  // Puede ser que los tokens vengan en el hash fragment (client-side)
  // En ese caso, redirigir a reset-password para que el cliente los procese
  if (type === 'recovery') {
    console.log('[Auth Callback] Recovery type without code, redirecting to reset-password')
    return NextResponse.redirect(`${origin}/reset-password?mode=update`)
  }

  // Si no hay code ni token_hash, algo salió mal
  console.error('[Auth Callback] No code or token_hash provided')
  return NextResponse.redirect(`${origin}/login?error=missing_auth_params`)
}
