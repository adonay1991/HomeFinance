<div align="center">
  <img src="public/icons/icon-192.png" alt="HomeFinance Logo" width="80" height="80">

  # HomeFinance

  **Gestiona los gastos compartidos del hogar de forma simple y visual**

  [![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)](https://supabase.com/)
  [![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)

  [Demo en vivo](https://homefinance-tau.vercel.app) | [Documentacion](#documentacion)

</div>

---

## Descripcion

HomeFinance es una **Progressive Web App (PWA)** disenada para que familias o companeros de piso gestionen sus gastos compartidos de manera sencilla. Permite registrar gastos, establecer presupuestos mensuales, crear metas de ahorro, conectar cuentas bancarias y visualizar el balance entre los miembros del hogar.

### Caracteristicas principales

- **Registro de gastos** con categorias y etiquetas personalizables
- **Presupuesto mensual** simple con seguimiento visual del progreso
- **Metas de ahorro** con contribuciones y seguimiento de objetivos
- **Dashboard visual** con graficos de gastos por categoria
- **Hogares compartidos** - Invita a otros miembros con codigo de 6 caracteres
- **Balance entre usuarios** para ver quien debe a quien
- **Liquidaciones** - Registra pagos entre miembros para saldar deudas
- **Open Banking** - Conecta cuentas bancarias reales (Enable Banking API)
- **Gastos recurrentes** - Automatiza facturas mensuales
- **Modo oscuro/claro** con deteccion automatica del sistema
- **Instalable como app** en moviles (iOS y Android)
- **Modo offline** basico con Service Worker

---

## Stack Tecnologico

| Categoria | Tecnologia |
|-----------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) con App Router y Turbopack |
| **Frontend** | [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) |
| **Estilos** | [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Base de datos** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) |
| **Autenticacion** | [Supabase Auth](https://supabase.com/auth) (Magic Link + Password) |
| **Open Banking** | [Enable Banking](https://enablebanking.com/) (PSD2/Open Banking API) |
| **Email** | [Resend](https://resend.com/) (preparado para futuro) |
| **Validacion** | [Zod 4](https://zod.dev/) |
| **Graficos** | [Recharts](https://recharts.org/) |
| **Package Manager** | [Bun](https://bun.sh/) |

---

## Inicio Rapido

### Prerrequisitos

- [Bun](https://bun.sh/) >= 1.0
- Cuenta en [Supabase](https://supabase.com/) (gratis)
- (Opcional) Cuenta en [Enable Banking](https://enablebanking.com/) para conexion bancaria

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/homefinance.git
cd homefinance
```

### 2. Instalar dependencias

```bash
bun install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raiz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# Base de datos (conexion directa para Drizzle)
DATABASE_URL=postgresql://postgres:password@db.tu-proyecto.supabase.co:5432/postgres

# Enable Banking (Open Banking API) - Opcional
ENABLE_BANKING_APP_ID=tu-app-id
ENABLE_BANKING_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...tu-clave-privada...
-----END PRIVATE KEY-----"

# URL base de la app
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
NEXT_PUBLIC_APP_URL=https://tu-dominio.com

# Resend (Email) - Opcional, ver docs/RESEND_EMAIL_SETUP.md
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=HomeFinance <noreply@tu-dominio.com>
```

### 4. Configurar la base de datos

```bash
# Generar migraciones
bun run db:generate

# Aplicar migraciones a Supabase
bun run db:push
```

> **Nota:** Tambien necesitas crear triggers en Supabase. Consulta la seccion [Configuracion de Supabase](#configuracion-de-supabase).

### 5. Ejecutar en desarrollo

```bash
bun dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Scripts Disponibles

| Script | Descripcion |
|--------|-------------|
| `bun dev` | Inicia el servidor de desarrollo con Turbopack |
| `bun build` | Genera build de produccion |
| `bun start` | Inicia el servidor de produccion |
| `bun lint` | Ejecuta ESLint |
| `bun db:generate` | Genera migraciones de Drizzle |
| `bun db:push` | Aplica cambios de schema a la BD |
| `bun db:studio` | Abre Drizzle Studio para explorar la BD |

---

## Estructura del Proyecto

```
homefinance/
├── docs/
│   └── RESEND_EMAIL_SETUP.md  # Guia para activar emails
├── public/
│   ├── icons/                  # Iconos PWA (72px - 512px)
│   ├── manifest.json           # Configuracion PWA
│   └── sw.js                   # Service Worker
├── scripts/
│   └── generate-icons.mjs      # Script para generar iconos PWA
├── src/
│   ├── app/
│   │   ├── (auth)/             # Rutas de autenticacion
│   │   │   ├── login/          # Pagina de login
│   │   │   ├── reset-password/ # Recuperar contrasena
│   │   │   └── update-password/# Actualizar contrasena
│   │   ├── (protected)/        # Rutas protegidas (requieren auth)
│   │   │   ├── /               # Dashboard principal
│   │   │   ├── add/            # Anadir gasto/meta
│   │   │   ├── expenses/       # Lista de gastos
│   │   │   ├── goals/          # Metas de ahorro
│   │   │   ├── household/      # Gestion del hogar
│   │   │   └── profile/        # Perfil y configuracion
│   │   ├── api/
│   │   │   ├── bank/           # API de Open Banking
│   │   │   │   ├── balance/    # Consultar saldos
│   │   │   │   ├── callback/   # Callback OAuth bancario
│   │   │   │   ├── connect/    # Conectar cuenta
│   │   │   │   ├── disconnect/ # Desconectar cuenta
│   │   │   │   ├── institutions/# Listar bancos
│   │   │   │   ├── status/     # Estado conexion
│   │   │   │   └── sync/       # Sincronizar transacciones
│   │   │   └── invite/         # API de invitaciones (email)
│   │   ├── auth/callback/      # Callback de Supabase Auth
│   │   ├── invite/accept/      # Aceptar invitacion por email
│   │   └── offline/            # Pagina offline
│   ├── components/
│   │   ├── alerts/             # Alertas de presupuesto
│   │   ├── auth/               # Componentes de autenticacion
│   │   ├── bank/               # Conexion bancaria
│   │   ├── budgets/            # Configuracion de presupuesto
│   │   ├── charts/             # Graficos (Recharts)
│   │   ├── dashboard/          # Widgets del dashboard
│   │   ├── expenses/           # Lista y formularios de gastos
│   │   ├── household/          # Gestion de hogar compartido
│   │   │   ├── household-card  # Info del hogar + codigo invitacion
│   │   │   ├── members-list    # Lista de miembros
│   │   │   ├── balances-card   # Balances quien debe a quien
│   │   │   ├── join-household  # Formulario unirse con codigo
│   │   │   └── invite-form     # Formulario email (futuro)
│   │   ├── layout/             # Header, BottomNav
│   │   ├── pwa/                # Registro de Service Worker
│   │   ├── recurring/          # Gastos recurrentes
│   │   ├── savings/            # Metas de ahorro
│   │   ├── theme/              # Theme provider (dark/light)
│   │   └── ui/                 # Componentes shadcn/ui
│   ├── emails/
│   │   └── invitation-email.tsx # Template React Email
│   ├── hooks/                  # Custom hooks
│   ├── lib/
│   │   ├── actions/            # Server Actions
│   │   │   ├── expenses.ts     # CRUD gastos
│   │   │   ├── savings.ts      # CRUD metas
│   │   │   ├── budgets.ts      # CRUD presupuestos
│   │   │   ├── household.ts    # Gestion hogar
│   │   │   ├── invitations.ts  # Invitaciones email
│   │   │   └── recurring.ts    # Gastos recurrentes
│   │   ├── auth/               # Helpers de autenticacion
│   │   ├── db/                 # Schema Drizzle y conexion
│   │   ├── enablebanking/      # Cliente Enable Banking
│   │   ├── resend/             # Cliente Resend
│   │   ├── supabase/           # Clientes Supabase (server/client)
│   │   └── validations/        # Schemas Zod
│   └── middleware.ts           # Middleware de autenticacion
├── drizzle/
│   └── migrations/             # Migraciones SQL
└── drizzle.config.ts           # Configuracion Drizzle
```

---

## Modelo de Datos

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   households    │     │     users       │     │    expenses     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │◄────│ household_id    │     │ id (PK)         │
│ name            │     │ id (PK)         │◄────│ paid_by (FK)    │
│ invite_code     │     │ email           │     │ household_id    │
│ owner_id (FK)   │────►│ name            │     │ amount          │
│ created_at      │     │ created_at      │     │ description     │
└─────────────────┘     └─────────────────┘     │ category        │
                                                │ tags[]          │
                                                │ date            │
                                                │ is_recurring    │
                                                └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ savings_goals   │     │    budgets      │     │  settlements    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ household_id    │     │ household_id    │     │ household_id    │
│ name            │     │ category        │     │ from_user (FK)  │
│ target_amount   │     │ monthly_limit   │     │ to_user (FK)    │
│ current_amount  │     │ year            │     │ amount          │
│ deadline        │     │ month           │     │ note            │
│ status          │     └─────────────────┘     │ settled_at      │
└─────────────────┘                             └─────────────────┘

┌─────────────────────┐     ┌─────────────────┐
│ household_members   │     │ bank_connections│
├─────────────────────┤     ├─────────────────┤
│ id (PK)             │     │ id (PK)         │
│ household_id (FK)   │     │ user_id (FK)    │
│ user_id (FK)        │     │ institution_id  │
│ role (owner/member) │     │ session_id      │
│ joined_at           │     │ status          │
└─────────────────────┘     │ last_sync       │
                            └─────────────────┘

┌─────────────────────┐
│household_invitations│
├─────────────────────┤
│ id (PK)             │
│ household_id (FK)   │
│ email               │
│ token               │
│ status              │
│ expires_at          │
└─────────────────────┘
```

### Categorias de gastos

| Icono | Categoria | Descripcion |
|-------|-----------|-------------|
| 🛒 | `comida` | Alimentacion y supermercado |
| 📄 | `facturas` | Servicios (luz, agua, internet) |
| 🚗 | `transporte` | Gasolina, transporte publico |
| 🎉 | `ocio` | Entretenimiento, restaurantes |
| 🏠 | `hogar` | Mantenimiento, muebles |
| 💊 | `salud` | Farmacia, medicos |
| 📦 | `otros` | Gastos varios |

---

## Funcionalidades Detalladas

### Hogares Compartidos

El sistema permite que multiples usuarios compartan gastos en un hogar comun:

1. **Crear hogar**: Al registrarte, se crea automaticamente tu hogar
2. **Invitar miembros**: Comparte el codigo de 6 caracteres (ej: `ABC123`)
3. **Unirse a hogar**: Otros usuarios pueden unirse introduciendo el codigo
4. **Balances**: El sistema calcula automaticamente quien debe a quien
5. **Liquidaciones**: Registra pagos entre miembros para saldar deudas

### Open Banking (Enable Banking)

Conecta tus cuentas bancarias reales para sincronizar transacciones automaticamente:

1. Ve a **Perfil > Conectar banco**
2. Selecciona tu banco de la lista (50+ bancos espanoles)
3. Autoriza el acceso via OAuth del banco
4. Tus transacciones se sincronizaran automaticamente

> **Nota:** Requiere configurar credenciales de Enable Banking. [Mas info](https://enablebanking.com/)

### Gastos Recurrentes

Automatiza facturas mensuales que se repiten:

1. Al crear un gasto, marca "Es recurrente"
2. Configura el dia del mes y la periodicidad
3. El sistema creara automaticamente el gasto cada mes

### Modo Oscuro

La app detecta automaticamente el tema del sistema y se adapta. Tambien puedes cambiarlo manualmente desde el perfil.

---

## Configuracion de Supabase

### 1. Crear proyecto

1. Ve a [supabase.com](https://supabase.com/) y crea un nuevo proyecto
2. Copia la URL y la Anon Key desde Settings > API

### 2. Configurar autenticacion

1. En Authentication > Providers, habilita "Email"
2. Configura el Site URL en Authentication > URL Configuration:
   - Site URL: `https://tu-dominio.com`
   - Redirect URLs: `https://tu-dominio.com/auth/callback`

### 3. Crear trigger para sincronizar usuarios

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Funcion para crear usuario y hogar automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_household_id uuid;
  invite_code text;
BEGIN
  -- Generar codigo de invitacion unico
  invite_code := upper(substring(md5(random()::text) from 1 for 6));

  -- Crear el hogar
  INSERT INTO public.households (name, invite_code, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)) || '''s Home',
    invite_code,
    NEW.id
  )
  RETURNING id INTO new_household_id;

  -- Crear el usuario
  INSERT INTO public.users (id, email, name, household_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    new_household_id
  );

  -- Crear membresia como owner
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (new_household_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que ejecuta la funcion al crear usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4. Configurar Row Level Security (RLS)

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Politica: usuarios solo ven datos de su household
CREATE POLICY "Users can view own household" ON households
  FOR ALL USING (
    id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view own household data" ON expenses
  FOR ALL USING (
    household_id = (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view own household goals" ON savings_goals
  FOR ALL USING (
    household_id = (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view own household budgets" ON budgets
  FOR ALL USING (
    household_id = (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view own household settlements" ON settlements
  FOR ALL USING (
    household_id = (SELECT household_id FROM users WHERE id = auth.uid())
  );
```

---

## Instalacion como PWA

### En iOS (iPhone/iPad)

1. Abre **Safari** (obligatorio)
2. Navega a la URL de la aplicacion
3. Toca el boton **Compartir** (icono cuadrado con flecha)
4. Selecciona **"Anadir a pantalla de inicio"**
5. Toca **"Anadir"**

### En Android

1. Abre **Chrome**
2. Navega a la URL de la aplicacion
3. Toca el menu (tres puntos)
4. Selecciona **"Instalar aplicacion"** o **"Anadir a pantalla de inicio"**

### En Desktop (Chrome/Edge)

1. Navega a la URL de la aplicacion
2. Haz clic en el icono de instalacion en la barra de direcciones
3. Confirma la instalacion

---

## Despliegue

### Vercel (Recomendado)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tu-usuario/homefinance)

1. Conecta tu repositorio de GitHub
2. Configura las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL`
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_APP_URL`
   - (Opcional) `ENABLE_BANKING_APP_ID`
   - (Opcional) `ENABLE_BANKING_PRIVATE_KEY`
   - (Opcional) `RESEND_API_KEY`
3. Deploy!

### Docker

```dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["bun", "server.js"]
```

---

## Documentacion

| Documento | Descripcion |
|-----------|-------------|
| [RESEND_EMAIL_SETUP.md](docs/RESEND_EMAIL_SETUP.md) | Como activar invitaciones por email |

---

## Roadmap

- [x] **Fase 1:** Autenticacion con Magic Link
- [x] **Fase 2:** CRUD de gastos con categorias
- [x] **Fase 3:** Dashboard con graficos
- [x] **Fase 4:** Presupuesto mensual
- [x] **Fase 5:** Metas de ahorro
- [x] **Fase 6:** PWA (manifest, iconos, offline)
- [x] **Fase 7:** Open Banking (Enable Banking)
- [x] **Fase 8:** Hogares compartidos con balances
- [x] **Fase 9:** Sistema de invitaciones (codigo 6 chars)
- [x] **Fase 10:** Liquidaciones entre miembros
- [x] **Fase 11:** Modo oscuro/claro
- [ ] **Fase 12:** Invitaciones por email (requiere dominio propio)
- [ ] **Fase 13:** Notificaciones push
- [ ] **Fase 14:** Exportar datos (CSV/PDF)
- [ ] **Fase 15:** Gastos recurrentes automaticos
- [ ] **Fase 16:** Multi-idioma (i18n)

---

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Anadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## Licencia

Este proyecto esta bajo la licencia MIT. Ver el archivo [LICENSE](LICENSE) para mas detalles.

---

<div align="center">
  <p>Hecho con amor para gestionar mejor las finanzas del hogar</p>
</div>
