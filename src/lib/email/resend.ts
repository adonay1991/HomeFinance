'use server'

import { Resend } from 'resend'

// ==========================================
// SERVICIO DE EMAIL CON RESEND
// ==========================================
// Usamos Resend para enviar emails transaccionales
// como códigos OTP de recuperación de contraseña.
//
// Configuración requerida:
// - RESEND_API_KEY en variables de entorno
// - Dominio verificado en Resend (o usar onboarding@resend.dev para testing)

const resend = new Resend(process.env.RESEND_API_KEY)

// Email desde el que se envían los correos
// En producción debe ser un dominio verificado
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'HomeFinance <onboarding@resend.dev>'

/**
 * Envía un código OTP de 6 dígitos para recuperación de contraseña
 */
export async function sendPasswordResetEmail(email: string, code: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Tu código de recuperación - HomeFinance',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 48px; height: 48px; background: #10b981; border-radius: 12px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px;">🏠</span>
              </div>
              <h1 style="margin: 0; font-size: 20px; color: #111;">HomeFinance</h1>
            </div>

            <p style="color: #333; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
              Has solicitado restablecer tu contraseña. Usa este código de 6 dígitos:
            </p>

            <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
              <span style="font-family: 'SF Mono', Monaco, monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #059669;">
                ${code}
              </span>
            </div>

            <p style="color: #666; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
              Este código expira en <strong>10 minutos</strong>.
            </p>

            <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 0;">
              Si no solicitaste este código, puedes ignorar este email.
            </p>
          </div>

          <p style="text-align: center; color: #999; font-size: 11px; margin-top: 16px;">
            © ${new Date().getFullYear()} HomeFinance
          </p>
        </body>
        </html>
      `,
      text: `Tu código de recuperación de HomeFinance es: ${code}\n\nEste código expira en 10 minutos.\n\nSi no solicitaste este código, ignora este email.`,
    })

    if (error) {
      console.error('[Email] Error sending password reset:', error)
      return { success: false, error: error.message }
    }

    console.log('[Email] Password reset email sent:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Exception sending email:', error)
    return { success: false, error: 'Error al enviar el email' }
  }
}
