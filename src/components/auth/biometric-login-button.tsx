'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Fingerprint, ScanFace, Smartphone, AlertCircle } from 'lucide-react'
import { getBiometricType, getBiometricName } from '@/lib/auth/webauthn'
import { signInWithPasskey } from '@/lib/auth/passkey'

// ==========================================
// BIOMETRIC LOGIN BUTTON
// Botón para iniciar sesión con Face ID / Huella
// Solo se muestra si el usuario tiene credencial guardada
// ==========================================

interface BiometricLoginButtonProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  className?: string
}

export function BiometricLoginButton({
  onSuccess,
  onError,
  className,
}: BiometricLoginButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const biometricType = getBiometricType()
  const biometricName = getBiometricName()

  // Icono según el tipo de biometría
  const BiometricIcon = biometricType === 'face-id' ? ScanFace :
    biometricType === 'fingerprint' ? Fingerprint :
      Smartphone

  async function handleLogin() {
    setIsLoading(true)
    setError(null)

    const result = await signInWithPasskey()

    setIsLoading(false)

    if (result.success) {
      onSuccess?.()
      // Redirigir al dashboard
      router.push('/')
      router.refresh()
    } else {
      const errorMsg = result.error || 'Error al autenticar'
      setError(errorMsg)
      onError?.(errorMsg)
    }
  }

  return (
    <div className={className}>
      <Button
        onClick={handleLogin}
        disabled={isLoading}
        variant="outline"
        size="lg"
        className="w-full relative border-primary/30 hover:border-primary hover:bg-primary/5"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Verificando...
          </>
        ) : (
          <>
            <BiometricIcon className="mr-2 h-5 w-5" />
            Iniciar con {biometricName}
          </>
        )}
      </Button>

      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
