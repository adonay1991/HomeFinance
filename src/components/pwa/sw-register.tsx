'use client'

import { useEffect } from 'react'

// ==========================================
// REGISTRO DE SERVICE WORKER
// ==========================================
// Componente cliente que registra el SW al cargar la app

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registrado:', registration.scope)

          // Verificar actualizaciones cada hora
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000)
        })
        .catch((error) => {
          console.error('[PWA] Error registrando Service Worker:', error)
        })
    }
  }, [])

  return null
}
