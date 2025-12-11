-- ==========================================
-- MIGRACIÓN: Sistema de Hogares Compartidos
-- ==========================================

-- ==========================================
-- TABLA: households
-- Hogares/grupos para compartir finanzas
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

COMMENT ON TABLE public.households IS 'Hogares/grupos para compartir finanzas';
COMMENT ON COLUMN public.households.invite_code IS 'Código de 6 caracteres para invitar manualmente';

-- ==========================================
-- TABLA: household_members
-- Miembros de cada hogar con sus roles
-- ==========================================
CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id) -- Un usuario solo puede estar en un hogar
);

CREATE INDEX IF NOT EXISTS idx_household_members_household ON public.household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON public.household_members(user_id);

COMMENT ON TABLE public.household_members IS 'Relación entre usuarios y hogares con roles';
COMMENT ON COLUMN public.household_members.role IS 'owner: puede administrar; member: solo participa';

-- ==========================================
-- TABLA: household_invitations
-- Invitaciones pendientes para unirse a un hogar
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

-- Evitar invitaciones duplicadas pendientes al mismo email
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pending_unique
  ON public.household_invitations(household_id, email)
  WHERE status = 'pending';

COMMENT ON TABLE public.household_invitations IS 'Invitaciones para unirse a un hogar';
COMMENT ON COLUMN public.household_invitations.token IS 'Token único de 64 caracteres para el link de invitación';

-- ==========================================
-- TABLA: settlements
-- Registro de pagos/liquidaciones entre miembros
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

COMMENT ON TABLE public.settlements IS 'Registro de pagos entre miembros para saldar deudas';

-- ==========================================
-- FUNCIÓN HELPER: Obtener household_id del usuario actual
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_user_household_id()
RETURNS UUID AS $$
  SELECT household_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==========================================
-- RLS POLICIES: households
-- ==========================================
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own household" ON public.households
  FOR SELECT USING (id = public.get_user_household_id());

CREATE POLICY "Owner can update household" ON public.households
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create household" ON public.households
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND owner_id = auth.uid());

-- ==========================================
-- RLS POLICIES: household_members
-- ==========================================
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view household members" ON public.household_members
  FOR SELECT USING (household_id = public.get_user_household_id());

CREATE POLICY "Owner can insert members" ON public.household_members
  FOR INSERT WITH CHECK (
    household_id = public.get_user_household_id()
    OR EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owner can delete members" ON public.household_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND owner_id = auth.uid())
    AND user_id != auth.uid() -- No puede eliminarse a sí mismo si es owner
  );

-- ==========================================
-- RLS POLICIES: household_invitations
-- ==========================================
ALTER TABLE public.household_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view invitations" ON public.household_invitations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owner can create invitations" ON public.household_invitations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND owner_id = auth.uid())
    AND invited_by = auth.uid()
  );

CREATE POLICY "Owner can update invitations" ON public.household_invitations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND owner_id = auth.uid())
  );

-- Permitir que cualquiera valide tokens (para aceptar invitación)
CREATE POLICY "Anyone can read by token" ON public.household_invitations
  FOR SELECT USING (true);

-- ==========================================
-- RLS POLICIES: settlements
-- ==========================================
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view household settlements" ON public.settlements
  FOR SELECT USING (household_id = public.get_user_household_id());

CREATE POLICY "Users can create settlements" ON public.settlements
  FOR INSERT WITH CHECK (
    household_id = public.get_user_household_id()
    AND from_user_id = auth.uid()
  );

-- ==========================================
-- ACTUALIZAR RLS DE TABLAS EXISTENTES
-- ==========================================

-- Expenses
DROP POLICY IF EXISTS "Authenticated users full access to expenses" ON public.expenses;
CREATE POLICY "Users can manage household expenses" ON public.expenses
  FOR ALL USING (household_id = public.get_user_household_id());

-- Budgets
DROP POLICY IF EXISTS "Authenticated users full access to budgets" ON public.budgets;
CREATE POLICY "Users can manage household budgets" ON public.budgets
  FOR ALL USING (household_id = public.get_user_household_id());

-- Savings Goals
DROP POLICY IF EXISTS "Authenticated users full access to savings_goals" ON public.savings_goals;
CREATE POLICY "Users can manage household savings_goals" ON public.savings_goals
  FOR ALL USING (household_id = public.get_user_household_id());

-- Recurring Expenses (solo si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_expenses') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users full access to recurring_expenses" ON public.recurring_expenses';
    EXECUTE 'CREATE POLICY "Users can manage household recurring_expenses" ON public.recurring_expenses FOR ALL USING (household_id = public.get_user_household_id())';
  END IF;
END $$;

-- ==========================================
-- ACTUALIZAR TRIGGER: handle_new_user
-- Crear household automático para nuevos usuarios
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

-- El trigger ya existe, se actualiza la función

-- ==========================================
-- MIGRACIÓN DE DATOS EXISTENTES
-- Crear household para usuarios existentes
-- ==========================================
DO $$
DECLARE
  first_user_id UUID;
  default_hh_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Obtener el primer usuario (será el owner)
  SELECT id INTO first_user_id FROM public.users ORDER BY created_at LIMIT 1;

  IF first_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.households WHERE id = default_hh_id) THEN
    -- Crear el household con el ID default existente
    INSERT INTO public.households (id, name, owner_id)
    VALUES (default_hh_id, 'Hogar Principal', first_user_id);

    -- Agregar todos los usuarios existentes como miembros
    INSERT INTO public.household_members (household_id, user_id, role)
    SELECT
      default_hh_id,
      u.id,
      CASE WHEN u.id = first_user_id THEN 'owner' ELSE 'member' END
    FROM public.users u
    WHERE u.household_id = default_hh_id
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- ==========================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ==========================================

-- Queries de balances frecuentes
CREATE INDEX IF NOT EXISTS idx_expenses_household_paid_by
  ON public.expenses(household_id, paid_by);

-- Invitaciones pendientes (sin NOW() que no es IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_invitations_pending
  ON public.household_invitations(email, status, expires_at)
  WHERE status = 'pending';
