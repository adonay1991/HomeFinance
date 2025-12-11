-- ==========================================
-- SCRIPT COMBINADO: Ejecutar todas las migraciones pendientes
-- Copia este contenido completo y pégalo en el SQL Editor de Supabase
-- ==========================================

-- ==========================================
-- FUNCIÓN HELPER (debe existir primero)
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_user_household_id()
RETURNS UUID AS $$
  SELECT household_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==========================================
-- TABLA: households
-- ==========================================
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Mi Hogar',
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 6)),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_households_owner ON public.households(owner_id);
CREATE INDEX IF NOT EXISTS idx_households_invite_code ON public.households(invite_code);

-- ==========================================
-- TABLA: household_members
-- ==========================================
CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_household_members_household ON public.household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON public.household_members(user_id);

-- ==========================================
-- TABLA: household_invitations
-- ==========================================
CREATE TABLE IF NOT EXISTS public.household_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.household_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.household_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.household_invitations(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pending_unique
  ON public.household_invitations(household_id, email)
  WHERE status = 'pending';

-- ==========================================
-- TABLA: settlements
-- ==========================================
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  note TEXT,
  settled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CHECK (from_user_id != to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_settlements_household ON public.settlements(household_id);
CREATE INDEX IF NOT EXISTS idx_settlements_from_user ON public.settlements(from_user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_to_user ON public.settlements(to_user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_date ON public.settlements(settled_at);

-- ==========================================
-- TABLA: expense_splits
-- ==========================================
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  percentage NUMERIC(5, 2),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(expense_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user ON public.expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_is_paid ON public.expense_splits(is_paid);

CREATE INDEX IF NOT EXISTS idx_expense_splits_pending
  ON public.expense_splits(user_id, is_paid)
  WHERE is_paid = false;

-- ==========================================
-- TABLA: bank_balance_history
-- ==========================================
CREATE TABLE IF NOT EXISTS public.bank_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  balance NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  balance_type TEXT,
  reference_date DATE NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bank_balance_history_account ON public.bank_balance_history(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_balance_history_date ON public.bank_balance_history(reference_date);
CREATE INDEX IF NOT EXISTS idx_bank_balance_history_account_date
  ON public.bank_balance_history(account_id, reference_date DESC);

-- ==========================================
-- RLS: Habilitar en todas las tablas
-- ==========================================
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_balance_history ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES: households
-- ==========================================
DROP POLICY IF EXISTS "Users can view own household" ON public.households;
CREATE POLICY "Users can view own household" ON public.households
  FOR SELECT USING (id = public.get_user_household_id());

DROP POLICY IF EXISTS "Users can view household by invite code" ON public.households;
CREATE POLICY "Users can view household by invite code" ON public.households
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owner can update household" ON public.households;
CREATE POLICY "Owner can update household" ON public.households
  FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create household" ON public.households;
CREATE POLICY "Authenticated users can create household" ON public.households
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND owner_id = auth.uid());

-- ==========================================
-- RLS POLICIES: household_members
-- ==========================================
DROP POLICY IF EXISTS "Users can view household members" ON public.household_members;
CREATE POLICY "Users can view household members" ON public.household_members
  FOR SELECT USING (household_id = public.get_user_household_id());

DROP POLICY IF EXISTS "Owner can insert members" ON public.household_members;
CREATE POLICY "Owner can insert members" ON public.household_members
  FOR INSERT WITH CHECK (
    household_id = public.get_user_household_id()
    OR EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner can delete members" ON public.household_members;
CREATE POLICY "Owner can delete members" ON public.household_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND owner_id = auth.uid())
    AND user_id != auth.uid()
  );

-- ==========================================
-- RLS POLICIES: household_invitations
-- ==========================================
DROP POLICY IF EXISTS "Owner can view invitations" ON public.household_invitations;
CREATE POLICY "Owner can view invitations" ON public.household_invitations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner can create invitations" ON public.household_invitations;
CREATE POLICY "Owner can create invitations" ON public.household_invitations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND owner_id = auth.uid())
    AND invited_by = auth.uid()
  );

DROP POLICY IF EXISTS "Owner can update invitations" ON public.household_invitations;
CREATE POLICY "Owner can update invitations" ON public.household_invitations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can read by token" ON public.household_invitations;
CREATE POLICY "Anyone can read by token" ON public.household_invitations
  FOR SELECT USING (true);

-- ==========================================
-- RLS POLICIES: settlements
-- ==========================================
DROP POLICY IF EXISTS "Users can view household settlements" ON public.settlements;
CREATE POLICY "Users can view household settlements" ON public.settlements
  FOR SELECT USING (household_id = public.get_user_household_id());

DROP POLICY IF EXISTS "Users can create settlements" ON public.settlements;
CREATE POLICY "Users can create settlements" ON public.settlements
  FOR INSERT WITH CHECK (
    household_id = public.get_user_household_id()
    AND from_user_id = auth.uid()
  );

-- ==========================================
-- RLS POLICIES: expense_splits
-- ==========================================
DROP POLICY IF EXISTS "Users can view splits in their household" ON public.expense_splits;
CREATE POLICY "Users can view splits in their household" ON public.expense_splits
  FOR SELECT USING (
    expense_id IN (
      SELECT id FROM public.expenses
      WHERE household_id = public.get_user_household_id()
    )
  );

DROP POLICY IF EXISTS "Users can create splits for household expenses" ON public.expense_splits;
CREATE POLICY "Users can create splits for household expenses" ON public.expense_splits
  FOR INSERT WITH CHECK (
    expense_id IN (
      SELECT id FROM public.expenses
      WHERE household_id = public.get_user_household_id()
    )
  );

DROP POLICY IF EXISTS "Users can update their own splits" ON public.expense_splits;
CREATE POLICY "Users can update their own splits" ON public.expense_splits
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Expense payer can delete splits" ON public.expense_splits;
CREATE POLICY "Expense payer can delete splits" ON public.expense_splits
  FOR DELETE USING (
    expense_id IN (
      SELECT id FROM public.expenses WHERE paid_by = auth.uid()
    )
  );

-- ==========================================
-- RLS POLICIES: bank_balance_history
-- ==========================================
DROP POLICY IF EXISTS "Users can view their own balance history" ON public.bank_balance_history;
CREATE POLICY "Users can view their own balance history" ON public.bank_balance_history
  FOR SELECT USING (
    account_id IN (
      SELECT ba.id FROM public.bank_accounts ba
      JOIN public.bank_connections bc ON ba.connection_id = bc.id
      WHERE bc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own balance history" ON public.bank_balance_history;
CREATE POLICY "Users can insert their own balance history" ON public.bank_balance_history
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT ba.id FROM public.bank_accounts ba
      JOIN public.bank_connections bc ON ba.connection_id = bc.id
      WHERE bc.user_id = auth.uid()
    )
  );

-- ==========================================
-- ACTUALIZAR TRIGGER: handle_new_user
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- Crear un nuevo household para el usuario
  INSERT INTO public.households (name, owner_id)
  VALUES ('Mi Hogar', NEW.id)
  RETURNING id INTO new_household_id;

  -- Insertar usuario en public.users con el nuevo household
  INSERT INTO public.users (id, email, name, household_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    new_household_id
  );

  -- Agregar al usuario como owner del household
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (new_household_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- MIGRACIÓN DE DATOS: Crear household para usuarios existentes
-- ==========================================
DO $$
DECLARE
  user_record RECORD;
  new_hh_id UUID;
BEGIN
  -- Para cada usuario que no tenga household o no esté en household_members
  FOR user_record IN
    SELECT u.id, u.email, u.name, u.household_id
    FROM public.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.household_members hm WHERE hm.user_id = u.id
    )
  LOOP
    -- Si no tiene household_id, crear uno nuevo
    IF user_record.household_id IS NULL THEN
      INSERT INTO public.households (name, owner_id)
      VALUES ('Mi Hogar', user_record.id)
      RETURNING id INTO new_hh_id;

      -- Actualizar el usuario con el nuevo household_id
      UPDATE public.users SET household_id = new_hh_id WHERE id = user_record.id;
    ELSE
      new_hh_id := user_record.household_id;

      -- Crear el household si no existe
      INSERT INTO public.households (id, name, owner_id)
      VALUES (new_hh_id, 'Mi Hogar', user_record.id)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Agregar al usuario como miembro del household
    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (new_hh_id, user_record.id, 'owner')
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;

-- ==========================================
-- ÍNDICES ADICIONALES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_expenses_household_paid_by
  ON public.expenses(household_id, paid_by);

-- Índice para invitaciones pendientes (sin NOW() que no es IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_invitations_pending
  ON public.household_invitations(email, status, expires_at)
  WHERE status = 'pending';

-- ==========================================
-- ACTUALIZAR RLS DE TABLAS EXISTENTES
-- ==========================================

-- Expenses
DROP POLICY IF EXISTS "Authenticated users full access to expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can manage household expenses" ON public.expenses;
CREATE POLICY "Users can manage household expenses" ON public.expenses
  FOR ALL USING (household_id = public.get_user_household_id());

-- Budgets
DROP POLICY IF EXISTS "Authenticated users full access to budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can manage household budgets" ON public.budgets;
CREATE POLICY "Users can manage household budgets" ON public.budgets
  FOR ALL USING (household_id = public.get_user_household_id());

-- Savings Goals
DROP POLICY IF EXISTS "Authenticated users full access to savings_goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can manage household savings_goals" ON public.savings_goals;
CREATE POLICY "Users can manage household savings_goals" ON public.savings_goals
  FOR ALL USING (household_id = public.get_user_household_id());

-- Recurring Expenses (solo si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_expenses') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users full access to recurring_expenses" ON public.recurring_expenses';
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage household recurring_expenses" ON public.recurring_expenses';
    EXECUTE 'CREATE POLICY "Users can manage household recurring_expenses" ON public.recurring_expenses FOR ALL USING (household_id = public.get_user_household_id())';
  END IF;
END $$;

-- ==========================================
-- FIN DE LA MIGRACIÓN
-- ==========================================
SELECT 'Migración completada exitosamente' AS resultado;
