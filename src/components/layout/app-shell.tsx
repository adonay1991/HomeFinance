import { Header } from './header'
import { BottomNav } from './bottom-nav'

// ==========================================
// APP SHELL - LAYOUT PRINCIPAL
// ==========================================
// Contenedor principal para las rutas protegidas.
// Incluye header, contenido principal y navegación inferior.
// El contenido tiene padding-bottom para no ser tapado por la nav.

interface AppShellProps {
  children: React.ReactNode
  userName?: string
  userEmail?: string
}

export function AppShell({ children, userName, userEmail }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header userName={userName} userEmail={userEmail} />

      {/* Contenido principal con padding para la navegación inferior */}
      <main className="flex-1 pb-20 px-4 py-4 max-w-lg mx-auto w-full">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
