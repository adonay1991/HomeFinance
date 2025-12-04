import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

// ==========================================
// TEMPLATE DE EMAIL PARA INVITACIÓN A HOGAR
// ==========================================

interface InvitationEmailProps {
  inviterName: string
  inviterEmail: string
  householdName: string
  inviteLink: string
  expiresIn: string
}

export function InvitationEmail({
  inviterName = 'Un usuario',
  inviterEmail = 'email@ejemplo.com',
  householdName = 'Mi Hogar',
  inviteLink = 'https://homefinance.app/invite/accept?token=xxx',
  expiresIn = '7 días',
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} te ha invitado a unirte a su hogar en HomeFinance
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <Text style={logoIcon}>🏠</Text>
            <Text style={logoText}>HomeFinance</Text>
          </Section>

          <Hr style={hr} />

          <Heading style={heading}>Te han invitado a un hogar</Heading>

          <Text style={paragraph}>
            <strong>{inviterName}</strong> ({inviterEmail}) te ha invitado a
            unirte al hogar <strong>&quot;{householdName}&quot;</strong> en HomeFinance.
          </Text>

          <Text style={paragraph}>
            HomeFinance te permite gestionar los gastos compartidos del hogar,
            establecer presupuestos y objetivos de ahorro con tu familia o
            compañeros de piso.
          </Text>

          <Section style={buttonSection}>
            <Button style={button} href={inviteLink}>
              Aceptar invitación
            </Button>
          </Section>

          <Text style={smallText}>
            O copia y pega este enlace en tu navegador:
          </Text>
          <Text style={linkText}>
            <Link href={inviteLink} style={link}>
              {inviteLink}
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footerText}>
            Esta invitación expira en {expiresIn}. Si no esperabas este email,
            puedes ignorarlo.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// ==========================================
// ESTILOS (inline para compatibilidad email)
// ==========================================

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
  borderRadius: '8px',
}

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const logoIcon = {
  fontSize: '48px',
  margin: '0 0 8px 0',
}

const logoText = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1a1a1a',
  margin: '0',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
}

const heading = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#0f172a',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const smallText = {
  color: '#8898aa',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0 0 8px',
}

const linkText = {
  textAlign: 'center' as const,
  margin: '0 0 24px',
}

const link = {
  color: '#556cd6',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
}

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0',
}

export default InvitationEmail
