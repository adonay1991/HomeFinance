'use server'

import { db, householdInvitations, households, householdMembers, users } from '@/lib/db/client'
import { createClient } from '@/lib/supabase/server'
import { eq, and, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { resend, EMAIL_FROM } from '@/lib/resend/client'
import { InvitationEmail } from '@/emails/invitation-email'
import crypto from 'crypto'

// ==========================================
// TIPOS
// ==========================================

export interface InvitationData {
  id: string
  email: string
  status: string
  expiresAt: Date
  createdAt: Date
  invitedByName: string
}

export interface InvitationValidation {
  valid: boolean
  invitation?: {
    id: string
    email: string
    householdName: string
    inviterName: string
    expiresAt: Date
  }
  error?: string
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Genera un token seguro de 64 caracteres hexadecimales
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Calcula la fecha de expiración (7 días desde ahora)
 */
function getExpirationDate(): Date {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date
}

/**
 * Obtiene el usuario autenticado actual
 */
async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No autenticado')
  }

  const userData = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!userData.length) {
    throw new Error('Usuario no encontrado')
  }

  return userData[0]
}

/**
 * Verifica si el usuario actual es owner del household
 */
async function verifyOwnership(householdId: string, userId: string): Promise<boolean> {
  const household = await db
    .select()
    .from(households)
    .where(and(eq(households.id, householdId), eq(households.ownerId, userId)))
    .limit(1)

  return household.length > 0
}

// ==========================================
// SERVER ACTIONS
// ==========================================

/**
 * Crear y enviar una invitación por email
 * Solo el owner puede invitar
 */
export async function createInvitation(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser()

    // Verificar que es owner
    const isOwner = await verifyOwnership(currentUser.householdId, currentUser.id)
    if (!isOwner) {
      return { success: false, error: 'Solo el propietario puede enviar invitaciones' }
    }

    // Obtener datos del household
    const householdData = await db
      .select()
      .from(households)
      .where(eq(households.id, currentUser.householdId))
      .limit(1)

    if (!householdData.length) {
      return { success: false, error: 'Hogar no encontrado' }
    }

    const household = householdData[0]

    // Verificar que no haya una invitación pendiente para este email
    const existingInvitation = await db
      .select()
      .from(householdInvitations)
      .where(
        and(
          eq(householdInvitations.householdId, currentUser.householdId),
          eq(householdInvitations.email, email.toLowerCase()),
          eq(householdInvitations.status, 'pending')
        )
      )
      .limit(1)

    if (existingInvitation.length > 0) {
      return { success: false, error: 'Ya existe una invitación pendiente para este email' }
    }

    // Verificar que el email no pertenezca a un miembro existente
    const existingMember = await db
      .select()
      .from(users)
      .innerJoin(householdMembers, eq(users.id, householdMembers.userId))
      .where(
        and(
          eq(householdMembers.householdId, currentUser.householdId),
          eq(users.email, email.toLowerCase())
        )
      )
      .limit(1)

    if (existingMember.length > 0) {
      return { success: false, error: 'Este usuario ya es miembro del hogar' }
    }

    // Generar token y crear invitación
    const token = generateSecureToken()
    const expiresAt = getExpirationDate()

    await db.insert(householdInvitations).values({
      householdId: currentUser.householdId,
      email: email.toLowerCase(),
      token,
      status: 'pending',
      invitedBy: currentUser.id,
      expiresAt,
    })

    // Construir link de invitación
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteLink = `${baseUrl}/invite/accept?token=${token}`

    // Enviar email
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: email.toLowerCase(),
        subject: `${currentUser.name} te ha invitado a unirte a su hogar en HomeFinance`,
        react: InvitationEmail({
          inviterName: currentUser.name,
          inviterEmail: currentUser.email,
          householdName: household.name,
          inviteLink,
          expiresIn: '7 días',
        }),
      })
    } catch (emailError) {
      console.error('[Invitation] Error enviando email:', emailError)
      // No fallamos la invitación si el email falla - el link sigue siendo válido
    }

    revalidatePath('/household')
    return { success: true }

  } catch (error) {
    console.error('[createInvitation] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear invitación'
    }
  }
}

/**
 * Obtener invitaciones pendientes del household
 * Solo el owner puede ver las invitaciones
 */
export async function getPendingInvitations(): Promise<{ invitations: InvitationData[]; error?: string }> {
  try {
    const currentUser = await getCurrentUser()

    // Verificar que es owner
    const isOwner = await verifyOwnership(currentUser.householdId, currentUser.id)
    if (!isOwner) {
      return { invitations: [], error: 'Solo el propietario puede ver las invitaciones' }
    }

    const invitations = await db
      .select({
        id: householdInvitations.id,
        email: householdInvitations.email,
        status: householdInvitations.status,
        expiresAt: householdInvitations.expiresAt,
        createdAt: householdInvitations.createdAt,
        invitedByName: users.name,
      })
      .from(householdInvitations)
      .innerJoin(users, eq(householdInvitations.invitedBy, users.id))
      .where(
        and(
          eq(householdInvitations.householdId, currentUser.householdId),
          eq(householdInvitations.status, 'pending')
        )
      )
      .orderBy(desc(householdInvitations.createdAt))

    return { invitations }

  } catch (error) {
    console.error('[getPendingInvitations] Error:', error)
    return {
      invitations: [],
      error: error instanceof Error ? error.message : 'Error al obtener invitaciones'
    }
  }
}

