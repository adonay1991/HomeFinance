'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

// ==========================================
// THEME PROVIDER
// ==========================================
// Envuelve la app para habilitar el cambio de tema.
// Usa next-themes para persistir la preferencia.

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
