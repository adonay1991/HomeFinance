'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { sendPasswordResetOtp, verifyOtpAndSetPassword } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Mail, Lock, Loader2, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react'

// ==========================================
// RESET PASSWORD PAGE - FLUJO OTP SIMPLIFICADO
// ==========================================
// Paso 1: Usuario ingresa email
// Paso 2: Usuario ingresa código OTP de 6 dígitos
// Paso 3: Usuario establece nueva contraseña
// Todo controlado por nosotros, sin depender de redirects de Supabase

type Step = 'email' | 'otp' | 'password' | 'success'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Paso 1: Enviar código OTP al email
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const result = await sendPasswordResetOtp(email)

    setIsPending(false)

    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setStep('otp')
    }
  }

  // Paso 2 y 3: Verificar OTP y establecer contraseña
  async function handleSetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    const result = await verifyOtpAndSetPassword(email, otp, password, confirmPassword)

    setIsPending(false)

    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setStep('success')
    }
  }

  // Volver al paso anterior
  function handleBack() {
    setError(null)
    if (step === 'otp') {
      setStep('email')
      setOtp('')
    } else if (step === 'password') {
      setStep('otp')
    }
  }

  // Reenviar código
  async function handleResendOtp() {
    setIsPending(true)
    setError(null)

    const result = await sendPasswordResetOtp(email)

    setIsPending(false)

    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setError(null)
    }
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
              {step === 'email' && 'Recuperar acceso'}
              {step === 'otp' && 'Verificar código'}
              {step === 'password' && 'Nueva contraseña'}
              {step === 'success' && '¡Listo!'}
            </CardTitle>
            <CardDescription>
              {step === 'email' && 'Te enviaremos un código de 6 dígitos'}
              {step === 'otp' && `Ingresa el código enviado a ${email}`}
              {step === 'password' && 'Establece tu nueva contraseña'}
              {step === 'success' && 'Tu contraseña ha sido actualizada'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* PASO 1: Email */}
            {step === 'email' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                    'Enviar código'
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

            {/* PASO 2: Código OTP */}
            {step === 'otp' && (
              <form onSubmit={(e) => { e.preventDefault(); setStep('password') }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Código de 6 dígitos</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="otp"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="123456"
                      className="pl-10 text-center text-lg tracking-widest font-mono"
                      required
                      autoComplete="one-time-code"
                      disabled={isPending}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Revisa tu bandeja de entrada y spam
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={otp.length !== 6}>
                  Continuar
                </Button>

                <div className="flex gap-2">
                  <Button type="button" variant="ghost" className="flex-1" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Atrás
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleResendOtp}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Reenviar'
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* PASO 3: Nueva contraseña */}
            {step === 'password' && (
              <form onSubmit={handleSetPassword} className="space-y-4">
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

                <Button type="button" variant="ghost" className="w-full" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Atrás
                </Button>
              </form>
            )}

            {/* ÉXITO */}
            {step === 'success' && (
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">¡Contraseña actualizada!</p>
                  <p className="text-sm text-muted-foreground">
                    Ya puedes iniciar sesión con tu nueva contraseña
                  </p>
                </div>
                <Button className="w-full" onClick={() => router.push('/login')}>
                  Ir a iniciar sesión
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          {step !== 'success' && '¿No tienes cuenta? Regístrate desde el login'}
          {step === 'success' && 'Tu información está segura con nosotros'}
        </p>
      </div>
    </div>
  )
}
