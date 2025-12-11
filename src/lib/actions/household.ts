'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// SERVER ACTIONS: HOGAR COMPARTIDO
// ==========================================

// ==========================================
// TIPOS
// ==========================================

export interface HouseholdData {
  id: string
  name: string
  inviteCode: string
  ownerId: string
  isOwner: boolean
  role: 'owner' | 'member'
}

export interface MemberWithUser {
  id: string
  userId: string
  role: 'owner' | 'member'
  joinedAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

export interface UserBalance {
  userId: string
  userName: string
  userEmail: string
  totalPaid: number
  shouldHavePaid: number
  balance: number // positivo = le deben, negativo = debe
}

export interface SimplifiedDebt {
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  amount: number
}

export interface BalancesResult {
  totalExpenses: number
  perPersonShare: number
  userBalances: UserBalance[]
  simplifiedDebts: SimplifiedDebt[]
}

// ==========================================
// HELPER: Generar código de invitación
// ==========================================
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Sin I, O, 0, 1 para evitar confusión
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// ==========================================
// OBTENER HOGAR DEL USUARIO ACTUAL
// ==========================================
export async function getUserHousehold(): Promise<{ data?: HouseholdData; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  // Obtener el usuario y su household_id
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.household_id) {
    return { data: undefined } // Usuario sin hogar
  }

  // Obtener datos del hogar
  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('id, name, invite_code, owner_id')
    .eq('id', profile.household_id)
    .single()

  if (householdError || !household) {
    return { data: undefined }
  }

  // Obtener rol del usuario
  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', household.id)
    .eq('user_id', user.id)
    .single()

  return {
    data: {
      id: household.id,
      name: household.name,
      inviteCode: household.invite_code,
      ownerId: household.owner_id,
      isOwner: household.owner_id === user.id,
      role: (membership?.role as 'owner' | 'member') || 'member',
    },
  }
}

// ==========================================
// OBTENER MIEMBROS DEL HOGAR
// ==========================================
export async function getHouseholdMembers(): Promise<{ data: MemberWithUser[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado', data: [] }
  }

  // Obtener household_id del usuario
  const { data: profile } = await supabase
    .from('users')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    return { data: [] }
  }

  // Obtener miembros sin join (evita problemas de RLS)
  const { data: members, error: membersError } = await supabase
    .from('household_members')
    .select('id, user_id, role, joined_at')
    .eq('household_id', profile.household_id)
    .order('joined_at', { ascending: true })

  // Si hay error de RLS o la tabla no existe, devolver al menos el usuario actual
  if (membersError || !members || members.length === 0) {
    if (membersError) {
      console.warn('[Household] Error fetching members (possibly RLS):', membersError.message || 'Unknown error')
    }

    // Intentar devolver al menos el usuario actual como miembro
    const { data: currentUserData } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', user.id)
      .single()

    if (currentUserData) {
      return {
        data: [{
          id: 'self',
          userId: user.id,
          role: 'owner' as const,
          joinedAt: new Date().toISOString(),
          user: {
            id: currentUserData.id,
            name: currentUserData.name ?? 'Usuario',
            email: currentUserData.email ?? '',
          },
        }],
      }
    }

    return { data: [] }
  }

  // Obtener datos de usuarios por separado
  const userIds = members.map(m => m.user_id)
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', userIds)

  if (usersError) {
    console.error('[Household] Error fetching users:', usersError)
    // Continuar sin datos de usuario si falla
  }

  // Crear mapa de usuarios
  const usersMap = new Map<string, { id: string; name: string; email: string }>()
  usersData?.forEach(u => {
    usersMap.set(u.id, { id: u.id, name: u.name ?? 'Usuario', email: u.email ?? '' })
  })

  // Transformar el resultado
  const transformedMembers: MemberWithUser[] = members.map((m) => {
    const userData = usersMap.get(m.user_id) ?? {
      id: m.user_id,
      name: 'Usuario desconocido',
      email: ''
    }
    return {
      id: m.id,
      userId: m.user_id,
      role: m.role as 'owner' | 'member',
      joinedAt: m.joined_at,
      user: userData,
    }
  })

  return { data: transformedMembers }
}

