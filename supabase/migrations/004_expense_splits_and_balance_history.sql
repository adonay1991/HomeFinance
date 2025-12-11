-- ==========================================
-- MIGRACIÓN: Expense Splits y Balance History
-- ==========================================

-- ==========================================
-- TABLA: expense_splits
-- División de gastos entre miembros del hogar
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

COMMENT ON TABLE public.expense_splits IS 'División de gastos entre miembros del hogar';
COMMENT ON COLUMN public.expense_splits.percentage IS 'Porcentaje del total asignado a este usuario';
COMMENT ON COLUMN public.expense_splits.is_paid IS 'Si el usuario ya pagó su parte';

-- ==========================================
-- TABLA: bank_balance_history
-- Historial de saldos bancarios para gráficos
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

COMMENT ON TABLE public.bank_balance_history IS 'Historial de saldos para gráficos de evolución';
COMMENT ON COLUMN public.bank_balance_history.balance_type IS 'Tipo: closingAvailable, interimAvailable, etc.';

-- ==========================================
-- RLS POLICIES: expense_splits
-- ==========================================
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view splits in their household" ON public.expense_splits
  FOR SELECT USING (
    expense_id IN (
      SELECT id FROM public.expenses
      WHERE household_id = public.get_user_household_id()
    )
  );

CREATE POLICY "Users can create splits for household expenses" ON public.expense_splits
  FOR INSERT WITH CHECK (
    expense_id IN (
      SELECT id FROM public.expenses
      WHERE household_id = public.get_user_household_id()
    )
  );

CREATE POLICY "Users can update their own splits" ON public.expense_splits
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Expense payer can delete splits" ON public.expense_splits
  FOR DELETE USING (
    expense_id IN (
      SELECT id FROM public.expenses WHERE paid_by = auth.uid()
    )
  );

-- ==========================================
-- RLS POLICIES: bank_balance_history
-- ==========================================
ALTER TABLE public.bank_balance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own balance history" ON public.bank_balance_history
  FOR SELECT USING (
    account_id IN (
      SELECT ba.id FROM public.bank_accounts ba
      JOIN public.bank_connections bc ON ba.connection_id = bc.id
      WHERE bc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own balance history" ON public.bank_balance_history
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT ba.id FROM public.bank_accounts ba
      JOIN public.bank_connections bc ON ba.connection_id = bc.id
      WHERE bc.user_id = auth.uid()
    )
  );

-- ==========================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ==========================================

-- Para queries de splits pendientes
CREATE INDEX IF NOT EXISTS idx_expense_splits_pending
  ON public.expense_splits(user_id, is_paid)
  WHERE is_paid = false;

-- Para evolución del saldo por cuenta
CREATE INDEX IF NOT EXISTS idx_bank_balance_history_account_date
  ON public.bank_balance_history(account_id, reference_date DESC);
