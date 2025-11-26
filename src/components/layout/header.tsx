'use client'

import { Home, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { signOut } from '@/lib/auth/actions'

// ==========================================
// HEADER COMPONENT
// ==========================================
// Header simple con logo y menú de usuario.
// Diseñado para ser compacto en móvil.

interface HeaderProps {
  userName?: string
  userEmail?: string
}

export function Header({ userName, userEmail }: HeaderProps) {
  // Obtener iniciales del nombre
  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.charAt(0).toUpperCase() || '?'

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Home className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">HomeFinance</span>
        </div>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-0.5 leading-none">
                {userName && (
                  <p className="font-medium text-sm">{userName}</p>
                )}
                {userEmail && (
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                )}
              </div>
            </div>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
