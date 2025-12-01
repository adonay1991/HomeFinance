'use client'

import { useState, useEffect, useCallback } from 'react'
import { BiometricPrompt } from './biometric-prompt'
import { shouldShowBiometricPrompt } from '@/lib/auth/webauthn'
import type { StoredCredentials } from '@/lib/auth/secure-storage'

// ==========================================
// BIOMETRIC ACTIVATION HANDLER
// Componente que maneja cuándo mostrar el prompt
// de activación de Face ID / Huella
// ==========================================

// Key para saber si ya mostramos el prompt en esta sesión
const SESSION_PROMPT_KEY = 'homefinance_biometric_prompt_shown'
// Key para guardar credenciales temporalmente (para mostrar después del redirect)
const TEMP_CREDENTIALS_KEY = 'homefinance_temp_credentials'

/**
 * Guarda credenciales temporalmente para mostrar el prompt después del redirect
 * Las credenciales se eliminan automáticamente después de usarse o en 5 minutos
 */
export function saveTempCredentials(credentials: StoredCredentials): void {
  if (typeof window === 'undefined') return

  const data = {
    credentials,
    timestamp: Date.now(),
  }
  sessionStorage.setItem(TEMP_CREDENTIALS_KEY, JSON.stringify(data))
}

/**
 * Obtiene y elimina las credenciales temporales
 */
function getTempCredentials(): StoredCredentials | null {
  if (typeof window === 'undefined') return null

  const data = sessionStorage.getItem(TEMP_CREDENTIALS_KEY)
  if (!data) return null

  // Eliminar inmediatamente después de leer
  sessionStorage.removeItem(TEMP_CREDENTIALS_KEY)

  try {
    const parsed = JSON.parse(data) as { credentials: StoredCredentials; timestamp: number }

    // Verificar que no han pasado más de 5 minutos
    const fiveMinutes = 5 * 60 * 1000
    if (Date.now() - parsed.timestamp > fiveMinutes) {
      return null
    }

    return parsed.credentials
  } catch {
    return null
  }
}

export function BiometricActivationHandler() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [credentials, setCredentials] = useState<StoredCredentials | null>(null)

  const checkAndShowPrompt = useCallback(async () => {
    // No mostrar si ya lo mostramos en esta sesión del navegador
    const alreadyShown = sessionStorage.getItem(SESSION_PROMPT_KEY)
    if (alreadyShown) return

    // Verificar si hay credenciales temporales (del login reciente)
    const tempCreds = getTempCredentials()
    if (!tempCreds) {
      // No hay credenciales, no podemos mostrar el prompt
      return
    }

    // Verificar si debemos mostrar el prompt
    const should = await shouldShowBiometricPrompt()

    if (should) {
      // Pequeño delay para que la app se cargue primero
      setTimeout(() => {
        setCredentials(tempCreds)
        setShowPrompt(true)
        // Marcar que ya mostramos el prompt en esta sesión
        sessionStorage.setItem(SESSION_PROMPT_KEY, 'true')
      }, 1500)
    }
  }, [])

  useEffect(() => {
    checkAndShowPrompt()
  }, [checkAndShowPrompt])

  return (
    <BiometricPrompt
      open={showPrompt}
      onOpenChange={setShowPrompt}
      credentials={credentials}
      onSuccess={() => {
        // El prompt se cierra automáticamente
        // Las credenciales ya fueron guardadas de forma segura
        setCredentials(null)
      }}
      onDismiss={() => {
        // El prompt se cierra automáticamente
        // Limpiar credenciales temporales por seguridad
        setCredentials(null)
      }}
    />
  )
}