/**
 * Cancelar una invitación pendiente
 * Solo el owner puede cancelar
 */
export async function cancelInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser()

    // Verificar que es owner
    const isOwner = await verifyOwnership(currentUser.householdId, currentUser.id)
    if (!isOwner) {
      return { success: false, error: 'Solo el propietario puede cancelar invitaciones' }
    }

    // Verificar que la invitación existe y está pendiente
    const invitation = await db
      .select()
      .from(householdInvitations)
      .where(
        and(
          eq(householdInvitations.id, invitationId),
          eq(householdInvitations.householdId, currentUser.householdId),
          eq(householdInvitations.status, 'pending')
        )
      )
      .limit(1)

    if (!invitation.length) {
      return { success: false, error: 'Invitación no encontrada o ya no está pendiente' }
    }

    // Actualizar estado a cancelled
    await db
      .update(householdInvitations)
      .set({ status: 'cancelled' })
      .where(eq(householdInvitations.id, invitationId))

    revalidatePath('/household')
    return { success: true }

  } catch (error) {
    console.error('[cancelInvitation] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cancelar invitación'
    }
  }
}

/**
 * Reenviar email de invitación
 * Solo el owner puede reenviar
 */
export async function resendInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser()

    // Verificar que es owner
    const isOwner = await verifyOwnership(currentUser.householdId, currentUser.id)
    if (!isOwner) {
      return { success: false, error: 'Solo el propietario puede reenviar invitaciones' }
    }

    // Obtener la invitación
    const invitationData = await db
      .select({
        invitation: householdInvitations,
        household: households,
      })
      .from(householdInvitations)
      .innerJoin(households, eq(householdInvitations.householdId, households.id))
      .where(
        and(
          eq(householdInvitations.id, invitationId),
          eq(householdInvitations.householdId, currentUser.householdId),
          eq(householdInvitations.status, 'pending')
        )
      )
      .limit(1)

    if (!invitationData.length) {
      return { success: false, error: 'Invitación no encontrada o ya no está pendiente' }
    }

    const { invitation, household } = invitationData[0]

    // Verificar que no ha expirado
    if (new Date(invitation.expiresAt) < new Date()) {
      // Marcar como expirada
      await db
        .update(householdInvitations)
        .set({ status: 'expired' })
        .where(eq(householdInvitations.id, invitationId))

      return { success: false, error: 'La invitación ha expirado. Crea una nueva invitación.' }
    }

    // Construir link de invitación
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteLink = `${baseUrl}/invite/accept?token=${invitation.token}`

    // Reenviar email
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: invitation.email,
        subject: `Recordatorio: ${currentUser.name} te ha invitado a unirte a su hogar en HomeFinance`,
        react: InvitationEmail({
          inviterName: currentUser.name,
          inviterEmail: currentUser.email,
          householdName: household.name,
          inviteLink,
          expiresIn: `${Math.ceil((new Date(invitation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} días`,
        }),
      })
    } catch (emailError) {
      console.error('[Invitation] Error reenviando email:', emailError)
      return { success: false, error: 'Error al enviar el email. Inténtalo de nuevo.' }
    }

    return { success: true }

  } catch (error) {
    console.error('[resendInvitation] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al reenviar invitación'
    }
  }
}

/**
 * Validar un token de invitación
 * Público - cualquiera puede validar un token
 */
export async function validateInvitationToken(token: string): Promise<InvitationValidation> {
  try {
    if (!token || token.length !== 64) {
      return { valid: false, error: 'Token inválido' }
    }

    const invitationData = await db
      .select({
        invitation: householdInvitations,
        household: households,
        inviter: users,
      })
      .from(householdInvitations)
      .innerJoin(households, eq(householdInvitations.householdId, households.id))
      .innerJoin(users, eq(householdInvitations.invitedBy, users.id))
      .where(eq(householdInvitations.token, token))
      .limit(1)

    if (!invitationData.length) {
      return { valid: false, error: 'Invitación no encontrada' }
    }

    const { invitation, household, inviter } = invitationData[0]

    // Verificar estado
    if (invitation.status !== 'pending') {
      if (invitation.status === 'accepted') {
        return { valid: false, error: 'Esta invitación ya fue aceptada' }
      }
      if (invitation.status === 'cancelled') {
        return { valid: false, error: 'Esta invitación fue cancelada' }
      }
      if (invitation.status === 'expired') {
        return { valid: false, error: 'Esta invitación ha expirado' }
      }
      return { valid: false, error: 'Invitación no válida' }
    }

    // Verificar expiración
    if (new Date(invitation.expiresAt) < new Date()) {
      // Marcar como expirada
      await db
        .update(householdInvitations)
        .set({ status: 'expired' })
        .where(eq(householdInvitations.id, invitation.id))

      return { valid: false, error: 'Esta invitación ha expirado' }
    }

    return {
      valid: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        householdName: household.name,
        inviterName: inviter.name,
        expiresAt: invitation.expiresAt,
      },
    }

  } catch (error) {
    console.error('[validateInvitationToken] Error:', error)
    return {
      valid: false,
      error: 'Error al validar invitación'
    }
  }
}

