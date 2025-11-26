<div align="center">
  <img src="public/icons/icon-192.png" alt="HomeFinance Logo" width="80" height="80">

  # HomeFinance

  **Gestiona los gastos compartidos del hogar de forma simple y visual**

  [![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)](https://supabase.com/)
  [![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)

</div>

---

## Descripcion

HomeFinance es una **Progressive Web App (PWA)** diseñada para que familias o compañeros de piso gestionen sus gastos compartidos de manera sencilla. Permite registrar gastos, establecer presupuestos mensuales, crear metas de ahorro y visualizar el balance entre los miembros del hogar.

### Caracteristicas principales

- **Registro de gastos** con categorias y etiquetas personalizables
- **Presupuesto mensual** simple con seguimiento visual del progreso
- **Metas de ahorro** con contribuciones y seguimiento de objetivos
- **Dashboard visual** con graficos de gastos por categoria
- **Balance entre usuarios** para ver quien ha pagado mas
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
| **Autenticacion** | [Supabase Auth](https://supabase.com/auth) (Magic Link) |
| **Validacion** | [Zod 4](https://zod.dev/) |
| **Graficos** | [Recharts](https://recharts.org/) |
| **Package Manager** | [Bun](https://bun.sh/) |

---

## Inicio Rapido

### Prerrequisitos

- [Bun](https://bun.sh/) >= 1.0
- Cuenta en [Supabase](https://supabase.com/) (gratis)

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
```

### 4. Configurar la base de datos

```bash
# Generar migraciones
bun run db:generate

# Aplicar migraciones a Supabase
bun run db:push
```

> **Nota:** Tambien necesitas crear un trigger en Supabase para sincronizar usuarios de `auth.users` a la tabla `public.users`. Consulta la seccion [Configuracion de Supabase](#configuracion-de-supabase).

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
├── public/
│   ├── icons/              # Iconos PWA (72px - 512px)
│   ├── manifest.json       # Configuracion PWA
│   └── sw.js              # Service Worker
├── scripts/
│   └── generate-icons.mjs  # Script para generar iconos PWA
├── src/
│   ├── app/
│   │   ├── (auth)/        # Rutas de autenticacion (login)
│   │   ├── (protected)/   # Rutas protegidas (dashboard, expenses, goals)
│   │   ├── auth/          # Callback de autenticacion
│   │   ├── offline/       # Pagina offline
│   │   └── layout.tsx     # Layout raiz con metadata PWA
│   ├── components/
│   │   ├── alerts/        # Alertas de presupuesto
│   │   ├── budgets/       # Configuracion de presupuesto
│   │   ├── charts/        # Graficos (Recharts)
│   │   ├── expenses/      # Lista y formularios de gastos
│   │   ├── layout/        # Header, BottomNav
│   │   ├── pwa/           # Registro de Service Worker
│   │   ├── savings/       # Metas de ahorro
│   │   └── ui/            # Componentes shadcn/ui
│   ├── hooks/             # Custom hooks
│   ├── lib/
│   │   ├── actions/       # Server Actions (expenses, savings, budgets)
│   │   ├── auth/          # Helpers de autenticacion
│   │   ├── db/            # Schema Drizzle y conexion
│   │   ├── supabase/      # Clientes Supabase (server/client)
│   │   └── validations/   # Schemas Zod
│   └── proxy.ts           # Middleware de autenticacion
├── drizzle.config.ts      # Configuracion Drizzle
└── package.json
```

---

## Modelo de Datos

```
┌─────────────┐     ┌─────────────────┐
│   users     │     │    expenses     │
├─────────────┤     ├─────────────────┤
│ id (PK)     │◄────│ paid_by (FK)    │
│ email       │     │ id (PK)         │
│ name        │     │ household_id    │
│ household_id│     │ amount          │
│ created_at  │     │ description     │
└─────────────┘     │ category        │
                    │ tags[]          │
                    │ date            │
                    └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│ savings_goals   │  │    budgets      │
├─────────────────┤  ├─────────────────┤
│ id (PK)         │  │ id (PK)         │
│ household_id    │  │ household_id    │
│ name            │  │ category        │
│ target_amount   │  │ monthly_limit   │
│ current_amount  │  │ year            │
│ deadline        │  │ month           │
│ status          │  └─────────────────┘
└─────────────────┘
```

### Categorias de gastos

- `comida` - Alimentacion y supermercado
- `facturas` - Servicios (luz, agua, internet)
- `transporte` - Gasolina, transporte publico
- `ocio` - Entretenimiento, restaurantes
- `hogar` - Mantenimiento, muebles
- `salud` - Farmacia, medicos
- `otros` - Gastos varios

---

## Configuracion de Supabase

### 1. Crear proyecto

1. Ve a [supabase.com](https://supabase.com/) y crea un nuevo proyecto
2. Copia la URL y la Anon Key desde Settings > API

### 2. Configurar autenticacion

1. En Authentication > Providers, habilita "Email"
2. Desactiva "Confirm email" para desarrollo (opcional)
3. Configura el Site URL en Authentication > URL Configuration

### 3. Crear trigger para sincronizar usuarios

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Funcion para crear usuario en public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, household_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.id  -- Usar el mismo ID como household_id inicial
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que ejecuta la funcion al crear usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4. Configurar Row Level Security (RLS)

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Politica: usuarios solo ven datos de su household
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
```

---

## Instalacion como PWA

### En iOS (iPhone/iPad)

1. Abre **Safari** (obligatorio)
2. Navega a la URL de la aplicacion
3. Toca el boton **Compartir** (icono cuadrado con flecha)
4. Selecciona **"Añadir a pantalla de inicio"**
5. Toca **"Añadir"**

### En Android

1. Abre **Chrome**
2. Navega a la URL de la aplicacion
3. Toca el menu (tres puntos)
4. Selecciona **"Instalar aplicacion"** o **"Añadir a pantalla de inicio"**

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

## Roadmap

- [x] **Fase 1:** Autenticacion con Magic Link
- [x] **Fase 2:** CRUD de gastos con categorias
- [x] **Fase 3:** Dashboard con graficos
- [x] **Fase 4:** Presupuesto mensual
- [x] **Fase 5:** Metas de ahorro
- [x] **Fase 6:** PWA (manifest, iconos, offline)
- [ ] **Fase 7:** Notificaciones push
- [ ] **Fase 8:** Exportar datos (CSV/PDF)
- [ ] **Fase 9:** Soporte multi-hogar
- [ ] **Fase 10:** Gastos recurrentes automaticos

---

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## Licencia

Este proyecto esta bajo la licencia MIT. Ver el archivo [LICENSE](LICENSE) para mas detalles.

---

<div align="center">
  <p>Hecho con ❤️ para gestionar mejor las finanzas del hogar</p>
</div>
