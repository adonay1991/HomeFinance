'use client'

// ==========================================
// UTILIDADES WEBAUTHN / BIOMETRÍA
// Para Face ID (iOS) y huella dactilar (Android)
// ==========================================

// Keys de localStorage para persistencia
export const BIOMETRIC_KEYS = {
  ENABLED: 'homefinance_biometric_enabled',
  DISMISSED: 'homefinance_biometric_dismissed',
  LAST_EMAIL: 'homefinance_last_email',
  CREDENTIAL_ID: 'homefinance_credential_id',
} as const

/**
 * Verifica si el navegador soporta WebAuthn
 * WebAuthn es la API que permite usar Face ID / Touch ID / Huella
 */
export function isWebAuthnSupported(): boolean {
  if (typeof window === 'undefined') return false

  return !!(
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function'
  )
}

/**
 * Verifica si el dispositivo soporta autenticación de plataforma
 * (Face ID, Touch ID, huella dactilar integrada)
 * vs autenticadores externos (llaves de seguridad USB)
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/**
 * Detecta el tipo de biometría disponible basándose en el dispositivo
 * Esto es una aproximación basada en user agent
 */
export function getBiometricType(): 'face-id' | 'touch-id' | 'fingerprint' | 'windows-hello' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown'

  const ua = navigator.userAgent.toLowerCase()

  // iOS con Face ID (iPhone X+, iPad Pro)
  if (/iphone|ipad/.test(ua)) {
    // iPhones con Face ID: X, XS, XR, 11, 12, 13, 14, 15, 16...
    // Aproximación: si es iOS y tiene pantalla grande, probablemente Face ID
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    const isNotch = Math.max(screenWidth, screenHeight) >= 812 // iPhone X+

    // iPad Pro también tiene Face ID
    if (/ipad/.test(ua)) {
      return 'face-id' // iPads modernos tienen Face ID
    }

    return isNotch ? 'face-id' : 'touch-id'
  }

  // Android
  if (/android/.test(ua)) {
    return 'fingerprint'
  }

  // macOS
  if (/macintosh|mac os x/.test(ua)) {
    return 'touch-id'
  }

  // Windows
  if (/windows/.test(ua)) {
    return 'windows-hello'
  }

  return 'unknown'
}

/**
 * Obtiene el nombre amigable del tipo de biometría
 */
export function getBiometricName(): string {
  const type = getBiometricType()

  switch (type) {
    case 'face-id':
      return 'Face ID'
    case 'touch-id':
      return 'Touch ID'
    case 'fingerprint':
      return 'Huella dactilar'
    case 'windows-hello':
      return 'Windows Hello'
    default:
      return 'Biometría'
  }
}

/**
 * Verifica si hay una credencial biométrica guardada para este dispositivo
 */
export function hasBiometricCredential(): boolean {
  if (typeof window === 'undefined') return false

  const credentialId = localStorage.getItem(BIOMETRIC_KEYS.CREDENTIAL_ID)
  const enabled = localStorage.getItem(BIOMETRIC_KEYS.ENABLED)

  return !!(credentialId && enabled === 'true')
}

/**
 * Verifica si el usuario ha descartado el prompt de biometría
 */
export function isBiometricDismissed(): boolean {
  if (typeof window === 'undefined') return false

  return localStorage.getItem(BIOMETRIC_KEYS.DISMISSED) === 'true'
}

/**
 * Guarda el email del último login (para pre-llenar)
 */
export function saveLastEmail(email: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(BIOMETRIC_KEYS.LAST_EMAIL, email)
}

/**
 * Obtiene el email del último login
 */
export function getLastEmail(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(BIOMETRIC_KEYS.LAST_EMAIL)
}

/**
 * Marca la biometría como activada y guarda el credential ID
 */
export function enableBiometric(credentialId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(BIOMETRIC_KEYS.ENABLED, 'true')
  localStorage.setItem(BIOMETRIC_KEYS.CREDENTIAL_ID, credentialId)
  localStorage.removeItem(BIOMETRIC_KEYS.DISMISSED)
}

/**
 * Desactiva la biometría
 */
export function disableBiometric(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(BIOMETRIC_KEYS.ENABLED)
  localStorage.removeItem(BIOMETRIC_KEYS.CREDENTIAL_ID)
}

/**
 * Marca el prompt de biometría como descartado
 */
export function dismissBiometricPrompt(permanently: boolean = false): void {
  if (typeof window === 'undefined') return

  if (permanently) {
    localStorage.setItem(BIOMETRIC_KEYS.DISMISSED, 'true')
  }
}

/**
 * Verifica si debemos mostrar el prompt de activación de biometría
 * Condiciones:
 * - WebAuthn soportado
 * - Autenticador de plataforma disponible
 * - No tiene biometría activada
 * - No ha descartado el prompt permanentemente
 */
export async function shouldShowBiometricPrompt(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false

  const platformAvailable = await isPlatformAuthenticatorAvailable()
  if (!platformAvailable) return false

  if (hasBiometricCredential()) return false
  if (isBiometricDismissed()) return false

  return true
}

/**
 * Limpia todos los datos de biometría (para debugging/reset)
 */
export function clearBiometricData(): void {
  if (typeof window === 'undefined') return

  Object.values(BIOMETRIC_KEYS).forEach(key => {
    localStorage.removeItem(key)
  })
}
