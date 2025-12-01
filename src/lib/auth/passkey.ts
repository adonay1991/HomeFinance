'use client'

import { createClient } from '@/lib/supabase/client'
import { enableBiometric, disableBiometric } from './webauthn'

// ==========================================
// FUNCIONES DE PASSKEY / WEBAUTHN
// Usando la API de MFA de Supabase para WebAuthn
// ==========================================

// Factor ID guardado en localStorage
const FACTOR_ID_KEY = 'homefinance_webauthn_factor_id'

/**
 * Obtiene el factor ID guardado
 */
function getFactorId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(FACTOR_ID_KEY)
}

/**
 * Guarda el factor ID
 */
function setFactorId(factorId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(FACTOR_ID_KEY, factorId)
}

/**
 * Elimina el factor ID
 */
function clearFactorId(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(FACTOR_ID_KEY)
}

/**
 * Registra una nueva credencial biométrica (passkey) para el usuario actual.
 * Esto permite verificar la identidad con Face ID / Touch ID / Huella.
 *
 * NOTA: En Supabase, WebAuthn funciona como un segundo factor (MFA).
 * El usuario primero debe estar autenticado con email/password.
 */
export async function registerPasskey(): Promise<{
  success: boolean
  error?: string
  factorId?: string
}> {
  try {
    const supabase = createClient()

    // Verificar que el usuario está autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Debes iniciar sesión primero' }
    }

    // 1. Enrollar el factor WebAuthn
    const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'webauthn',
      friendlyName: `${getBiometricDeviceName()} - HomeFinance`,
    })

    if (enrollError) {
      console.error('[Passkey] Enroll error:', enrollError)
      return {
        success: false,
        error: translatePasskeyError(enrollError.message)
      }
    }

    if (!enrollData) {
      return { success: false, error: 'No se pudo registrar la biometría' }
    }

    // 2. Obtener challenge para la verificación
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrollData.id,
    })

    if (challengeError || !challengeData) {
      console.error('[Passkey] Challenge error:', challengeError)
      return {
        success: false,
        error: translatePasskeyError(challengeError?.message || 'Error al obtener challenge')
      }
    }

    // 3. Crear credencial en el navegador (esto muestra Face ID / Touch ID)
    // NOTA: Esta parte requiere que Supabase devuelva las opciones de WebAuthn
    // Si el servidor no devuelve webauthn options, significa que la feature no está habilitada

    // Verificar si hay opciones de WebAuthn
    const webauthnData = challengeData as { webauthn?: { credential_options?: { publicKey?: PublicKeyCredentialCreationOptions } } }

    if (!webauthnData.webauthn?.credential_options?.publicKey) {
      // WebAuthn no está habilitado en Supabase
      // Desenrollar el factor que acabamos de crear
      await supabase.auth.mfa.unenroll({ factorId: enrollData.id })

      return {
        success: false,
        error: 'WebAuthn no está habilitado en Supabase. Habilítalo en el dashboard.'
      }
    }

    const publicKeyOptions = webauthnData.webauthn.credential_options.publicKey

    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions
    }) as PublicKeyCredential | null

    if (!credential) {
      // Usuario canceló
      await supabase.auth.mfa.unenroll({ factorId: enrollData.id })
      return { success: false, error: 'Registro cancelado' }
    }

    // 4. Verificar la credencial con Supabase
    const response = credential.response as AuthenticatorAttestationResponse

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrollData.id,
      challengeId: challengeData.id,
      code: '', // No se usa para WebAuthn
    })

    if (verifyError) {
      console.error('[Passkey] Verify error:', verifyError)
      await supabase.auth.mfa.unenroll({ factorId: enrollData.id })
      return {
        success: false,
        error: translatePasskeyError(verifyError.message)
      }
    }

    // Éxito - guardar el factor ID y marcar como habilitado
    setFactorId(enrollData.id)
    enableBiometric(credential.id)

    return {
      success: true,
      factorId: enrollData.id
    }

  } catch (err) {
    console.error('[Passkey] Registration error:', err)

    // Manejar errores específicos de WebAuthn
    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') {
        return { success: false, error: 'Autenticación cancelada o no permitida' }
      }
      if (err.name === 'InvalidStateError') {
        return { success: false, error: 'Ya tienes una credencial registrada en este dispositivo' }
      }
      if (err.name === 'NotSupportedError') {
        return { success: false, error: 'Tu dispositivo no soporta esta función' }
      }
    }

    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al registrar biometría'
    }
  }
}

