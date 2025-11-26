'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// ==========================================
// SERVER ACTIONS PARA AUTENTICACIÓN
// ==========================================

export async function signInWithMagicLink(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email es requerido' }
  }

  const supabase = await createClient()

  // Determinar la URL base según el entorno
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
    || 'http://localhost:3000'

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // URL a la que redirige después de hacer click en el magic link
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Revisa tu email para el enlace de acceso' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

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
