'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ==========================================
// PASSWORD RECOVERY LISTENER
// ==========================================
// Este componente escucha los eventos de autenticación de Supabase
// y detecta cuando el usuario llega con un token de recovery.
// Cuando detecta PASSWORD_RECOVERY, redirige a /reset-password.

export function PasswordRecoveryListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Escuchar eventos de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[PasswordRecoveryListener] Auth event:', event)

        // Si es un evento de PASSWORD_RECOVERY, redirigir a reset-password
        if (event === 'PASSWORD_RECOVERY') {
          console.log('[PasswordRecoveryListener] Redirecting to reset-password')
          router.push('/reset-password?mode=update')
        }
      }
    )

    // También verificar si hay tokens de recovery en el hash al montar
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash.includes('type=recovery')) {
        console.log('[PasswordRecoveryListener] Recovery hash detected, redirecting')
        router.push('/reset-password?mode=update')
      }
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  // Este componente no renderiza nada
  return null
}
