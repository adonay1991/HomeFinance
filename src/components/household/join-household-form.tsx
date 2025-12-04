'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Users, Loader2, Home } from 'lucide-react'
import { joinHousehold } from '@/lib/actions/household'
import { useRouter } from 'next/navigation'

// ==========================================
// COMPONENTE: JoinHouseholdForm
// Formulario para unirse a un hogar con código
// ==========================================

export function JoinHouseholdForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '')

    if (cleanCode.length !== 6) {
      toast.error('El código debe tener 6 caracteres')
      return
    }

    startTransition(async () => {
      const result = await joinHousehold(cleanCode)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(`Te has unido a "${result.data?.name}"`)
      router.refresh()
    })
  }

  // Formatear el código mientras se escribe
  const handleCodeChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setCode(cleaned)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Unirse a un hogar
        </CardTitle>
        <CardDescription>
          Introduce el código de 6 caracteres que te han compartido
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="ABC123"
              className="text-center text-2xl tracking-[0.5em] font-mono uppercase"
              maxLength={6}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground text-center mt-2">
              Pide el código al propietario del hogar
            </p>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || code.length !== 6}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uniéndose...
              </>
            ) : (
              <>
                <Home className="h-4 w-4 mr-2" />
                Unirse al hogar
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