/**
 * Aceptar una invitación
 * El usuario autenticado debe coincidir con el email de la invitación
 */
export async function acceptInvitation(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Primero validar el token
    const validation = await validateInvitationToken(token)
    if (!validation.valid || !validation.invitation) {
      return { success: false, error: validation.error || 'Invitación no válida' }
    }

    // Obtener usuario autenticado
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Debes iniciar sesión para aceptar la invitación' }
    }

    // Verificar que el email coincide
    if (user.email?.toLowerCase() !== validation.invitation.email.toLowerCase()) {
      return {
        success: false,
        error: `Esta invitación es para ${validation.invitation.email}. Inicia sesión con esa cuenta.`
      }
    }

    // Obtener datos completos del usuario
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    if (!userData.length) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    const currentUser = userData[0]

    // Obtener la invitación completa
    const invitationData = await db
      .select()
      .from(householdInvitations)
      .where(eq(householdInvitations.token, token))
      .limit(1)

    if (!invitationData.length) {
      return { success: false, error: 'Invitación no encontrada' }
    }

    const invitation = invitationData[0]
    const newHouseholdId = invitation.householdId
    const oldHouseholdId = currentUser.householdId

    // Verificar si el usuario era owner de su household anterior
    const wasOwner = await verifyOwnership(oldHouseholdId, currentUser.id)

    // Contar miembros del household anterior
    const oldHouseholdMembers = await db
      .select({ count: sql<number>`count(*)` })
      .from(householdMembers)
      .where(eq(householdMembers.householdId, oldHouseholdId))

    const memberCount = Number(oldHouseholdMembers[0]?.count || 0)

    // Si era el único miembro (owner solo), eliminar el household antiguo
    // Si había más miembros, no puede aceptar sin transferir ownership primero
    if (wasOwner && memberCount > 1) {
      return {
        success: false,
        error: 'Eres propietario de un hogar con otros miembros. Transfiere la propiedad antes de unirte a otro hogar.'
      }
    }

    // Realizar la transacción:
    // 1. Eliminar de household_members anterior
    // 2. Agregar a nuevo household_members
    // 3. Actualizar users.household_id
    // 4. Marcar invitación como aceptada
    // 5. Eliminar household anterior si estaba solo

    await db
      .delete(householdMembers)
      .where(eq(householdMembers.userId, currentUser.id))

    await db.insert(householdMembers).values({
      householdId: newHouseholdId,
      userId: currentUser.id,
      role: 'member',
    })

    await db
      .update(users)
      .set({ householdId: newHouseholdId })
      .where(eq(users.id, currentUser.id))

    await db
      .update(householdInvitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
      })
      .where(eq(householdInvitations.id, invitation.id))

    // Eliminar el household anterior si estaba solo
    if (wasOwner && memberCount === 1) {
      await db
        .delete(households)
        .where(eq(households.id, oldHouseholdId))
    }

    revalidatePath('/household')
    revalidatePath('/dashboard')
    return { success: true }

  } catch (error) {
    console.error('[acceptInvitation] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al aceptar invitación'
    }
  }
}

/**
 * Obtener historial de invitaciones (todas, no solo pendientes)
 * Solo el owner puede ver el historial
 */
export async function getInvitationHistory(): Promise<{ invitations: InvitationData[]; error?: string }> {
  try {
    const currentUser = await getCurrentUser()

    // Verificar que es owner
    const isOwner = await verifyOwnership(currentUser.householdId, currentUser.id)
    if (!isOwner) {
      return { invitations: [], error: 'Solo el propietario puede ver el historial' }
    }

    const invitations = await db
      .select({
        id: householdInvitations.id,
        email: householdInvitations.email,
        status: householdInvitations.status,
        expiresAt: householdInvitations.expiresAt,
        createdAt: householdInvitations.createdAt,
        invitedByName: users.name,
      })
      .from(householdInvitations)
      .innerJoin(users, eq(householdInvitations.invitedBy, users.id))
      .where(eq(householdInvitations.householdId, currentUser.householdId))
      .orderBy(desc(householdInvitations.createdAt))
      .limit(50)

    return { invitations }

  } catch (error) {
    console.error('[getInvitationHistory] Error:', error)
    return {
      invitations: [],
      error: error instanceof Error ? error.message : 'Error al obtener historial'
    }
  }
}