// ==========================================
// CALCULAR BALANCES DEL HOGAR
// ==========================================
export async function getHouseholdBalances(options?: {
  year?: number
  month?: number
}): Promise<{ data?: BalancesResult; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  // Obtener household_id
  const { data: profile } = await supabase
    .from('users')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    return { error: 'Usuario sin hogar' }
  }

  const householdId = profile.household_id

  // 1. Obtener miembros del hogar (sin join para evitar problemas de RLS)
  const { data: membersData, error: membersError } = await supabase
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId)

  // Si hay error de RLS, devolver datos vacíos pero sin error
  if (membersError || !membersData || membersData.length === 0) {
    if (membersError) {
      console.warn('[Household] Error fetching members for balances (possibly RLS):', membersError.message || 'Unknown error')
    }
    return { data: { totalExpenses: 0, perPersonShare: 0, userBalances: [], simplifiedDebts: [] } }
  }

  // Obtener datos de usuarios por separado
  const memberUserIds = membersData.map(m => m.user_id)
  const { data: membersUsersData } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', memberUserIds)

  // Crear estructura de members compatible
  const members = membersData.map(m => {
    const userData = membersUsersData?.find(u => u.id === m.user_id)
    return {
      user_id: m.user_id,
      users: {
        id: userData?.id ?? m.user_id,
        name: userData?.name ?? 'Usuario',
        email: userData?.email ?? ''
      }
    }
  })

  // 2. Construir query de gastos
  let expensesQuery = supabase
    .from('expenses')
    .select('amount, paid_by')
    .eq('household_id', householdId)

  // Filtrar por mes si se especifica
  if (options?.year && options?.month) {
    const startDate = `${options.year}-${String(options.month).padStart(2, '0')}-01`
    const endDate = new Date(options.year, options.month, 0).toISOString().split('T')[0]
    expensesQuery = expensesQuery.gte('date', startDate).lte('date', endDate)
  }

  const { data: expenses } = await expensesQuery

  // 3. Obtener liquidaciones (settlements)
  let settlementsQuery = supabase
    .from('settlements')
    .select('from_user_id, to_user_id, amount')
    .eq('household_id', householdId)

  if (options?.year && options?.month) {
    const startDate = `${options.year}-${String(options.month).padStart(2, '0')}-01`
    const endDate = new Date(options.year, options.month, 0).toISOString().split('T')[0]
    settlementsQuery = settlementsQuery.gte('settled_at', startDate).lte('settled_at', endDate)
  }

  const { data: settlements } = await settlementsQuery

  // 4. Calcular totales
  const numMembers = members.length
  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
  const perPersonShare = numMembers > 0 ? totalExpenses / numMembers : 0

  // 5. Calcular cuánto pagó cada persona
  const paidByUser: Record<string, number> = {}
  expenses?.forEach((e) => {
    paidByUser[e.paid_by] = (paidByUser[e.paid_by] || 0) + Number(e.amount)
  })

  // 6. Ajustar por liquidaciones realizadas
  settlements?.forEach((s) => {
    // Quien pagó, reduce su deuda
    paidByUser[s.from_user_id] = (paidByUser[s.from_user_id] || 0) + Number(s.amount)
    // Quien recibió, aumenta lo que debe
    paidByUser[s.to_user_id] = (paidByUser[s.to_user_id] || 0) - Number(s.amount)
  })

  // 7. Calcular balance de cada usuario
  const userBalances: UserBalance[] = members.map((m) => {
    const userData = m.users as unknown as { id: string; name: string; email: string }
    const paid = paidByUser[m.user_id] || 0
    return {
      userId: m.user_id,
      userName: userData.name,
      userEmail: userData.email,
      totalPaid: paid,
      shouldHavePaid: perPersonShare,
      balance: paid - perPersonShare, // positivo = le deben
    }
  })

  // 8. Simplificar deudas (algoritmo greedy)
  const simplifiedDebts = simplifyDebts(userBalances)

  return {
    data: {
      totalExpenses,
      perPersonShare,
      userBalances,
      simplifiedDebts,
    },
  }
}

