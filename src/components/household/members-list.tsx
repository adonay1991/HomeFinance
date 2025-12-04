'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { UserMinus, Crown, User, Loader2 } from 'lucide-react'
import { removeMember, type MemberWithUser } from '@/lib/actions/household'

// ==========================================
// COMPONENTE: MembersList
// Lista de miembros del hogar con acciones
// ==========================================

interface MembersListProps {
  members: MemberWithUser[]
  currentUserId: string
  isOwner: boolean
}

export function MembersList({ members, currentUserId, isOwner }: MembersListProps) {
  const [memberToRemove, setMemberToRemove] = useState<MemberWithUser | null>(null)
  const [isPending, startTransition] = useTransition()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleRemoveMember = () => {
    if (!memberToRemove) return

    startTransition(async () => {
      const result = await removeMember(memberToRemove.id)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(`${memberToRemove.user.name} ha sido eliminado del hogar`)
      setMemberToRemove(null)
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Miembros</CardTitle>
          <CardDescription>
            Personas que comparten este hogar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">
                      {getInitials(member.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{member.user.name}</span>
                      {member.userId === currentUserId && (
                        <Badge variant="outline" className="text-xs">
                          Tú
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {member.user.email}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.role === 'owner' ? (
                    <Badge className="flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Propietario
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Miembro
                    </Badge>
                  )}
                  {isOwner && member.role !== 'owner' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setMemberToRemove(member)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="Eliminar miembro"
        description={`¿Estás seguro de que quieres eliminar a ${memberToRemove?.user.name} del hogar? Ya no podrá ver los gastos compartidos.`}
        confirmText={isPending ? 'Eliminando...' : 'Eliminar'}
        cancelText="Cancelar"
        onConfirm={handleRemoveMember}
        variant="destructive"
      />
    </>
  )
}
