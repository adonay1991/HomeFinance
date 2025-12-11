'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, PlusCircle, BarChart3, PieChart, User } from 'lucide-react'

// ==========================================
// BOTTOM NAVIGATION (MÓVIL-FIRST)
// ==========================================
// Navegación fija en la parte inferior para mobile.
// Usa iconos de Lucide y resalta la ruta activa.

const navItems = [
  { href: '/', icon: Home, label: 'Inicio' },
  { href: '/expenses', icon: PieChart, label: 'Gastos' },
  { href: '/add', icon: PlusCircle, label: 'Añadir', isMain: true },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/profile', icon: User, label: 'Perfil' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ href, icon: Icon, label, isMain }) => {
          const isActive = pathname === href

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                isMain && 'relative -top-3',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isMain ? (
                // Botón principal (Añadir) con estilo destacado
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Icon className="w-6 h-6" />
                </div>
              ) : (
                <>
                  <Icon className={cn('w-5 h-5', isActive && 'text-primary')} />
                  <span className={cn(
                    'text-[10px] font-medium',
                    isActive && 'text-primary'
                  )}>
                    {label}
                  </span>
                </>
              )}
            </Link>
          )
        })}
      </div>
      {/* Safe area para dispositivos con notch */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  )
}
