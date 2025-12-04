'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Mail, Send, Loader2, Clock, X, RotateCcw, Trash2 } from 'lucide-react'
import {
  createInvitation,
  cancelInvitation,
  resendInvitation,
  type InvitationData,
} from '@/lib/actions/invitations'

// ==========================================
// COMPONENTE: InviteForm
// Formulario para enviar invitaciones por email
// ==========================================

interface InviteFormProps {
  pendingInvitations: InvitationData[]
}

export function InviteForm({ pendingInvitations }: InviteFormProps) {
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error('Introduce un email')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Email no válido')
      return
    }

    startTransition(async () => {
      const result = await createInvitation(email)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Invitación enviada correctamente')
      setEmail('')
    })
  }

  const handleCancel = (invitationId: string) => {
    setActionId(invitationId)
    startTransition(async () => {
      const result = await cancelInvitation(invitationId)
      setActionId(null)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Invitación cancelada')
    })
  }

  const handleResend = (invitationId: string) => {
    setActionId(invitationId)
    startTransition(async () => {
      const result = await resendInvitation(invitationId)
      setActionId(null)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Email reenviado')
    })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    })
  }

  const getDaysRemaining = (expiresAt: Date) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Invitar personas
        </CardTitle>
        <CardDescription>
          Envía una invitación por email para que se unan a tu hogar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="email"
            placeholder="email@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
          />
          <Button type="submit" disabled={isPending || !email}>
            {isPending && !actionId ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Invitaciones pendientes */}
        {pendingInvitations.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Invitaciones pendientes</p>
            <div className="space-y-2">
              {pendingInvitations.map((invitation) => {
                const daysRemaining = getDaysRemaining(invitation.expiresAt)
                const isExpiringSoon = daysRemaining <= 2

                return (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{invitation.email}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Enviada {formatDate(invitation.createdAt)}
                          </span>
                          <Badge
                            variant={isExpiringSoon ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {daysRemaining > 0 ? `${daysRemaining}d restantes` : 'Expira hoy'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleResend(invitation.id)}
                        disabled={isPending && actionId === invitation.id}
                        title="Reenviar"
                      >
                        {isPending && actionId === invitation.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleCancel(invitation.id)}
                        disabled={isPending && actionId === invitation.id}
                        title="Cancelar invitación"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
