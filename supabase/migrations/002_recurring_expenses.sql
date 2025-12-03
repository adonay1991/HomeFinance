-- ==========================================
-- HomeFinance: Gastos Recurrentes
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- Tabla recurring_expenses (plantillas de gastos recurrentes)
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('comida', 'facturas', 'transporte', 'ocio', 'hogar', 'salud', 'otros')),
  tags TEXT[],

  -- Configuración de recurrencia
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31), -- Para mensual/anual
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- Para semanal (0=domingo)
  month_of_year INTEGER CHECK (month_of_year >= 1 AND month_of_year <= 12), -- Para anual

  -- Control de ejecución
  start_date DATE NOT NULL,
  end_date DATE, -- Opcional: fecha de finalización
  last_executed_date DATE, -- Última vez que se generó un gasto
  next_execution_date DATE NOT NULL, -- Próxima fecha de ejecución

  -- Metadata
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_household ON public.recurring_expenses(household_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_execution ON public.recurring_expenses(next_execution_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_active ON public.recurring_expenses(is_active);

-- RLS
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access to recurring_expenses" ON public.recurring_expenses
  FOR ALL USING (auth.role() = 'authenticated');

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_recurring_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_recurring_expenses_updated_at ON public.recurring_expenses;
CREATE TRIGGER trigger_update_recurring_expenses_updated_at
  BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_recurring_expenses_updated_at();
