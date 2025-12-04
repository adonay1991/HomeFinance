import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserHousehold, getHouseholdMembers, getHouseholdBalances } from '@/lib/actions/household'
import { HouseholdCard, MembersList, BalancesCard, JoinHouseholdForm } from '@/components/household'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// ==========================================
// PÁGINA: /household
// Gestión del hogar compartido
// ==========================================

export default async function HouseholdPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Cargar todos los datos en paralelo
  const [householdResult, membersResult, balancesResult] = await Promise.all([
    getUserHousehold(),
    getHouseholdMembers(),
    getHouseholdBalances(),
  ])

  const household = householdResult.data
  const members = membersResult.data
  const balances = balancesResult.data

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-lg font-semibold">Mi Hogar</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6 pb-24 space-y-6">
        {household ? (
          <>
            {/* Card del hogar con código de invitación prominente */}
            <HouseholdCard household={household} memberCount={members.length} />

            {/* Balances (si hay más de un miembro) */}
            {members.length > 1 && balances && (
              <BalancesCard balances={balances} currentUserId={user.id} />
            )}

            {/* Lista de miembros */}
            <MembersList
              members={members}
              currentUserId={user.id}
              isOwner={household.isOwner}
            />
          </>
        ) : (
          // Si no tiene hogar, mostrar formulario para unirse
          <div className="space-y-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold mb-2">No perteneces a ningún hogar</h2>
              <p className="text-muted-foreground">
                Únete a un hogar existente con un código de invitación
              </p>
            </div>
            <JoinHouseholdForm />
          </div>
        )}
      </main>
    </div>
  )
}
