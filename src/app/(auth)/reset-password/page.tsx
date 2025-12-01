'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { sendPasswordResetEmail, updatePassword } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Mail, Lock, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'

// ==========================================
// RESET PASSWORD PAGE
// Permite solicitar un reset o establecer nueva contraseña
// ==========================================

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  // Si viene con ?mode=update, significa que el usuario hizo clic en el email
  const isUpdateMode = searchParams.get('mode') === 'update'

  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleRequestReset(formData: FormData) {
    setIsPending(true)
    setError(null)

    const result = await sendPasswordResetEmail(formData)

    setIsPending(false)

    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setSuccessMessage(result.message)
    }
  }

  async function handleUpdatePassword(formData: FormData) {
    setIsPending(true)
    setError(null)

    const result = await updatePassword(formData)

    setIsPending(false)

    if (result?.error) {
      setError(result.error)
    }
    // Si no hay error, el redirect ya ocurrió
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/50">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Home className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">HomeFinance</h1>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>
              {isUpdateMode ? 'Crear contraseña' : 'Recuperar acceso'}
            </CardTitle>
            <CardDescription>
              {isUpdateMode
                ? 'Establece tu nueva contraseña'
                : 'Te enviaremos un enlace para establecer tu contraseña'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Mensaje de éxito */}
            {successMessage ? (
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">¡Email enviado!</p>
                  <p className="text-sm text-muted-foreground">
                    {successMessage}
                  </p>
                </div>
                <Button variant="outline" asChild className="text-sm">
                  <Link href="/login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al login
                  </Link>
                </Button>
              </div>
            ) : isUpdateMode ? (
              /* Formulario para establecer nueva contraseña */
              <form action={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      className="pl-10"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Repite la contraseña"
                      className="pl-10"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      disabled={isPending}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Establecer contraseña'
                  )}
                </Button>
              </form>
            ) : (
              /* Formulario para solicitar reset */
              <form action={handleRequestReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      className="pl-10"
                      required
                      autoComplete="email"
                      disabled={isPending}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar enlace'
                  )}
                </Button>

                <Button variant="ghost" asChild className="w-full">
                  <Link href="/login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al login
                  </Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          {isUpdateMode
            ? 'Tu contraseña será guardada de forma segura'
            : '¿No tienes cuenta? Regístrate desde el login'}
        </p>
      </div>
    </div>
  )
}
