'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Loader2, ExternalLink } from 'lucide-react'

// ==========================================
// BOTÓN DE CONEXIÓN BANCARIA
// ==========================================

interface BankConnectButtonProps {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}

interface Institution {
  name: string
  fullName: string
  country: string
  logo?: string
}

export function BankConnectButton({ variant = 'default', size = 'default' }: BankConnectButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [selectedBank, setSelectedBank] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Cargar instituciones cuando se abre el diálogo
  async function loadInstitutions() {
    if (institutions.length > 0) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/bank/institutions?country=ES', {
        credentials: 'include',
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar bancos')
      }

      // Filtrar instituciones con fullName válido y eliminar duplicados
      const validInstitutions = (data.institutions || [])
        .filter((inst: Institution) => inst.fullName && inst.fullName.trim() !== '')
        .filter((inst: Institution, index: number, self: Institution[]) =>
          index === self.findIndex(i => i.fullName === inst.fullName)
        )

      setInstitutions(validInstitutions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar bancos')
    } finally {
      setIsLoading(false)
    }
  }

  // Iniciar conexión con el banco seleccionado
  async function handleConnect() {
    if (!selectedBank) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/bank/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bankName: selectedBank,
          country: 'ES',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar conexión')
      }

      // Redirigir a la URL de autorización del banco
      window.location.href = data.authUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar')
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (open) loadInstitutions()
    }}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Building2 className="h-4 w-4" />
          Conectar banco
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar cuenta bancaria</DialogTitle>
          <DialogDescription>
            Selecciona tu banco para sincronizar tus transacciones automáticamente.
            Usamos Enable Banking para conexiones seguras.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          {isLoading && institutions.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Select
                value={selectedBank}
                onValueChange={setSelectedBank}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu banco" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((inst, index) => (
                    <SelectItem key={`${inst.fullName}-${index}`} value={inst.fullName}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                className="w-full gap-2"
                onClick={handleConnect}
                disabled={!selectedBank || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                {isLoading ? 'Conectando...' : 'Continuar al banco'}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Serás redirigido a la web de tu banco para autorizar el acceso.
                Tus credenciales nunca pasan por nuestra aplicación.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
