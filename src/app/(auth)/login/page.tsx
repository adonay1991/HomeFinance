'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { signInWithPassword, signUp } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Home, Mail, Lock, User, Loader2, CheckCircle2 } from 'lucide-react'
import { BiometricLoginButton } from '@/components/auth/biometric-login-button'
import { saveTempCredentials } from '@/components/auth/biometric-activation-handler'
import {
  isWebAuthnSupported,
  hasBiometricCredential,
  getLastEmail,
  saveLastEmail
} from '@/lib/auth/webauthn'

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Estado para biometría
  const [showBiometric, setShowBiometric] = useState(false)
  const [lastEmail, setLastEmail] = useState<string | null>(null)

  // Verificar si mostrar opción de biometría al montar
  useEffect(() => {
    const checkBiometric = () => {
      if (isWebAuthnSupported() && hasBiometricCredential()) {
        setShowBiometric(true)
      }
      const email = getLastEmail()
      if (email) {
        setLastEmail(email)
      }
    }
    checkBiometric()
  }, [])

  async function handleLogin(formData: FormData) {
    setIsPending(true)
    setError(null)
    setSuccessMessage(null)

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // Guardar email para futuros logins
    if (email) {
      saveLastEmail(email)
    }

    // ✨ IMPORTANTE: Guardar credenciales temporalmente ANTES del redirect
    // Esto permite mostrar el prompt de biometría después del login exitoso
    if (email && password) {
      saveTempCredentials({ email, password })
    }

    const result = await signInWithPassword(formData)

    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
    // Si no hay error, el redirect ya ocurrió
  }

  async function handleRegister(formData: FormData) {
    setIsPending(true)
    setError(null)
    setSuccessMessage(null)

    const result = await signUp(formData)

    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    } else if (result?.requiresConfirmation) {
      setSuccessMessage(result.message)
      setIsPending(false)
    }
    // Si no hay error ni confirmation, el redirect ya ocurrió
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

        {/* Botón de biometría (solo si está disponible) */}
        {showBiometric && activeTab === 'login' && (
          <div className="space-y-3">
            <BiometricLoginButton
              onError={(err) => setError(err)}
            />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  o continúa con email
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Card con Tabs */}
        <Card>
          <CardHeader className="space-y-1 pb-2">
            <Tabs value={activeTab} onValueChange={(v) => {
              setActiveTab(v as 'login' | 'register')
              setError(null)
              setSuccessMessage(null)
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {/* Mensaje de éxito (confirmación de email) */}
            {successMessage ? (
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">¡Registro exitoso!</p>
                  <p className="text-sm text-muted-foreground">
                    {successMessage}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="text-sm"
                  onClick={() => {
                    setSuccessMessage(null)
                    setActiveTab('login')
                  }}
                >
                  Ir a iniciar sesión
                </Button>
              </div>
            ) : (
              <>
                {/* Tab de Login */}
                {activeTab === 'login' && (
                  <form action={handleLogin} className="space-y-4">
                    <CardDescription className="pb-2">
                      Ingresa tus credenciales para acceder
                    </CardDescription>

                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          name="email"
                          type="email"
                          placeholder="tu@email.com"
                          className="pl-10"
                          required
                          autoComplete="email"
                          disabled={isPending}
                          defaultValue={lastEmail || ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Contraseña</Label>
                        <Link
                          href="/reset-password"
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          ¿Olvidaste tu contraseña?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          required
                          autoComplete="current-password"
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
                          Iniciando sesión...
                        </>
                      ) : (
                        'Iniciar sesión'
                      )}
                    </Button>
                  </form>
                )}

                {/* Tab de Registro */}
                {activeTab === 'register' && (
                  <form action={handleRegister} className="space-y-4">
                    <CardDescription className="pb-2">
                      Crea tu cuenta para empezar
                    </CardDescription>

                    <div className="space-y-2">
                      <Label htmlFor="register-name">Nombre (opcional)</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="register-name"
                          name="name"
                          type="text"
                          placeholder="Tu nombre"
                          className="pl-10"
                          autoComplete="name"
                          disabled={isPending}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="register-email"
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

                    <div className="space-y-2">
                      <Label htmlFor="register-password">Contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="register-password"
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
                      <p className="text-xs text-muted-foreground">
                        Mínimo 6 caracteres
                      </p>
                    </div>

                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}

                    <Button type="submit" className="w-full" disabled={isPending}>
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creando cuenta...
                        </>
                      ) : (
                        'Crear cuenta'
                      )}
                    </Button>
                  </form>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Tu información está segura con nosotros
        </p>
      </div>
    </div>
  )
}
