import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout'
import { getUser, getUserProfile } from '@/lib/auth/actions'

// ==========================================
// LAYOUT PARA RUTAS PROTEGIDAS
// ==========================================
// Este layout envuelve todas las rutas que requieren
// autenticación. Verifica la sesión y proporciona
// el AppShell con la información del usuario.

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getUserProfile()

  return (
    <AppShell
      userName={profile?.name}
      userEmail={user.email}
    >
      {children}
    </AppShell>
  )
}
