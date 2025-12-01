'use client'

import { useState, useEffect } from 'react'
import { BiometricPrompt } from './biometric-prompt'
import { shouldShowBiometricPrompt } from '@/lib/auth/webauthn'

// ==========================================
// BIOMETRIC ACTIVATION HANDLER
// Componente que maneja cuándo mostrar el prompt
// de activación de Face ID / Huella
// ==========================================

// Key para saber si ya mostramos el prompt en esta sesión
const SESSION_PROMPT_KEY = 'homefinance_biometric_prompt_shown'

export function BiometricActivationHandler() {
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    async function checkAndShowPrompt() {
      // No mostrar si ya lo mostramos en esta sesión del navegador
      const alreadyShown = sessionStorage.getItem(SESSION_PROMPT_KEY)
      if (alreadyShown) return

      // Verificar si debemos mostrar el prompt
      const should = await shouldShowBiometricPrompt()

      if (should) {
        // Pequeño delay para que la app se cargue primero
        setTimeout(() => {
          setShowPrompt(true)
          // Marcar que ya mostramos el prompt en esta sesión
          sessionStorage.setItem(SESSION_PROMPT_KEY, 'true')
        }, 1500)
      }
    }

    checkAndShowPrompt()
  }, [])

  return (
    <BiometricPrompt
      open={showPrompt}
      onOpenChange={setShowPrompt}
      onSuccess={() => {
        // El prompt se cierra automáticamente
        // Opcionalmente podríamos mostrar un toast de éxito
      }}
      onDismiss={() => {
        // El prompt se cierra automáticamente
      }}
    />
  )
}
