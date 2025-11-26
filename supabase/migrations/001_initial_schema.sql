-- ==========================================
-- HomeFinance: Schema Inicial
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- Tabla users (sincronizada con auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  household_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabla expenses (gastos compartidos)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('comida', 'facturas', 'transporte', 'ocio', 'hogar', 'salud', 'otros')),
  tags TEXT[],
  date DATE NOT NULL,
  paid_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabla savings_goals (objetivos de ahorro)
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  target_amount NUMERIC(10, 2) NOT NULL,
  current_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  deadline DATE,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabla budgets (presupuestos mensuales)
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  category TEXT NOT NULL CHECK (category IN ('comida', 'facturas', 'transporte', 'ocio', 'hogar', 'salud', 'otros')),
  monthly_limit NUMERIC(10, 2) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (household_id, category, year, month)
);

-- ==========================================
-- ÍNDICES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_expenses_household_date ON public.expenses(household_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_savings_goals_household ON public.savings_goals(household_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- Simplificado: usuarios autenticados tienen acceso completo
-- (Solo hay 2 usuarios en el mismo hogar)
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Políticas para expenses (todos los autenticados pueden CRUD)
CREATE POLICY "Authenticated users full access to expenses" ON public.expenses
  FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para savings_goals
CREATE POLICY "Authenticated users full access to savings_goals" ON public.savings_goals
  FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para budgets
CREATE POLICY "Authenticated users full access to budgets" ON public.budgets
  FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- TRIGGER: Crear usuario en public.users al registrarse
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, household_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    '00000000-0000-0000-0000-000000000001'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si existe y recrear
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- DATOS INICIALES (opcional)
-- ==========================================
-- El household_id por defecto ya está en los DEFAULT de las tablas
