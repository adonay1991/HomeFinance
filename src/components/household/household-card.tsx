'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Copy, Check, Pencil, Home, Users, Share2, MessageCircle } from 'lucide-react'
import { updateHouseholdName, type HouseholdData } from '@/lib/actions/household'

// ==========================================
// COMPONENTE: HouseholdCard
// Muestra información del hogar y código de invitación
// ==========================================

interface HouseholdCardProps {
  household: HouseholdData
  memberCount?: number
}

export function HouseholdCard({ household, memberCount = 1 }: HouseholdCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(household.name)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(household.inviteCode)
      setCopied(true)
      toast.success('Código copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Error al copiar el código')
    }
  }

  const handleShare = async () => {
    const shareText = `¡Únete a mi hogar "${household.name}" en HomeFinance!\n\nUsa este código: ${household.inviteCode}\n\nDescarga la app: ${window.location.origin}`

    // Usar Web Share API si está disponible (móviles)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Únete a ${household.name}`,
          text: shareText,
        })
      } catch (err) {
        // Usuario canceló o error - fallback a copiar
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareText)
          toast.success('Mensaje copiado al portapapeles')
        }
      }
    } else {
      // Desktop: copiar al portapapeles
      try {
        await navigator.clipboard.writeText(shareText)
        toast.success('Mensaje copiado al portapapeles')
      } catch {
        toast.error('Error al copiar')
      }
    }
  }

  const handleSaveName = async () => {
    if (name.length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres')
      return
    }

    setIsSaving(true)
    const result = await updateHouseholdName(name)
    setIsSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Nombre actualizado')
    setIsEditing(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 w-40"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') {
                        setName(household.name)
                        setIsEditing(false)
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleSaveName} disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setName(household.name)
                      setIsEditing(false)
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{household.name}</CardTitle>
                  {household.isOwner && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              <CardDescription className="flex items-center gap-2 mt-1">
                <Users className="h-3 w-3" />
                {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}
              </CardDescription>
            </div>
          </div>
          <Badge variant={household.isOwner ? 'default' : 'secondary'}>
            {household.isOwner ? 'Propietario' : 'Miembro'}
          </Badge>
        </div>
      </CardHeader>
      {household.isOwner && (
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Invitar personas</p>
              <Badge variant="outline" className="text-xs">
                Código de invitación
              </Badge>
            </div>

            {/* Código grande y prominente */}
            <div className="relative">
              <div className="flex items-center justify-center py-4 px-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border-2 border-dashed border-primary/20">
                <code className="font-mono text-3xl font-bold tracking-[0.3em] text-primary">
                  {household.inviteCode}
                </code>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleCopyCode}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar código
                  </>
                )}
              </Button>
              <Button
                variant="default"
                onClick={handleShare}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Compartir
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Comparte este código por WhatsApp o dilo en persona
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
