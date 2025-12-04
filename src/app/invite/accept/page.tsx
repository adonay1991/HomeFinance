'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { validateInvitationToken, acceptInvitation } from '@/lib/actions/invitations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Home, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

// ==========================================
// PÁGINA: /invite/accept
// Validar y aceptar invitaciones a hogares
// ==========================================

type PageState = 'loading' | 'valid' | 'invalid' | 'success' | 'error'

interface InvitationInfo {
  householdName: string
  inviterName: string
  email: string
  expiresAt: Date
}

// Wrapper con Suspense para useSearchParams
export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Cargando...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  )
}

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [state, setState] = useState<PageState>('loading')
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [error, setError] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  // Validar token al cargar
  useEffect(() => {
    async function validate() {
      if (!token) {
        setState('invalid')
        setError('No se proporcionó un token de invitación')
        return
      }

      const result = await validateInvitationToken(token)

      if (!result.valid || !result.invitation) {
        setState('invalid')
        setError(result.error || 'Token inválido')
        return
      }

      setInvitation({
        householdName: result.invitation.householdName,
        inviterName: result.invitation.inviterName,
        email: result.invitation.email,
        expiresAt: result.invitation.expiresAt,
      })
      setState('valid')
    }

    validate()
  }, [token])

  // Aceptar invitación
  const handleAccept = () => {
    if (!token) return

    startTransition(async () => {
      const result = await acceptInvitation(token)

      if (result.success) {
        setState('success')
      } else {
        setState('error')
        setError(result.error || 'Error al aceptar la invitación')
      }
    })
  }

  // Estado: Cargando
  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Validando invitación...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Estado: Invitación inválida
  if (state === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invitación no válida</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/login">Ir a inicio de sesión</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Estado: Invitación aceptada con éxito
  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>¡Te has unido al hogar!</CardTitle>
            <CardDescription>
              Ahora eres miembro de &quot;{invitation?.householdName}&quot;
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>
              Puedes ver los gastos compartidos, agregar nuevos gastos y
              consultar los balances del hogar.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push('/dashboard')}>
              <Home className="h-4 w-4 mr-2" />
              Ir al dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Estado: Error al aceptar
  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Error al unirse</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {error.includes('iniciar sesión') ? (
                  <span>
                    Necesitas{' '}
                    <Link href="/login" className="underline font-medium">
                      iniciar sesión
                    </Link>{' '}
                    con la cuenta correcta.
                  </span>
                ) : (
                  error
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => setState('valid')}>
              Intentar de nuevo
            </Button>
            <Button asChild>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Estado: Invitación válida - mostrar detalles y botón de aceptar
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Home className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Invitación a un hogar</CardTitle>
          <CardDescription>
            <strong>{invitation?.inviterName}</strong> te ha invitado a unirte a su hogar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Hogar:</span>
              <span className="text-sm font-medium">{invitation?.householdName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Invitado por:</span>
              <span className="text-sm font-medium">{invitation?.inviterName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tu email:</span>
              <span className="text-sm font-medium">{invitation?.email}</span>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Si ya tienes un hogar propio sin otros miembros, se eliminará
              automáticamente al aceptar esta invitación.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aceptando...
              </>
            ) : (
              'Aceptar invitación'
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push('/dashboard')}
            disabled={isPending}
          >
            Cancelar
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