// ==========================================
// ALGORITMO DE SIMPLIFICACIÓN DE DEUDAS
// ==========================================
function simplifyDebts(balances: UserBalance[]): SimplifiedDebt[] {
  const debts: SimplifiedDebt[] = []

  // Copiar balances para no mutar
  const remaining = balances.map((b) => ({ ...b }))

  // Ordenar: deudores (negativo) primero, acreedores (positivo) al final
  remaining.sort((a, b) => a.balance - b.balance)

  let left = 0 // índice del mayor deudor
  let right = remaining.length - 1 // índice del mayor acreedor

  while (left < right) {
    const debtor = remaining[left]
    const creditor = remaining[right]

    // Si ya están al día, saltar
    if (Math.abs(debtor.balance) < 0.01) {
      left++
      continue
    }
    if (Math.abs(creditor.balance) < 0.01) {
      right--
      continue
    }

    // Calcular cuánto puede pagar
    const amount = Math.min(Math.abs(debtor.balance), creditor.balance)

    if (amount >= 0.01) {
      debts.push({
        fromUserId: debtor.userId,
        fromUserName: debtor.userName,
        toUserId: creditor.userId,
        toUserName: creditor.userName,
        amount: Math.round(amount * 100) / 100,
      })

      debtor.balance += amount // reduce su deuda
      creditor.balance -= amount // reduce lo que le deben
    }

    // Mover índices según quien quedó en 0
    if (Math.abs(debtor.balance) < 0.01) left++
    if (Math.abs(creditor.balance) < 0.01) right--
  }

  return debts
}

