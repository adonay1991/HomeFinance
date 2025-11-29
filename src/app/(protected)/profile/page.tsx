import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getUser, getUserProfile, signOut } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { User, Mail, Home, LogOut, Settings } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { BankStatusCard } from '@/components/bank'

// ==========================================
// PÁGINA: PERFIL DE USUARIO
// ==========================================

export default async function ProfilePage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getUserProfile()

  const initials = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.charAt(0).toUpperCase() || '?'

  const memberSince = user.created_at
    ? format(new Date(user.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-muted-foreground text-sm">
          Tu información personal
        </p>
      </div>

      {/* Info del usuario */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{profile?.name || 'Usuario'}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{profile?.name || 'No configurado'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Mail className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Home className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hogar</p>
              <p className="font-medium">HomeFinance</p>
            </div>
          </div>

          {memberSince && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Miembro desde {memberSince}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conexión bancaria */}
      <BankStatusCard />

      {/* Acciones */}
      <div className="space-y-3">
        <form action={signOut}>
          <Button
            type="submit"
            variant="destructive"
            className="w-full gap-2"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </Button>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center pt-4">
        <p className="text-xs text-muted-foreground">
          HomeFinance v0.1.0
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Hecho con ❤️ para gestionar tu hogar
        </p>
      </div>
    </div>
  )
}
