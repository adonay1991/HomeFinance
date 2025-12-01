import { createClient } from '@supabase/supabase-js'

// ==========================================
// CLIENTE ADMIN DE SUPABASE
// ==========================================
// Este cliente usa la service_role key que tiene
// permisos completos para operaciones admin como:
// - Actualizar contraseñas de usuarios
// - Bypass de RLS
//
// SOLO USAR EN SERVER ACTIONS, NUNCA EXPONER AL CLIENTE

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
