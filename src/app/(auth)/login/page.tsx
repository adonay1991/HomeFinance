'use client'

import { useState } from 'react'
import { signInWithMagicLink } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Mail, Loader2, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const [isPending, setIsPending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)

    const result = await signInWithMagicLink(formData)

    if (result.error) {
      setError(result.error)
      setIsPending(false)
    } else {
      setEmailSent(true)
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/50">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo y título */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Home className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">HomeFinance</h1>
          <p className="text-muted-foreground text-sm">
            Gestiona los gastos de tu hogar
          </p>
        </div>

        {/* Card de login */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Iniciar sesión</CardTitle>
            <CardDescription>
              Te enviaremos un enlace mágico a tu email
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              // Estado: email enviado
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">¡Email enviado!</p>
                  <p className="text-sm text-muted-foreground">
                    Revisa tu bandeja de entrada y haz click en el enlace
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="text-sm"
                  onClick={() => {
                    setEmailSent(false)
                    setError(null)
                  }}
                >
                  Usar otro email
                </Button>
              </div>
            ) : (
              // Formulario de login
              <form action={handleSubmit} className="space-y-4">
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
                    'Enviar enlace mágico'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Sin contraseñas. Simple y seguro.
        </p>
      </div>
    </div>
  )
}
