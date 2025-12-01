'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Fingerprint, ScanFace, Smartphone } from 'lucide-react'
import { getBiometricType, getBiometricName, dismissBiometricPrompt } from '@/lib/auth/webauthn'
import { registerPasskey } from '@/lib/auth/passkey'
import type { StoredCredentials } from '@/lib/auth/secure-storage'

// ==========================================
// BIOMETRIC PROMPT
// Modal para activar Face ID / Touch ID / Huella
// Se muestra después del primer login exitoso
// ==========================================

interface BiometricPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Credenciales del usuario para guardar (requerido para activar) */
  credentials?: StoredCredentials | null
  onSuccess?: () => void
  onDismiss?: () => void
}

export function BiometricPrompt({
  open,
  onOpenChange,
  credentials,
  onSuccess,
  onDismiss,
}: BiometricPromptProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dontAskAgain, setDontAskAgain] = useState(false)

  const biometricType = getBiometricType()
  const biometricName = getBiometricName()

  // Icono según el tipo de biometría
  const BiometricIcon = biometricType === 'face-id' ? ScanFace :
    biometricType === 'fingerprint' ? Fingerprint :
      Smartphone

  async function handleActivate() {
    // Verificar que tenemos credenciales
    if (!credentials?.email || !credentials?.password) {
      setError('No se encontraron credenciales para guardar')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await registerPasskey(credentials)

    setIsLoading(false)

    if (result.success) {
      onOpenChange(false)
      onSuccess?.()
    } else {
      setError(result.error || 'Error al activar biometría')
    }
  }

  function handleDismiss() {
    dismissBiometricPrompt(dontAskAgain)
    onOpenChange(false)
    onDismiss?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <BiometricIcon className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            ¿Activar {biometricName}?
          </DialogTitle>
          <DialogDescription className="text-center">
            Inicia sesión más rápido usando{' '}
            {biometricType === 'face-id' ? 'reconocimiento facial' :
              biometricType === 'touch-id' ? 'tu huella dactilar' :
                biometricType === 'fingerprint' ? 'tu huella dactilar' :
                  'autenticación biométrica'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleActivate}
              disabled={isLoading || !credentials}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activando...
                </>
              ) : (
                <>
                  <BiometricIcon className="mr-2 h-4 w-4" />
                  Activar {biometricName}
                </>
              )}
            </Button>

            <Button
              onClick={handleDismiss}
              variant="ghost"
              className="w-full"
              disabled={isLoading}
            >
              Ahora no
            </Button>
          </div>

          <div className="flex items-center justify-center space-x-2 pt-2">
            <Checkbox
              id="dontAskAgain"
              checked={dontAskAgain}
              onCheckedChange={(checked) => setDontAskAgain(checked === true)}
              disabled={isLoading}
            />
            <label
              htmlFor="dontAskAgain"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              No volver a preguntar
            </label>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Tu información biométrica nunca sale de tu dispositivo
        </p>
      </DialogContent>
    </Dialog>
  )
}
