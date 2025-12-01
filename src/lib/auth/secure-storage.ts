'use client'

// ==========================================
// SECURE STORAGE - ALMACENAMIENTO SEGURO
// ==========================================
// Almacena credenciales encriptadas usando Web Crypto API + IndexedDB
// Las credenciales solo se pueden desencriptar con biometría (WebAuthn)

const DB_NAME = 'homefinance_secure'
const DB_VERSION = 1
const STORE_NAME = 'credentials'
const ENCRYPTION_KEY_NAME = 'homefinance_encryption_key'

// ==========================================
// INDEXEDDB HELPERS
// ==========================================

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

async function dbGet<T>(key: string): Promise<T | null> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result?.value ?? null)
  })
}

async function dbSet(key: string, value: unknown): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put({ id: key, value })

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

async function dbDelete(key: string): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// ==========================================
// WEB CRYPTO HELPERS
// ==========================================

/**
 * Genera una clave de encriptación AES-GCM
 */
async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable para poder guardarla
    ['encrypt', 'decrypt']
  )
}

/**
 * Exporta una CryptoKey a formato almacenable
 */
async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
}

/**
 * Importa una CryptoKey desde formato almacenado
 */
async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Obtiene o crea la clave de encriptación
 */
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  const existingKey = await dbGet<string>(ENCRYPTION_KEY_NAME)

  if (existingKey) {
    return importKey(existingKey)
  }

  const newKey = await generateEncryptionKey()
  const exportedKey = await exportKey(newKey)
  await dbSet(ENCRYPTION_KEY_NAME, exportedKey)

  return newKey
}

/**
 * Encripta datos con AES-GCM
 */
async function encrypt(data: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv))
  }
}

/**
 * Desencripta datos con AES-GCM
 */
async function decrypt(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const decoder = new TextDecoder()
  const encryptedData = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  const ivData = Uint8Array.from(atob(iv), c => c.charCodeAt(0))

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivData },
    key,
    encryptedData
  )

  return decoder.decode(decrypted)
}

// ==========================================
// CREDENTIAL STORAGE API
// ==========================================

export interface StoredCredentials {
  email: string
  password: string
}

interface EncryptedCredentials {
  ciphertext: string
  iv: string
}

const CREDENTIALS_KEY = 'user_credentials'

/**
 * Guarda las credenciales de forma segura (encriptadas)
 */
export async function saveCredentials(credentials: StoredCredentials): Promise<void> {
  try {
    const key = await getOrCreateEncryptionKey()
    const data = JSON.stringify(credentials)
    const encrypted = await encrypt(data, key)

    await dbSet(CREDENTIALS_KEY, encrypted)
  } catch (error) {
    console.error('[SecureStorage] Error saving credentials:', error)
    throw new Error('No se pudieron guardar las credenciales')
  }
}

/**
 * Recupera las credenciales guardadas (desencriptadas)
 */
export async function getCredentials(): Promise<StoredCredentials | null> {
  try {
    const encrypted = await dbGet<EncryptedCredentials>(CREDENTIALS_KEY)

    if (!encrypted) {
      return null
    }

    const key = await getOrCreateEncryptionKey()
    const decrypted = await decrypt(encrypted.ciphertext, encrypted.iv, key)

    return JSON.parse(decrypted) as StoredCredentials
  } catch (error) {
    console.error('[SecureStorage] Error retrieving credentials:', error)
    return null
  }
}

/**
 * Verifica si hay credenciales guardadas
 */
export async function hasStoredCredentials(): Promise<boolean> {
  try {
    const encrypted = await dbGet<EncryptedCredentials>(CREDENTIALS_KEY)
    return encrypted !== null
  } catch {
    return false
  }
}

/**
 * Elimina las credenciales guardadas
 */
export async function clearCredentials(): Promise<void> {
  try {
    await dbDelete(CREDENTIALS_KEY)
  } catch (error) {
    console.error('[SecureStorage] Error clearing credentials:', error)
  }
}

/**
 * Elimina todo el almacenamiento seguro (incluyendo la clave)
 */
export async function clearAllSecureStorage(): Promise<void> {
  try {
    await dbDelete(CREDENTIALS_KEY)
    await dbDelete(ENCRYPTION_KEY_NAME)
  } catch (error) {
    console.error('[SecureStorage] Error clearing all storage:', error)
  }
}
