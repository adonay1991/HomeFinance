# Configuración de Emails con Resend

## Estado Actual

**Fecha:** Diciembre 2024
**Estado:** Implementado pero deshabilitado temporalmente

## Por qué no está activo

El sistema de invitaciones por email con Resend está completamente implementado, pero **no está activo en producción** debido a una limitación del modo sandbox de Resend:

### Limitación del Sandbox

- **Dominio actual:** `onboarding@resend.dev` (sandbox de Resend)
- **Restricción:** En modo sandbox, solo se pueden enviar emails a la dirección verificada del propietario de la cuenta de Resend
- **Problema:** No podemos verificar `homefinance-tau.vercel.app` porque es un subdominio de Vercel, no un dominio propio

### Decisión Tomada

En lugar de emails, usamos el **código de invitación de 6 caracteres** que se puede compartir manualmente (WhatsApp, verbal, etc.). Esta solución:
- No requiere configuración de dominio
- Funciona inmediatamente
- Es igual de seguro para uso doméstico

---

## Cómo Activar en el Futuro

### Requisitos

1. **Dominio propio** (ej: `homefinance.app`, `tudominio.com`)
2. **Acceso a DNS** del dominio para configurar registros

### Pasos para Activar

#### 1. Verificar dominio en Resend

1. Ir a [Resend Dashboard](https://resend.com/domains)
2. Click en "Add Domain"
3. Introducir tu dominio (ej: `homefinance.app`)
4. Resend te dará registros DNS para añadir:

```
Tipo: MX
Host: send
Value: feedback-smtp.resend.com
Priority: 10

Tipo: TXT
Host: send
Value: v=spf1 include:_spf.resend.com ~all

Tipo: TXT (DKIM)
Host: resend._domainkey
Value: [proporcionado por Resend]
```

5. Esperar verificación (puede tardar hasta 48h)

#### 2. Actualizar variables de entorno

```bash
# .env.local y Vercel Environment Variables
RESEND_API_KEY=re_V7Bfd1ZZ_DegVfXyr25FJZUdAUCpTozpX
EMAIL_FROM=HomeFinance <noreply@tudominio.com>
```

#### 3. Actualizar URL base

```bash
NEXT_PUBLIC_APP_URL=https://tudominio.com
```

---

## Archivos Implementados

Todo el código ya está listo, solo falta el dominio verificado:

### Backend
- `src/lib/resend/client.ts` - Cliente Resend configurado
- `src/lib/actions/invitations.ts` - Server actions para invitaciones
- `src/app/api/invite/route.ts` - API REST endpoint

### Email Template
- `src/emails/invitation-email.tsx` - Template React Email

### Frontend
- `src/components/household/invite-form.tsx` - Formulario de invitación
- `src/app/invite/accept/page.tsx` - Página para aceptar invitación

---

## Funcionalidades del Sistema de Email

Cuando se active, el flujo será:

1. **Owner envía invitación** → Introduce email en `/household`
2. **Sistema genera token** → 64 caracteres hexadecimales seguros
3. **Resend envía email** → Template bonito con botón "Aceptar"
4. **Invitado hace click** → Llega a `/invite/accept?token=xxx`
5. **Validación** → Verifica token válido + email coincide con usuario autenticado
6. **Aceptación** → Usuario se une al hogar

### Características implementadas:
- Tokens seguros de 64 chars (crypto.randomBytes)
- Expiración de 7 días
- Cancelar invitaciones pendientes
- Reenviar email
- Validación de email duplicado
- Prevención de auto-invitación

---

## API Key Actual

```
RESEND_API_KEY=re_V7Bfd1ZZ_DegVfXyr25FJZUdAUCpTozpX
```

Esta key está configurada en `.env.local` y lista para usar cuando se verifique un dominio.

---

## Alternativa Actual: Código de 6 Caracteres

Mientras tanto, el sistema funciona con códigos de invitación:

1. El owner ve el código en `/household` (ej: `ABC123`)
2. Lo comparte por WhatsApp, verbal, etc.
3. El invitado va a `/household` y lo introduce
4. Se une inmediatamente al hogar

**Ventajas:**
- Sin configuración de dominio
- Funciona inmediatamente
- Fácil de compartir verbalmente

**Desventajas:**
- Menos "profesional" que un email
- Requiere comunicación manual
