// ==========================================
// SERVICE WORKER - HomeFinance PWA
// ==========================================
// Estrategia: Network First con fallback a cache
// - Intenta obtener de la red primero
// - Si falla, usa el cache
// - Cachea respuestas exitosas para uso offline

const CACHE_NAME = 'homefinance-v1'

// Assets estáticos para pre-cachear
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Instalación: pre-cachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // Activar inmediatamente sin esperar
  self.skipWaiting()
})

// Activación: limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  // Tomar control de todas las páginas inmediatamente
  self.clients.claim()
})

// Fetch: Network First con fallback a cache
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Solo manejar requests GET
  if (request.method !== 'GET') return

  // Ignorar requests a APIs externas y Supabase
  const url = new URL(request.url)
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('supabase')
  ) {
    return
  }

  event.respondWith(
    // Intentar obtener de la red primero
    fetch(request)
      .then((response) => {
        // Solo cachear respuestas exitosas
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(async () => {
        // Si falla la red, intentar desde cache
        const cachedResponse = await caches.match(request)
        if (cachedResponse) {
          return cachedResponse
        }

        // Si es una navegación, mostrar página offline
        if (request.destination === 'document') {
          return caches.match('/offline')
        }

        // Para otros recursos, devolver error
        return new Response('Offline', { status: 503 })
      })
  )
})
