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
