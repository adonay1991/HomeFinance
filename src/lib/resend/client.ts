import { Resend } from 'resend'

// ==========================================
// CLIENTE RESEND PARA ENVÍO DE EMAILS
// ==========================================

// Dummy key para build (re_xxx es el formato mínimo válido)
const DUMMY_KEY = 're_dummy_key_for_build'

if (!process.env.RESEND_API_KEY) {
  console.warn('[Resend] RESEND_API_KEY no configurada - los emails no se enviarán')
}

// Usamos una key dummy si no hay configurada para evitar errores en build
export const resend = new Resend(process.env.RESEND_API_KEY || DUMMY_KEY)

export const EMAIL_FROM = process.env.EMAIL_FROM || 'HomeFinance <onboarding@resend.dev>'

// Helper para verificar si Resend está configurado correctamente
export const isResendConfigured = () => !!process.env.RESEND_API_KEY
