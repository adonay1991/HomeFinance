'use client'

import { WifiOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ==========================================
// PÁGINA OFFLINE
// ==========================================
// Se muestra cuando el usuario está sin conexión
// y intenta acceder a una página no cacheada

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <WifiOff className="w-8 h-8 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Sin conexión</h1>
            <p className="text-muted-foreground text-sm">
              Parece que no tienes conexión a internet.
              Verifica tu conexión e intenta de nuevo.
            </p>
          </div>

          <Button
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Reintentar
          </Button>

          <p className="text-xs text-muted-foreground">
            Algunas funciones pueden estar disponibles offline
            si ya visitaste la página anteriormente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
