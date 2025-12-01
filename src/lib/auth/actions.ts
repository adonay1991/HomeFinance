'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// ==========================================
// SERVER ACTIONS PARA AUTENTICACIÓN
// Login con email y contraseña
// ==========================================

/**
 * Inicia sesión con email y contraseña
 */
export async function signInWithPassword(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Mensajes de error más amigables
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Email o contraseña incorrectos' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.' }
    }
    return { error: error.message }
  }

  redirect('/')
}

/**
 * Registra un nuevo usuario con email y contraseña
 */
export async function signUp(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' }
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  const supabase = await createClient()

  // Determinar la URL base según el entorno
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
    || 'http://localhost:3000'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: {
        name: name || email.split('@')[0],
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Este email ya está registrado. Intenta iniciar sesión.' }
    }
    return { error: error.message }
  }

  // Verificar si requiere confirmación de email
  if (data.user && !data.session) {
    return {
      success: true,
      requiresConfirmation: true,
      message: 'Te hemos enviado un email de confirmación. Revisa tu bandeja de entrada.'
    }
  }

  // Si no requiere confirmación, redirigir al dashboard
  redirect('/')
}

/**
 * Cierra la sesión actual
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

/**
 * Genera y envía un código OTP de 6 dígitos al email para restablecer la contraseña.
 * Usamos Resend para enviar el email con el código.
 */
export async function sendPasswordResetOtp(email: string) {
  if (!email) {
    return { error: 'Email es requerido' }
  }

  const supabase = await createClient()
  const normalizedEmail = email.toLowerCase().trim()

  // Verificar que el usuario existe en auth.users via nuestra tabla users
  const { data: userData } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', normalizedEmail)
    .single()

  // Siempre devolver éxito para no revelar si el email existe
  if (!userData) {
    console.log('[Auth] Reset OTP requested for non-existent email:', normalizedEmail)
    return {
      success: true,
      message: 'Si el email está registrado, recibirás un código de 6 dígitos.'
    }
  }

  // Generar código de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

  // Invalidar códigos anteriores para este email
  await supabase
    .from('password_reset_codes')
    .delete()
    .eq('email', normalizedEmail)

  // Guardar nuevo código
  const { error: insertError } = await supabase
    .from('password_reset_codes')
    .insert({
      email: normalizedEmail,
      code,
      expires_at: expiresAt.toISOString(),
    })

  if (insertError) {
    console.error('[Auth] Error saving reset code:', insertError)
    return { error: 'Error al generar el código. Intenta de nuevo.' }
  }

  // Enviar email con Resend
  const { sendPasswordResetEmail } = await import('@/lib/email/resend')
  const emailResult = await sendPasswordResetEmail(normalizedEmail, code)

  if (!emailResult.success) {
    console.error('[Auth] Error sending reset email:', emailResult.error)
    return { error: 'Error al enviar el email. Intenta de nuevo.' }
  }

  console.log('[Auth] Reset code sent to:', normalizedEmail)

  return {
    success: true,
    message: 'Te hemos enviado un código de 6 dígitos a tu email.'
  }
}

/**
 * Verifica el código OTP y establece la nueva contraseña directamente.
 * Usa la Admin API de Supabase para cambiar la contraseña sin necesidad de links.
 */
export async function verifyOtpAndSetPassword(
  email: string,
  otp: string,
  password: string,
  confirmPassword: string
) {
  if (!email || !otp) {
    return { error: 'Email y código son requeridos' }
  }

  if (!password) {
    return { error: 'La contraseña es requerida' }
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden' }
  }

  const supabase = await createClient()
  const normalizedEmail = email.toLowerCase().trim()

  // Buscar código válido
  const { data: codeData, error: codeError } = await supabase
    .from('password_reset_codes')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('code', otp)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (codeError || !codeData) {
    console.error('[Auth] Invalid or expired code:', { email: normalizedEmail, otp, error: codeError })
    return { error: 'Código inválido o expirado. Solicita uno nuevo.' }
  }

  // Obtener el user_id de auth.users
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .single()

  if (!userData) {
    return { error: 'Usuario no encontrado.' }
  }

  // Usar Admin API para actualizar la contraseña directamente
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = createAdminClient()

  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
    userData.id,
    { password }
  )

  if (updateError) {
    console.error('[Auth] Error updating password:', updateError)
    return { error: 'Error al actualizar la contraseña. Intenta de nuevo.' }
  }

  // Marcar código como usado
  await supabase
    .from('password_reset_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', codeData.id)

  console.log('[Auth] Password updated successfully for:', normalizedEmail)

  return {
    success: true,
    message: '¡Contraseña actualizada! Ya puedes iniciar sesión.'
  }
}

/**
 * Obtiene el usuario actual
 */
export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Obtiene el perfil del usuario actual
 */
export async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

// ==========================================
// FUNCIONES LEGACY (mantener por compatibilidad)
// ==========================================

/**
 * @deprecated Usar signInWithPassword en su lugar
 */
export async function signInWithMagicLink(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email es requerido' }
  }

  const supabase = await createClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
    || 'http://localhost:3000'

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Revisa tu email para el enlace de acceso' }
}

/**
 * @deprecated Solo para desarrollo
 */
export async function signInWithDevCredentials() {
  if (process.env.NODE_ENV !== 'development') {
    return { error: 'Dev login solo disponible en desarrollo' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.DEV_USER_EMAIL || 'dev@test.com',
    password: process.env.DEV_USER_PASSWORD || 'devpass123',
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}