// ==========================================
// REGISTRAR PAGO ENTRE MIEMBROS
// ==========================================
export async function settleBalance(input: {
  toUserId: string
  amount: number
  note?: string
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  if (input.amount <= 0) {
    return { error: 'El importe debe ser mayor que 0' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    return { error: 'Usuario sin hogar' }
  }

  const { error } = await supabase.from('settlements').insert({
    household_id: profile.household_id,
    from_user_id: user.id,
    to_user_id: input.toUserId,
    amount: input.amount,
    note: input.note || null,
  })

  if (error) {
    console.error('[Household] Error creating settlement:', error)
    return { error: 'Error al registrar el pago' }
  }

  revalidatePath('/')
  revalidatePath('/household')

  return { success: true }
}

// ==========================================
// CREAR NUEVO HOGAR
// ==========================================
export async function createHousehold(name: string): Promise<{
  success?: boolean
  data?: { id: string; inviteCode: string }
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  if (!name || name.length < 2) {
    return { error: 'El nombre debe tener al menos 2 caracteres' }
  }

  // Verificar si ya tiene un hogar
  const { data: existingMembership } = await supabase
    .from('household_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existingMembership) {
    return { error: 'Ya perteneces a un hogar. Abandónalo primero.' }
  }

  // Generar código de invitación único
  let inviteCode = generateInviteCode()
  let attempts = 0
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', inviteCode)
      .single()

    if (!existing) break
    inviteCode = generateInviteCode()
    attempts++
  }

  // Crear hogar
  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({
      name,
      invite_code: inviteCode,
      owner_id: user.id,
    })
    .select()
    .single()

  if (householdError) {
    console.error('[Household] Error creating household:', householdError)
    return { error: 'Error al crear el hogar' }
  }

  // Agregar al creador como owner
  const { error: memberError } = await supabase.from('household_members').insert({
    household_id: household.id,
    user_id: user.id,
    role: 'owner',
  })

  if (memberError) {
    // Rollback: eliminar hogar
    await supabase.from('households').delete().eq('id', household.id)
    console.error('[Household] Error adding owner:', memberError)
    return { error: 'Error al crear el hogar' }
  }

  // Actualizar household_id del usuario
  await supabase.from('users').update({ household_id: household.id }).eq('id', user.id)

  revalidatePath('/')
  revalidatePath('/household')
  revalidatePath('/profile')

  return { success: true, data: { id: household.id, inviteCode } }
}

// ==========================================
// UNIRSE A HOGAR CON CÓDIGO
// ==========================================
export async function joinHousehold(inviteCode: string): Promise<{
  success?: boolean
  data?: { name: string }
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  if (!inviteCode || inviteCode.length !== 6) {
    return { error: 'Código de invitación inválido' }
  }

  // Buscar hogar por código
  const { data: household, error: findError } = await supabase
    .from('households')
    .select('id, name')
    .eq('invite_code', inviteCode.toUpperCase())
    .single()

  if (findError || !household) {
    return { error: 'Código de invitación no válido' }
  }

  // Verificar que no sea ya miembro
  const { data: existing } = await supabase
    .from('household_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return { error: 'Ya perteneces a un hogar. Abandónalo primero.' }
  }

  // Agregar como miembro
  const { error: joinError } = await supabase.from('household_members').insert({
    household_id: household.id,
    user_id: user.id,
    role: 'member',
  })

  if (joinError) {
    console.error('[Household] Error joining household:', joinError)
    return { error: 'Error al unirse al hogar' }
  }

  // Actualizar household_id del usuario
  await supabase.from('users').update({ household_id: household.id }).eq('id', user.id)

  revalidatePath('/')
  revalidatePath('/household')
  revalidatePath('/profile')

  return { success: true, data: { name: household.name } }
}

// ==========================================
// ELIMINAR MIEMBRO (SOLO OWNER)
// ==========================================
export async function removeMember(memberId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  // Obtener household_id del usuario actual
  const { data: profile } = await supabase
    .from('users')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    return { error: 'Usuario sin hogar' }
  }

  // Verificar que el usuario actual sea owner
  const { data: currentMembership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', profile.household_id)
    .eq('user_id', user.id)
    .single()

  if (currentMembership?.role !== 'owner') {
    return { error: 'Solo el propietario puede eliminar miembros' }
  }

  // Obtener info del miembro a eliminar
  const { data: targetMember } = await supabase
    .from('household_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('household_id', profile.household_id)
    .single()

  if (!targetMember) {
    return { error: 'Miembro no encontrado' }
  }

  if (targetMember.role === 'owner') {
    return { error: 'No puedes eliminar al propietario' }
  }

  // Eliminar miembro
  const { error } = await supabase.from('household_members').delete().eq('id', memberId)

  if (error) {
    console.error('[Household] Error removing member:', error)
    return { error: 'Error al eliminar miembro' }
  }

  // Limpiar household_id del usuario eliminado
  await supabase.from('users').update({ household_id: null }).eq('id', targetMember.user_id)

  revalidatePath('/household')

  return { success: true }
}

// ==========================================
// ABANDONAR HOGAR
// ==========================================
export async function leaveHousehold(): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    return { error: 'No perteneces a ningún hogar' }
  }

  // Verificar que no sea owner
  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', profile.household_id)
    .eq('user_id', user.id)
    .single()

  if (membership?.role === 'owner') {
    return { error: 'El propietario no puede abandonar el hogar. Transfiere la propiedad o elimina el hogar.' }
  }

  // Eliminar membership
  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('household_id', profile.household_id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[Household] Error leaving household:', error)
    return { error: 'Error al abandonar el hogar' }
  }

  // Limpiar household_id - Crear nuevo hogar personal
  const newResult = await createHousehold('Mi Hogar')
  if (newResult.error) {
    // Al menos limpiar el household_id
    await supabase.from('users').update({ household_id: null }).eq('id', user.id)
  }

  revalidatePath('/')
  revalidatePath('/household')
  revalidatePath('/profile')

  return { success: true }
}

// ==========================================
// ACTUALIZAR NOMBRE DEL HOGAR (SOLO OWNER)
// ==========================================
export async function updateHouseholdName(name: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  if (!name || name.length < 2) {
    return { error: 'El nombre debe tener al menos 2 caracteres' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    return { error: 'Usuario sin hogar' }
  }

  // Verificar que sea owner
  const { data: household } = await supabase
    .from('households')
    .select('owner_id')
    .eq('id', profile.household_id)
    .single()

  if (household?.owner_id !== user.id) {
    return { error: 'Solo el propietario puede cambiar el nombre' }
  }

  const { error } = await supabase
    .from('households')
    .update({ name })
    .eq('id', profile.household_id)

  if (error) {
    console.error('[Household] Error updating name:', error)
    return { error: 'Error al actualizar el nombre' }
  }

  revalidatePath('/household')

  return { success: true }
}
