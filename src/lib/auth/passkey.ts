'use client'

import { createClient } from '@/lib/supabase/client'
import {
  saveCredentials,
  getCredentials,
  hasStoredCredentials,
  clearCredentials,
  clearAllSecureStorage,
  type StoredCredentials
} from './secure-storage'
import { enableBiometric, disableBiometric } from './webauthn'

// ==========================================
// BIOMETRIC AUTH - AUTENTICACIÓN BIOMÉTRICA
// ==========================================
// Usa WebAuthn para verificar biometría localmente
// y credenciales encriptadas para hacer auto-login

// ID del Relying Party (dominio de la app)
const RP_ID = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
const RP_NAME = 'HomeFinance'

// Key para guardar el credential ID en localStorage
const CREDENTIAL_ID_KEY = 'homefinance_webauthn_credential_id'

/**
 * Obtiene el credential ID guardado
 */
function getCredentialId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CREDENTIAL_ID_KEY)
}

/**
 * Guarda el credential ID
 */
function setCredentialId(credentialId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CREDENTIAL_ID_KEY, credentialId)
}

/**
 * Elimina el credential ID
 */
function clearCredentialId(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CREDENTIAL_ID_KEY)
}

/**
 * Genera un challenge aleatorio para WebAuthn
 */
function generateChallenge(): ArrayBuffer {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return array.buffer as ArrayBuffer
}

/**
 * Convierte ArrayBuffer a base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

/**
 * Convierte base64 a ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  return bytes.buffer as ArrayBuffer
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
 * Genera un user ID único para WebAuthn
 */
function generateUserId(): ArrayBuffer {
  // Usar un ID fijo basado en el dispositivo para poder re-usar la credencial
  const deviceId = localStorage.getItem('homefinance_device_id') || crypto.randomUUID()
  localStorage.setItem('homefinance_device_id', deviceId)

  const encoder = new TextEncoder()
  const encoded = encoder.encode(deviceId)
  return encoded.buffer as ArrayBuffer
}

// ==========================================
// REGISTRO DE BIOMETRÍA
// ==========================================

/**
 * Registra una nueva credencial biométrica y guarda las credenciales del usuario.
 *
 * Flujo:
 * 1. Crear credencial WebAuthn (muestra Face ID / Touch ID)
 * 2. Guardar email/password encriptados en IndexedDB
 * 3. Guardar credential ID para futuros logins
 */
export async function registerPasskey(credentials: StoredCredentials): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Verificar que WebAuthn está soportado
    if (!window.PublicKeyCredential) {
      return { success: false, error: 'Tu dispositivo no soporta autenticación biométrica' }
    }

    // Verificar que hay autenticador disponible (Face ID, Touch ID, etc.)
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    if (!available) {
      return { success: false, error: 'No se detectó Face ID, Touch ID u otra biometría' }
    }

    const userId = generateUserId()
    const challenge = generateChallenge()

    // Opciones para crear la credencial
    const createOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        id: RP_ID,
        name: RP_NAME,
      },
      user: {
        id: userId,
        name: credentials.email,
        displayName: `HomeFinance - ${getBiometricDeviceName()}`,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Solo biometría del dispositivo
        userVerification: 'required',        // Requiere Face ID / Touch ID
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none', // No necesitamos attestation para uso local
    }

    // Crear credencial - esto muestra Face ID / Touch ID
    const credential = await navigator.credentials.create({
      publicKey: createOptions
    }) as PublicKeyCredential | null

    if (!credential) {
      return { success: false, error: 'Registro cancelado' }
    }

    // Guardar el credential ID para futuros logins
    const credentialId = arrayBufferToBase64(credential.rawId)
    setCredentialId(credentialId)

    // Guardar las credenciales encriptadas
    await saveCredentials(credentials)

    // Marcar biometría como habilitada
    enableBiometric(credentialId)

    return { success: true }

  } catch (err) {
    console.error('[Passkey] Registration error:', err)

    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') {
        return { success: false, error: 'Autenticación cancelada o no permitida' }
      }
      if (err.name === 'InvalidStateError') {
        return { success: false, error: 'Ya tienes una credencial registrada. Desactívala primero.' }
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

// ==========================================
// LOGIN CON BIOMETRÍA
// ==========================================

/**
 * Verifica biometría y hace login automático con las credenciales guardadas.
 *
 * Flujo:
 * 1. Verificar biometría con WebAuthn (Face ID / Touch ID)
 * 2. Si pasa, recuperar credenciales encriptadas
 * 3. Hacer login con email/password en Supabase
 */
export async function signInWithPasskey(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const credentialId = getCredentialId()

    if (!credentialId) {
      return {
        success: false,
        error: 'No hay biometría configurada. Configúrala primero.'
      }
    }

    // Verificar que hay credenciales guardadas
    const hasCredentials = await hasStoredCredentials()
    if (!hasCredentials) {
      return {
        success: false,
        error: 'No hay credenciales guardadas. Inicia sesión con email primero.'
      }
    }

    const challenge = generateChallenge()

    // Opciones para verificar la credencial
    const getOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: RP_ID,
      allowCredentials: [{
        id: base64ToArrayBuffer(credentialId),
        type: 'public-key',
        transports: ['internal'], // Solo autenticador del dispositivo
      }],
      userVerification: 'required', // Requiere Face ID / Touch ID
      timeout: 60000,
    }

    // Verificar credencial - esto muestra Face ID / Touch ID
    const assertion = await navigator.credentials.get({
      publicKey: getOptions
    }) as PublicKeyCredential | null

    if (!assertion) {
      return { success: false, error: 'Verificación cancelada' }
    }

    // Biometría verificada! Ahora recuperar credenciales y hacer login
    const credentials = await getCredentials()

    if (!credentials) {
      return {
        success: false,
        error: 'No se pudieron recuperar las credenciales'
      }
    }

    // Hacer login en Supabase
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })

    if (signInError) {
      // Si las credenciales ya no son válidas, limpiar todo
      if (signInError.message.includes('Invalid login credentials')) {
        await clearCredentials()
        clearCredentialId()
        disableBiometric()
        return {
          success: false,
          error: 'Las credenciales han cambiado. Inicia sesión con email y reactiva la biometría.'
        }
      }

      return {
        success: false,
        error: translateError(signInError.message)
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

// ==========================================
// ELIMINAR BIOMETRÍA
// ==========================================

/**
 * Elimina la configuración de biometría y credenciales guardadas
 */
export async function removePasskey(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Limpiar credenciales encriptadas
    await clearAllSecureStorage()

    // Limpiar credential ID
    clearCredentialId()

    // Marcar biometría como deshabilitada
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

// ==========================================
// HELPERS
// ==========================================

/**
 * Traduce mensajes de error a español
 */
function translateError(message: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Credenciales inválidas',
    'Email not confirmed': 'Email no confirmado',
    'User not found': 'Usuario no encontrado',
    'Network error': 'Error de conexión',
    'Rate limit exceeded': 'Demasiados intentos. Espera un momento.',
  }

  for (const [key, value] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  return message
}