/**
 * Verifica la identidad usando passkey (Face ID / Touch ID / Huella).
 * NOTA: En el modelo de Supabase MFA, esto verifica un segundo factor,
 * no reemplaza el login principal.
 *
 * Para una experiencia de "login con biometría", necesitamos:
 * 1. Guardar las credenciales de forma segura (KeyChain/KeyStore)
 * 2. Usar la biometría para desbloquear esas credenciales
 * 3. Hacer login automático con email/password guardados
 *
 * Esta función es un placeholder para cuando Supabase soporte
 * passkeys como método de login principal.
 */
export async function signInWithPasskey(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const factorId = getFactorId()

    if (!factorId) {
      return {
        success: false,
        error: 'No hay biometría configurada. Configúrala primero.'
      }
    }

    const supabase = createClient()

    // Verificar sesión actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Si no hay sesión, no podemos usar MFA
      // Necesitaríamos primero hacer login con email/password
      return {
        success: false,
        error: 'Inicia sesión primero con email y contraseña'
      }
    }

    // Obtener challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    })

    if (challengeError || !challengeData) {
      return {
        success: false,
        error: translatePasskeyError(challengeError?.message || 'Error al verificar')
      }
    }

    // Verificar si hay opciones de WebAuthn
    const webauthnData = challengeData as { webauthn?: { credential_options?: { publicKey?: PublicKeyCredentialRequestOptions } } }

    if (!webauthnData.webauthn?.credential_options?.publicKey) {
      return {
        success: false,
        error: 'WebAuthn no está habilitado'
      }
    }

    // Obtener credencial del navegador (muestra Face ID / Touch ID)
    const credential = await navigator.credentials.get({
      publicKey: webauthnData.webauthn.credential_options.publicKey
    }) as PublicKeyCredential | null

    if (!credential) {
      return { success: false, error: 'Verificación cancelada' }
    }

    // Verificar con Supabase
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: '', // No se usa para WebAuthn
    })

    if (verifyError) {
      return {
        success: false,
        error: translatePasskeyError(verifyError.message)
      }
    }

    return { success: true }

  } catch (err) {
    console.error('[Passkey] Authentication error:', err)

    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') {
        return { success: false, error: 'Autenticación cancelada o no permitida' }
      }
      if (err.name === 'InvalidStateError') {
        return { success: false, error: 'No se encontró credencial válida' }
      }
    }

    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al autenticar'
    }
  }
}

/**
 * Elimina la configuración de passkey del usuario
 */
export async function removePasskey(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const factorId = getFactorId()

    if (factorId) {
      const supabase = createClient()
      await supabase.auth.mfa.unenroll({ factorId })
    }

    clearFactorId()
    disableBiometric()

    return { success: true }

  } catch (err) {
    console.error('[Passkey] Remove error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al eliminar biometría'
    }
  }
}

/**
 * Obtiene un nombre descriptivo del dispositivo
 */
function getBiometricDeviceName(): string {
  if (typeof window === 'undefined') return 'Dispositivo'

  const ua = navigator.userAgent.toLowerCase()

  if (/iphone/.test(ua)) return 'iPhone'
  if (/ipad/.test(ua)) return 'iPad'
  if (/android/.test(ua)) return 'Android'
  if (/macintosh/.test(ua)) return 'Mac'
  if (/windows/.test(ua)) return 'Windows'

  return 'Dispositivo'
}

/**
 * Traduce mensajes de error de Supabase/WebAuthn a español
 */
function translatePasskeyError(message: string): string {
  const errorMap: Record<string, string> = {
    'User not found': 'Usuario no encontrado',
    'Invalid credentials': 'Credencial inválida',
    'Passkey not found': 'No se encontró la credencial biométrica',
    'Registration failed': 'No se pudo registrar la biometría',
    'Authentication failed': 'No se pudo autenticar',
    'Rate limit exceeded': 'Demasiados intentos. Espera un momento.',
    'Network error': 'Error de conexión. Verifica tu internet.',
    'Factor not found': 'Biometría no configurada',
    'MFA not enabled': 'MFA no está habilitado',
    'webauthn not enabled': 'WebAuthn no está habilitado en Supabase',
  }

  for (const [key, value] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  return message
}
