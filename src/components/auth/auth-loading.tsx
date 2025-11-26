import { Home, Loader2 } from 'lucide-react'

// ==========================================
// COMPONENTE DE CARGA DE AUTENTICACIÓN
// ==========================================
// Se muestra mientras se verifica la sesión del usuario.
// Evita el "flash" de la página de login.

export function AuthLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* Logo animado */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Home className="w-8 h-8 text-primary" />
          </div>
          {/* Spinner alrededor del logo */}
          <div className="absolute -inset-2">
            <Loader2 className="w-20 h-20 text-primary/30 animate-spin" />
          </div>
        </div>

        {/* Texto */}
        <div className="text-center space-y-1">
          <p className="font-medium text-foreground">HomeFinance</p>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    </div>
  )
}
