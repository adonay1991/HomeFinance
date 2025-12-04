<div align="center">
  <img src="public/icons/icon-192.png" alt="HomeFinance Logo" width="80" height="80">

  # HomeFinance

  **Manage shared household expenses simply and visually**

  [![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)](https://supabase.com/)
  [![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)

  [Live Demo](https://homefinance-tau.vercel.app) | [Documentation](#documentation)

</div>

---

## Description

HomeFinance is a **Progressive Web App (PWA)** designed for families or roommates to manage their shared expenses easily. It allows you to track expenses, set monthly budgets, create savings goals, connect bank accounts, and visualize balances between household members.

### Key Features

- **Expense tracking** with customizable categories and tags
- **Monthly budget** with visual progress tracking
- **Savings goals** with contributions and objective tracking
- **Visual dashboard** with expense charts by category
- **Shared households** - Invite members with a 6-character code
- **User balances** to see who owes whom
- **Settlements** - Record payments between members to settle debts
- **Open Banking** - Connect real bank accounts (Enable Banking API)
- **Recurring expenses** - Automate monthly bills
- **Dark/Light mode** with automatic system detection
- **Installable as app** on mobile devices (iOS and Android)
- **Basic offline mode** with Service Worker

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) with App Router and Turbopack |
| **Frontend** | [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) |
| **Authentication** | [Supabase Auth](https://supabase.com/auth) (Magic Link + Password) |
| **Open Banking** | [Enable Banking](https://enablebanking.com/) (PSD2/Open Banking API) |
| **Email** | [Resend](https://resend.com/) (prepared for future use) |
| **Validation** | [Zod 4](https://zod.dev/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Package Manager** | [Bun](https://bun.sh/) |

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- [Supabase](https://supabase.com/) account (free tier available)
- (Optional) [Enable Banking](https://enablebanking.com/) account for bank connections

### 1. Clone the repository

```bash
git clone https://github.com/your-username/homefinance.git
cd homefinance
```

### 2. Install dependencies

```bash
bun install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Database (direct connection for Drizzle)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Enable Banking (Open Banking API) - Optional
ENABLE_BANKING_APP_ID=your-app-id
ENABLE_BANKING_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...your-private-key...
-----END PRIVATE KEY-----"

# App base URL
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Resend (Email) - Optional, see docs/RESEND_EMAIL_SETUP.md
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=HomeFinance <noreply@your-domain.com>
```

### 4. Set up the database

```bash
# Generate migrations
bun run db:generate

# Apply migrations to Supabase
bun run db:push
```

> **Note:** You also need to create triggers in Supabase. See the [Supabase Configuration](#supabase-configuration) section.

### 5. Run in development

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun dev` | Start development server with Turbopack |
| `bun build` | Generate production build |
| `bun start` | Start production server |
| `bun lint` | Run ESLint |
| `bun db:generate` | Generate Drizzle migrations |
| `bun db:push` | Apply schema changes to database |
| `bun db:studio` | Open Drizzle Studio to explore the database |

---

## Project Structure

```
homefinance/
├── docs/
│   └── RESEND_EMAIL_SETUP.md  # Guide to enable email invitations
├── public/
│   ├── icons/                  # PWA icons (72px - 512px)
│   ├── manifest.json           # PWA configuration
│   └── sw.js                   # Service Worker
├── scripts/
│   └── generate-icons.mjs      # Script to generate PWA icons
├── src/
│   ├── app/
│   │   ├── (auth)/             # Authentication routes
│   │   │   ├── login/          # Login page
│   │   │   ├── reset-password/ # Password recovery
│   │   │   └── update-password/# Update password
│   │   ├── (protected)/        # Protected routes (require auth)
│   │   │   ├── /               # Main dashboard
│   │   │   ├── add/            # Add expense/goal
│   │   │   ├── expenses/       # Expense list
│   │   │   ├── goals/          # Savings goals
│   │   │   ├── household/      # Household management
│   │   │   └── profile/        # Profile and settings
│   │   ├── api/
│   │   │   ├── bank/           # Open Banking API
│   │   │   │   ├── balance/    # Check balances
│   │   │   │   ├── callback/   # Bank OAuth callback
│   │   │   │   ├── connect/    # Connect account
│   │   │   │   ├── disconnect/ # Disconnect account
│   │   │   │   ├── institutions/# List banks
│   │   │   │   ├── status/     # Connection status
│   │   │   │   └── sync/       # Sync transactions
│   │   │   └── invite/         # Email invitations API
│   │   ├── auth/callback/      # Supabase Auth callback
│   │   ├── invite/accept/      # Accept email invitation
│   │   └── offline/            # Offline page
│   ├── components/
│   │   ├── alerts/             # Budget alerts
│   │   ├── auth/               # Authentication components
│   │   ├── bank/               # Bank connection
│   │   ├── budgets/            # Budget configuration
│   │   ├── charts/             # Charts (Recharts)
│   │   ├── dashboard/          # Dashboard widgets
│   │   ├── expenses/           # Expense list and forms
│   │   ├── household/          # Shared household management
│   │   │   ├── household-card  # Household info + invite code
│   │   │   ├── members-list    # Members list
│   │   │   ├── balances-card   # Who owes whom balances
│   │   │   ├── join-household  # Join with code form
│   │   │   └── invite-form     # Email form (future)
│   │   ├── layout/             # Header, BottomNav
│   │   ├── pwa/                # Service Worker registration
│   │   ├── recurring/          # Recurring expenses
│   │   ├── savings/            # Savings goals
│   │   ├── theme/              # Theme provider (dark/light)
│   │   └── ui/                 # shadcn/ui components
│   ├── emails/
│   │   └── invitation-email.tsx # React Email template
│   ├── hooks/                  # Custom hooks
│   ├── lib/
│   │   ├── actions/            # Server Actions
│   │   │   ├── expenses.ts     # Expenses CRUD
│   │   │   ├── savings.ts      # Goals CRUD
│   │   │   ├── budgets.ts      # Budgets CRUD
│   │   │   ├── household.ts    # Household management
│   │   │   ├── invitations.ts  # Email invitations
│   │   │   └── recurring.ts    # Recurring expenses
│   │   ├── auth/               # Authentication helpers
│   │   ├── db/                 # Drizzle schema and connection
│   │   ├── enablebanking/      # Enable Banking client
│   │   ├── resend/             # Resend client
│   │   ├── supabase/           # Supabase clients (server/client)
│   │   └── validations/        # Zod schemas
│   └── middleware.ts           # Authentication middleware
├── drizzle/
│   └── migrations/             # SQL migrations
└── drizzle.config.ts           # Drizzle configuration
```

---

## Data Model

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

### Expense Categories

| Icon | Category | Description |
|------|----------|-------------|
| 🛒 | `comida` | Food and groceries |
| 📄 | `facturas` | Bills (electricity, water, internet) |
| 🚗 | `transporte` | Gas, public transportation |
| 🎉 | `ocio` | Entertainment, restaurants |
| 🏠 | `hogar` | Home maintenance, furniture |
| 💊 | `salud` | Pharmacy, medical |
| 📦 | `otros` | Miscellaneous |

---

## Detailed Features

### Shared Households

The system allows multiple users to share expenses in a common household:

1. **Create household**: A household is automatically created when you register
2. **Invite members**: Share the 6-character code (e.g., `ABC123`)
3. **Join household**: Other users can join by entering the code
4. **Balances**: The system automatically calculates who owes whom
5. **Settlements**: Record payments between members to settle debts

### Open Banking (Enable Banking)

Connect your real bank accounts to automatically sync transactions:

1. Go to **Profile > Connect Bank**
2. Select your bank from the list (50+ Spanish banks supported)
3. Authorize access via the bank's OAuth
4. Your transactions will sync automatically

> **Note:** Requires Enable Banking credentials configuration. [More info](https://enablebanking.com/)

### Recurring Expenses

Automate monthly bills that repeat:

1. When creating an expense, mark "Is recurring"
2. Configure the day of the month and frequency
3. The system will automatically create the expense each month

### Dark Mode

The app automatically detects your system theme and adapts. You can also change it manually from your profile.

---

## Supabase Configuration

### 1. Create project

1. Go to [supabase.com](https://supabase.com/) and create a new project
2. Copy the URL and Anon Key from Settings > API

### 2. Configure authentication

1. In Authentication > Providers, enable "Email"
2. Configure the Site URL in Authentication > URL Configuration:
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/auth/callback`

### 3. Create trigger to sync users

Run this SQL in Supabase's SQL Editor:

```sql
-- Function to automatically create user and household
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_household_id uuid;
  invite_code text;
BEGIN
  -- Generate unique invite code
  invite_code := upper(substring(md5(random()::text) from 1 for 6));

  -- Create the household
  INSERT INTO public.households (name, invite_code, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)) || '''s Home',
    invite_code,
    NEW.id
  )
  RETURNING id INTO new_household_id;

  -- Create the user
  INSERT INTO public.users (id, email, name, household_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    new_household_id
  );

  -- Create membership as owner
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (new_household_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger that executes the function when user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4. Configure Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their household's data
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

## PWA Installation

### On iOS (iPhone/iPad)

1. Open **Safari** (required)
2. Navigate to the application URL
3. Tap the **Share** button (square icon with arrow)
4. Select **"Add to Home Screen"**
5. Tap **"Add"**

### On Android

1. Open **Chrome**
2. Navigate to the application URL
3. Tap the menu (three dots)
4. Select **"Install app"** or **"Add to Home Screen"**

### On Desktop (Chrome/Edge)

1. Navigate to the application URL
2. Click the install icon in the address bar
3. Confirm installation

---

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/homefinance)

1. Connect your GitHub repository
2. Configure environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL`
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_APP_URL`
   - (Optional) `ENABLE_BANKING_APP_ID`
   - (Optional) `ENABLE_BANKING_PRIVATE_KEY`
   - (Optional) `RESEND_API_KEY`
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

## Documentation

| Document | Description |
|----------|-------------|
| [RESEND_EMAIL_SETUP.md](docs/RESEND_EMAIL_SETUP.md) | How to enable email invitations |

---

## Roadmap

- [x] **Phase 1:** Magic Link authentication
- [x] **Phase 2:** Expenses CRUD with categories
- [x] **Phase 3:** Dashboard with charts
- [x] **Phase 4:** Monthly budget
- [x] **Phase 5:** Savings goals
- [x] **Phase 6:** PWA (manifest, icons, offline)
- [x] **Phase 7:** Open Banking (Enable Banking)
- [x] **Phase 8:** Shared households with balances
- [x] **Phase 9:** Invitation system (6-char code)
- [x] **Phase 10:** Settlements between members
- [x] **Phase 11:** Dark/Light mode
- [ ] **Phase 12:** Email invitations (requires custom domain)
- [ ] **Phase 13:** Push notifications
- [ ] **Phase 14:** Data export (CSV/PDF)
- [ ] **Phase 15:** Automatic recurring expenses
- [ ] **Phase 16:** Multi-language (i18n)

---

## Contributing

Contributions are welcome! Please:

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Made with love to better manage household finances</p>
</div>
